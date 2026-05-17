import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";
import { parseWithBankDetection } from "@/lib/parsers/banks";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { aiExtractTransactions } from "@/lib/ai/extract";

export async function POST(req: NextRequest) {
  try {
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
      if (detectedBank) {
        console.log(`[upload] ${fileName}: detected ${detectedBank}, found ${parsed.length} transactions`);
      } else {
        console.log(`[upload] ${fileName}: generic parser found ${parsed.length} transactions`);
      }
    } else {
      return NextResponse.json({ error: "Дэмжигдэхгүй файлын төрөл" }, { status: 400 });
    }

    // AI fallback зөвхөн Excel/CSV-д
    if (parsed.length === 0 && (ext === "xlsx" || ext === "xls" || ext === "csv")) {
      console.log(`[upload] ${fileName}: falling back to AI parser`);
      const rawRows = extractRawRows(buffer);
      parsed = await aiExtractTransactions(rawRows);
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        error: "Гүйлгээ олдсонгүй. Файлын форматыг шалгана уу."
      }, { status: 422 });
    }

    const categorized = await categorizeTransactions(
      parsed.map(t => ({ description: t.description, amount: t.amount }))
    );

    const finalBankName = bankNameInput || detectedBank;

    const statement = await prisma.statement.create({
      data: {
        fileName,
        bankName: finalBankName || null,
        transactions: {
          create: parsed.map((t, i) => {
            // Parser-ийн дохио = эцсийн шийдвэр (банкны хуулга дотрох
            // Орлого/Зарлага багана хамгийн найдвартай эх сурвалж).
            // AI зөвхөн категори нэр санал болгох (харин income/expense биш).
            const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
            const aiCat = categorized[i];

            // AI category-ийг зөвхөн төрөл нь parser-тэй таарсан тохиолдолд авна
            const category = (aiCat && aiCat.type === type)
              ? aiCat.category
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
    console.error("[upload] error:", err);
    const message = err instanceof Error ? err.message : "Серверийн алдаа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
