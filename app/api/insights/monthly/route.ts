import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

interface Row {
  year: number;
  month: number;
  type: string;
  total: number;
}

export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT EXTRACT(YEAR FROM t."date")::int AS year,
             EXTRACT(MONTH FROM t."date")::int AS month,
             t."type" AS type,
             SUM(t."amount")::float AS total
      FROM "Transaction" t
      JOIN "Statement" s ON s."id" = t."statementId"
      WHERE s."userId" = ${userId}
      GROUP BY 1, 2, 3
      ORDER BY 1, 2
    `;

    // (year, month) бүрийн орлого/зарлагыг нэгтгэнэ.
    const map = new Map<string, { year: number; month: number; income: number; expense: number }>();
    const yearSet = new Set<number>();
    for (const r of rows) {
      yearSet.add(r.year);
      const key = `${r.year}-${r.month}`;
      const e = map.get(key) ?? { year: r.year, month: r.month, income: 0, expense: 0 };
      if (r.type === "income") e.income += r.total;
      else if (r.type === "expense") e.expense += r.total;
      map.set(key, e);
    }

    const series = Array.from(map.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
    const years = Array.from(yearSet).sort((a, b) => b - a); // сүүлийн жил эхэнд

    return NextResponse.json({ series, years });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[insights/monthly] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
