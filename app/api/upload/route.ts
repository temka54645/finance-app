import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";
import { parseWithBankDetection, type StatementMeta } from "@/lib/parsers/banks";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { aiExtractTransactions } from "@/lib/ai/extract";
import { assertWithinLimit, LimitExceededError } from "@/lib/usage";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const tStart = performance.now();
  let fileName = "?";
  try {
    const userId = await requireUserId();

    // Plan limit шалгалт — энэ сард багц-аас илүү statement orson эсэх
    await assertWithinLimit(userId, "upload", 1);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankNameInput = formData.get("bankName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Файл байхгүй байна" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    let parsed: ParsedTransaction[] = [];
    let detectedBank: string | null = null;
    let stmtMeta: StatementMeta | undefined = undefined;

    const tParseStart = performance.now();
    if (ext === "pdf") {
      parsed = await parsePDF(buffer);
    } else if (ext === "csv") {
      parsed = parseCSV(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      const result = parseWithBankDetection(buffer);
      parsed = result.transactions;
      detectedBank = result.detectedBank;
      stmtMeta = result.meta;
    } else {
      return NextResponse.json({ error: "Дэмжигдэхгүй файлын төрөл" }, { status: 400 });
    }

    if (parsed.length === 0 && (ext === "xlsx" || ext === "xls" || ext === "csv")) {
      const rawRows = extractRawRows(buffer);
      parsed = await aiExtractTransactions(rawRows);
    }
    const tParseEnd = performance.now();

    if (parsed.length === 0) {
      return NextResponse.json({
        error: "Гүйлгээ олдсонгүй. Файлын форматыг шалгана уу."
      }, { status: 422 });
    }

    // Хэрэглэгчийн төрөл — категорийн каталог personal/business-аас хамаарна.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    const userType = (user?.userType === "business" || user?.userType === "personal")
      ? user.userType
      : "personal";

    // ── Категоричлол ──
    // AI ангилал huulga oruulah үед БҮРЭН хасагдсан (хэрэгцээгүй гэж үзсэн).
    // Зөвхөн keyword дүрэм + regex fallback — хурдан, гадаад API-аас хамааралгүй.
    // Gap-detection-ийг энд хийхгүй: parallel upload-ийн үед зэрэг ажиллаж буй
    // request-үүд бие биеийнхээ commit-ийг хараагүй учир false-positive өгдөг.
    // Үүнийг тусдаа `/api/statements/gaps` endpoint-аар бүх upload дууссаны
    // дараа нэг л удаа гүйцэтгэнэ (client-ээс trigger хийнэ).
    const tCatStart = performance.now();
    const categorized = categorizeTransactions(
      parsed.map(t => ({ description: t.description, amount: t.amount })),
      userType
    );
    const tCatEnd = performance.now();

    const finalBankName = bankNameInput || detectedBank;

    // ── DB бичих: statement.create (хоосон) → transaction.createMany ──
    // Хуучин nested create нь Prisma client дотор N+1 INSERT хийдэг.
    // createMany нь нэг л INSERT мэдэгдэл болж dramatically хурдан.
    const tDbStart = performance.now();
    const statement = await prisma.statement.create({
      data: {
        userId,
        fileName,
        bankName: finalBankName || null,
        periodStart: stmtMeta?.periodStart ?? null,
        periodEnd: stmtMeta?.periodEnd ?? null,
        openingBalance: stmtMeta?.openingBalance ?? null,
        closingBalance: stmtMeta?.closingBalance ?? null,
      },
    });

    let incomeCount = 0;
    let expenseCount = 0;
    const txRows = parsed.map((t, i) => {
      const cat = categorized[i];
      const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
      if (type === "income") incomeCount++;
      else expenseCount++;
      const category = (cat && cat.type === type)
        ? cat.category
        : (type === "income" ? "Бусад орлого" : "Бусад зарлага");
      return {
        statementId: statement.id,
        date: t.date,
        description: t.description,
        counterparty: t.counterparty ?? null,
        amount: Math.abs(t.amount),
        type,
        category,
      };
    });

    await prisma.transaction.createMany({ data: txRows });
    const tDbEnd = performance.now();

    const tTotal = performance.now() - tStart;
    console.log(
      `[upload] ${fileName} total=${tTotal | 0}ms ` +
      `parse=${(tParseEnd - tParseStart) | 0}ms ` +
      `categorize=${(tCatEnd - tCatStart) | 0}ms ` +
      `db=${(tDbEnd - tDbStart) | 0}ms ` +
      `tx=${parsed.length}`
    );

    return NextResponse.json({
      statement,
      detectedBank,
      count: parsed.length,
      incomeCount,
      expenseCount,
      periodStart: stmtMeta?.periodStart ?? null,
      periodEnd: stmtMeta?.periodEnd ?? null,
      openingBalance: stmtMeta?.openingBalance ?? null,
      closingBalance: stmtMeta?.closingBalance ?? null,
      // Gap-warning per-upload биш — бүх upload дууссаны дараа client
      // `/api/statements/gaps`-аас бүхэлд нь шинэчилнэ.
      // Timing diagnostics — UI дээр харуулна. Production-д ч аюулгүй.
      timing: {
        total: Math.round(tTotal),
        parse: Math.round(tParseEnd - tParseStart),
        categorize: Math.round(tCatEnd - tCatStart),
        db: Math.round(tDbEnd - tDbStart),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof LimitExceededError) {
      return NextResponse.json({
        error: err.message,
        code: "LIMIT_EXCEEDED",
        action: err.action,
        currentPlan: err.currentPlan,
        limit: err.limit,
        used: err.used,
        upgradeUrl: "/account#billing",
      }, { status: 402 });
    }
    console.error(`[upload] ${fileName} failed after ${(performance.now() - tStart) | 0}ms:`, err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Серверийн алдаа"
    }, { status: 500 });
  }
}
