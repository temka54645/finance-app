import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseExcel, parseCSV } from "@/lib/parsers/excel";
import { categorizeTransactions } from "@/lib/ai/categorize";

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

    let parsed: Awaited<ReturnType<typeof parsePDF>>;

    if (ext === "pdf") {
      parsed = await parsePDF(buffer);
    } else if (ext === "csv") {
      parsed = parseCSV(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      parsed = parseExcel(buffer);
    } else {
      return NextResponse.json({ error: "Дэмжигдэхгүй файлын төрөл" }, { status: 400 });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "Гүйлгээ олдсонгүй" }, { status: 422 });
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
            // parser-ийн amount тэмдэг: эерэг=орлого, сөрөг=зарлага
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

    return NextResponse.json({ statement });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
