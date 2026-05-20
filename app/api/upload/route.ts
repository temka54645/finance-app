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
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    let parsed: ParsedTransaction[] = [];
    let detectedBank: string | null = null;
    let stmtMeta: StatementMeta | undefined = undefined;

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
    const allowAi = isLimitBypassed() || getTier(user?.plan).limits.aiCategorization;

    const categorized = await categorizeTransactions(
      parsed.map(t => ({ description: t.description, amount: t.amount })),
      userType,
      { useAi: allowAi }
    );

    const finalBankName = bankNameInput || detectedBank;

    const statement = await prisma.statement.create({
      data: {
        userId,
        fileName,
        bankName: finalBankName || null,
        periodStart: stmtMeta?.periodStart ?? null,
        periodEnd: stmtMeta?.periodEnd ?? null,
        openingBalance: stmtMeta?.openingBalance ?? null,
        closingBalance: stmtMeta?.closingBalance ?? null,
        transactions: {
          create: parsed.map((t, i) => {
            const cat = categorized[i];
            const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
            const category = (cat && cat.type === type)
              ? cat.category
              : (type === "income" ? "Бусад орлого" : "Бусад зарлага");
            return {
              date: t.date,
              description: t.description,
              counterparty: t.counterparty ?? null,
              amount: Math.abs(t.amount),
              type,
              category,
            };
          }),
        },
      },
      include: { transactions: true },
    });

    // ─── Gap detection ─────────────────────────────────────────────
    // Энэ хуулгын periodStart-аас өмнө дууссан хамгийн ойрхон хуулгыг
    // олж, түүний closingBalance vs шинэ openingBalance-ийг харьцуулна.
    let gapWarning: {
      message: string;
      diff: number;
      priorFile: string;
      priorPeriodEnd: string | null;
      priorClosing: number;
      thisOpening: number;
    } | null = null;

    if (
      stmtMeta?.periodStart &&
      stmtMeta?.openingBalance != null &&
      Number.isFinite(stmtMeta.openingBalance)
    ) {
      const prior = await prisma.statement.findFirst({
        where: {
          userId,
          id: { not: statement.id },
          periodEnd: { lt: stmtMeta.periodStart, not: null },
          closingBalance: { not: null },
        },
        orderBy: { periodEnd: "desc" },
        select: {
          fileName: true,
          periodEnd: true,
          closingBalance: true,
        },
      });

      if (
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
    }

    return NextResponse.json({
      statement,
      detectedBank,
      count: statement.transactions.length,
      incomeCount: statement.transactions.filter(t => t.type === "income").length,
      expenseCount: statement.transactions.filter(t => t.type === "expense").length,
      periodStart: stmtMeta?.periodStart ?? null,
      periodEnd: stmtMeta?.periodEnd ?? null,
      openingBalance: stmtMeta?.openingBalance ?? null,
      closingBalance: stmtMeta?.closingBalance ?? null,
      gapWarning,
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
    console.error("[upload] error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Серверийн алдаа"
    }, { status: 500 });
  }
}
