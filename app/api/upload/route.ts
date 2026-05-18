import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";
import { parseWithBankDetection } from "@/lib/parsers/banks";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { aiExtractTransactions } from "@/lib/ai/extract";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

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

    if (ext === "pdf") {
      parsed = await parsePDF(buffer);
    } else if (ext === "csv") {
      parsed = parseCSV(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      const result = parseWithBankDetection(buffer);
      parsed = result.transactions;
      detectedBank = result.detectedBank;
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

    // Хэрэглэгчийн төрлийг авч AI category list-д ашиглана
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    const userType = (user?.userType === "business" || user?.userType === "personal")
      ? user.userType
      : "personal";

    const categorized = await categorizeTransactions(
      parsed.map(t => ({ description: t.description, amount: t.amount })),
      userType
    );

    const finalBankName = bankNameInput || detectedBank;

    const statement = await prisma.statement.create({
      data: {
        userId,
        fileName,
        bankName: finalBankName || null,
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
              amount: Math.abs(t.amount),
              type,
              category,
            };
          }),
        },
      },
      include: { transactions: true },
    });

    return NextResponse.json({
      statement,
      detectedBank,
      count: statement.transactions.length,
      incomeCount: statement.transactions.filter(t => t.type === "income").length,
      expenseCount: statement.transactions.filter(t => t.type === "expense").length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[upload] error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Серверийн алдаа"
    }, { status: 500 });
  }
}
