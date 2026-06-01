import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { UNCATEGORIZED_CATEGORIES as UNCATEGORIZED } from "@/lib/categories";

function yearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt:  new Date(Date.UTC(year, month, 1)),
  };
}

interface MonthlyRow {
  month: number;
  type: string;
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const statementId = searchParams.get("statementId");
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : null;
    const monthParam = searchParams.get("month");
    const month = monthParam ? Number(monthParam) : null;

    const where: Record<string, unknown> = {
      statement: { userId },
    };
    if (statementId) where.statementId = statementId;
    if (year && !isNaN(year) && month && !isNaN(month) && month >= 1 && month <= 12) {
      where.date = monthRange(year, month);
    } else if (year && !isNaN(year)) {
      where.date = yearRange(year);
    }

    const [incomeAgg, expenseAgg, byCategory, statements, uncategorizedCount, availableYearsRaw, yearlyRaw] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, type: "income" }, _sum: { amount: true }, _count: true }),
      prisma.transaction.aggregate({ where: { ...where, type: "expense" }, _sum: { amount: true }, _count: true }),
      prisma.transaction.groupBy({ by: ["category", "type"], where, _sum: { amount: true }, _count: true }),
      prisma.statement.findMany({
        where: { userId },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, fileName: true, bankName: true, uploadedAt: true },
      }),
      prisma.transaction.count({ where: { ...where, category: { in: UNCATEGORIZED } } }),
      prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM t."date")::int AS year
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
        ORDER BY year DESC
      `,
      prisma.$queryRaw<{ year: number; type: string; total: number }[]>`
        SELECT
          EXTRACT(YEAR FROM t."date")::int AS year,
          t."type" AS type,
          SUM(t."amount")::float AS total
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
        GROUP BY 1, 2
        ORDER BY 1
      `,
    ]);

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;

    const findCategory = (name: string, type: "income" | "expense") => {
      const item = byCategory.find(c => c.category === name && c.type === type);
      return { amount: item?._sum.amount ?? 0, count: item?._count ?? 0 };
    };

    const highlights = {
      bankFees:       findCategory("Банкны шимтгэл", "expense"),
      salaryPaid:     findCategory("Цалин зарлага", "expense"),
      taxes:          findCategory("Татвар", "expense"),
      salaryReceived: findCategory("Цалин", "income"),
    };

    const availableYears = availableYearsRaw.map(r => r.year);

    // Жил тус бүрийн нийлбэр (bar chart-д)
    const yearlyMap = new Map<number, { income: number; expense: number }>();
    for (const row of yearlyRaw) {
      if (!yearlyMap.has(row.year)) yearlyMap.set(row.year, { income: 0, expense: 0 });
      const entry = yearlyMap.get(row.year)!;
      if (row.type === "income") entry.income = row.total;
      else if (row.type === "expense") entry.expense = row.total;
    }
    const yearly = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([yr, v]) => ({ year: yr, income: v.income, expense: v.expense }));

    // Сарын aggregation (зөвхөн жил сонгосон, сар сонгоогүй үед)
    let monthly: { month: number; income: number; expense: number }[] = [];
    if (year && !isNaN(year) && !month) {
      const baseFilter = statementId ? `AND t."statementId" = $3` : ``;
      const params: unknown[] = [userId, year];
      if (statementId) params.push(statementId);

      const rows = await prisma.$queryRawUnsafe<MonthlyRow[]>(
        `SELECT
           EXTRACT(MONTH FROM t."date")::int AS month,
           t."type" AS type,
           SUM(t."amount")::float AS total
         FROM "Transaction" t
         JOIN "Statement" s ON s."id" = t."statementId"
         WHERE s."userId" = $1
           AND EXTRACT(YEAR FROM t."date")::int = $2
           ${baseFilter}
         GROUP BY 1, 2`,
        ...params
      );

      monthly = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const income = rows.find(r => r.month === m && r.type === "income")?.total ?? 0;
        const expense = rows.find(r => r.month === m && r.type === "expense")?.total ?? 0;
        return { month: m, income, expense };
      });
    }

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
      highlights,
      uncategorizedCount,
      byCategory,
      statements,
      availableYears,
      yearly,
      year,
      monthly,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[reports] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
