import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";
import { parseWithBankDetection, type StatementMeta } from "@/lib/parsers/banks";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { aiExtractTransactions } from "@/lib/ai/extract";
import { assertWithinLimit, LimitExceededError, isLimitBypassed } from "@/lib/usage";
import { getTier } from "@/lib/plans";

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

    // Хэрэглэгчийн төрөл + plan — AI categorization plan-аар хязгаарлагдсан эсэхийг шалгана
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true, plan: true },
    });
    const userType = (user?.userType === "business" || user?.userType === "personal")
      ? user.userType
      : "personal";

    // free tier бол AI ашиглахгүй, зөвхөн regex/keyword fallback.
    // Beta/тестийн үед bypass хийнэ — бүгдэд AI нээлттэй.
    // LOCAL_DISABLE_AI=1 үед локал тестэд AI бүхэлдээ хаалттай — хурдан regex fallback.
    const allowAi = process.env.LOCAL_DISABLE_AI === "1"
      ? false
      : (isLimitBypassed() || getTier(user?.plan).limits.aiCategorization);

    // ── AI categorization + gap-detection-ийг ЗЭРЭГ явуулна ──
    // Categorize нь parsed transactions-аас, gap нь stmtMeta-аас хамаарна.
    // Бие биеэс хамааралгүй тул хоёуланг нь Promise.all-р параллел гүйцэтгэнэ.
    const tAiStart = performance.now();
    const priorStmtPromise = (
      stmtMeta?.periodStart &&
      stmtMeta?.openingBalance != null &&
      Number.isFinite(stmtMeta.openingBalance)
    )
      ? prisma.statement.findFirst({
          where: {
            userId,
            periodEnd: { lt: stmtMeta.periodStart, not: null },
            closingBalance: { not: null },
          },
          orderBy: { periodEnd: "desc" },
          select: { fileName: true, periodEnd: true, closingBalance: true },
        })
      : Promise.resolve(null);

    const [categorized, prior] = await Promise.all([
      categorizeTransactions(
        parsed.map(t => ({ description: t.description, amount: t.amount })),
        userType,
        { useAi: allowAi }
      ),
      priorStmtPromise,
    ]);
    const tAiEnd = performance.now();

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

    // ─── Gap detection (зөвхөн харьцуулалт; query аль хэдийн дээр) ──
    let gapWarning: {
      message: string;
      diff: number;
      priorFile: string;
      priorPeriodEnd: string | null;
      priorClosing: number;
      thisOpening: number;
    } | null = null;

    if (
      stmtMeta?.openingBalance != null &&
      Number.isFinite(stmtMeta.openingBalance) &&
      prior?.closingBalance != null &&
      Number.isFinite(prior.closingBalance)
    ) {
      const diff = stmtMeta.openingBalance - prior.closingBalance;
      if (Math.abs(diff) > 1) {
        const fmt = (n: number) => n.toLocaleString("mn-MN", { maximumFractionDigits: 2 }) + "₮";
        gapWarning = {
          message: `Анхаарал: Энэ хуулгын эхний үлдэгдэл (${fmt(stmtMeta.openingBalance)}) нь өмнөх хуулгын эцсийн үлдэгдлээс (${fmt(prior.closingBalance)}) ${fmt(Math.abs(diff))}-ээр зөрж байна. Дунд нь оруулаагүй хуулга байж магадгүй.`,
          diff,
          priorFile: prior.fileName,
          priorPeriodEnd: prior.periodEnd ? prior.periodEnd.toISOString() : null,
          priorClosing: prior.closingBalance,
          thisOpening: stmtMeta.openingBalance,
        };
      }
    }

    const tTotal = performance.now() - tStart;
    console.log(
      `[upload] ${fileName} total=${tTotal | 0}ms ` +
      `parse=${(tParseEnd - tParseStart) | 0}ms ` +
      `ai+priorQuery=${(tAiEnd - tAiStart) | 0}ms ` +
      `db=${(tDbEnd - tDbStart) | 0}ms ` +
      `tx=${parsed.length} allowAi=${allowAi}`
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
      gapWarning,
      // Timing diagnostics — UI дээр харуулна. Production-д ч аюулгүй
      // (зөвхөн ms тоо, sensitive мэдээлэлгүй).
      timing: {
        total: Math.round(tTotal),
        parse: Math.round(tParseEnd - tParseStart),
        aiAndPrior: Math.round(tAiEnd - tAiStart),
        db: Math.round(tDbEnd - tDbStart),
        allowAi,
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
