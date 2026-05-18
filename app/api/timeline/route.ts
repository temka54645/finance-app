import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

interface Row {
  year: number;
  month: number;
  type: string;
  total: number;
  tx_count: number;
}

interface MonthBucket {
  month: number;
  income: number;
  expense: number;
  txCount: number;
}

interface YearBucket {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  months: MonthBucket[];
}

export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        EXTRACT(YEAR FROM t."date")::int AS year,
        EXTRACT(MONTH FROM t."date")::int AS month,
        t."type" AS type,
        SUM(t."amount")::float AS total,
        COUNT(*)::int AS tx_count
      FROM "Transaction" t
      JOIN "Statement" s ON s."id" = t."statementId"
      WHERE s."userId" = ${userId}
      GROUP BY 1, 2, 3
      ORDER BY 1 DESC, 2
    `;

    // Жил тус бүрд 12 саруудыг pad хийнэ
    const yearsMap = new Map<number, YearBucket>();

    for (const r of rows) {
      if (!yearsMap.has(r.year)) {
        const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          income: 0,
          expense: 0,
          txCount: 0,
        }));
        yearsMap.set(r.year, {
          year: r.year,
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          txCount: 0,
          months,
        });
      }

      const yearBucket = yearsMap.get(r.year)!;
      const monthBucket = yearBucket.months[r.month - 1];

      if (r.type === "income") {
        monthBucket.income += r.total;
        yearBucket.totalIncome += r.total;
      } else if (r.type === "expense") {
        monthBucket.expense += r.total;
        yearBucket.totalExpense += r.total;
      }
      monthBucket.txCount += r.tx_count;
      yearBucket.txCount += r.tx_count;
    }

    const timeline = Array.from(yearsMap.values())
      .map(y => ({ ...y, balance: y.totalIncome - y.totalExpense }))
      .sort((a, b) => b.year - a.year);

    return NextResponse.json({ timeline });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[timeline] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
