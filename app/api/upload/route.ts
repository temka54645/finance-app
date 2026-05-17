import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseExcel, parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { aiExtractTransactions } from "@/lib/ai/extract";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankName = formData.get("bankName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Файл байхгүй байна" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    let parsed: ParsedTransaction[] = [];

    if (ext === "pdf") {
      parsed = await parsePDF(buffer);
    } else if (ext === "csv") {
      parsed = parseCSV(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      parsed = parseExcel(buffer);
    } else {
      return NextResponse.json({ error: "Дэмжигдэхгүй файлын төрөл" }, { status: 400 });
    }

    console.log(`[upload] ${fileName}: heuristic parser found ${parsed.length} transactions`);

    // Heuristic parser амжилтгүй бол AI ашиглах (зөвхөн Excel/CSV-д)
    if (parsed.length === 0 && (ext === "xlsx" || ext === "xls" || ext === "csv")) {
      console.log(`[upload] ${fileName}: falling back to AI parser`);
      const rawRows = extractRawRows(buffer);
      parsed = await aiExtractTransactions(rawRows);
      console.log(`[upload] ${fileName}: AI parser found ${parsed.length} transactions`);
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        error: "Гүйлгээ олдсонгүй. Файлын форматыг шалгана уу."
      }, { status: 422 });
    }

    const categorized = await categorizeTransactions(
      parsed.map(t => ({ description: t.description, amount: t.amount }))
    );

    const statement = await prisma.statement.create({
      data: {
        fileName,
        bankName: bankName || null,
        transactions: {
          create: parsed.map((t, i) => {
            const cat = categorized[i];
            const fallbackType = t.amount >= 0 ? "income" : "expense";
            return {
              date: t.date,
              description: t.description,
              amount: Math.abs(t.amount),
              type: cat?.type ?? fallbackType,
              category: cat?.category ?? (fallbackType === "income" ? "Бусад орлого" : "Бусад зарлага"),
            };
          }),
        },
      },
      include: { transactions: true },
    });

    return NextResponse.json({
      statement,
      count: statement.transactions.length,
      incomeCount: statement.transactions.filter(t => t.type === "income").length,
      expenseCount: statement.transactions.filter(t => t.type === "expense").length,
    });
  } catch (err) {
    console.error("[upload] error:", err);
    const message = err instanceof Error ? err.message : "Серверийн алдаа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
