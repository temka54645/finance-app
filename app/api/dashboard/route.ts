import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// "Ангилаагүй" гэх мэт ангилагдаагүй гэж тооцох категориуд —
// /api/transactions?uncategorized=true болон reports-той ижил тодорхойлолт.
const UNCATEGORIZED = ["Бусад орлого", "Бусад зарлага", "Ангилаагүй"];

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null; // өмнөх суурь 0 бол хувь утгагүй
  return ((curr - prev) / prev) * 100;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const scope = { statement: { userId } };

    const [
      incomeAgg,
      expenseAgg,
      uncatAgg,
      monthsRow,
      flowByBank,
      closingByBank,
      periodRows,
    ] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...scope, type: "income" }, _sum: { amount: true }, _count: true }),
      prisma.transaction.aggregate({ where: { ...scope, type: "expense" }, _sum: { amount: true }, _count: true }),
      prisma.transaction.aggregate({ where: { ...scope, category: { in: UNCATEGORIZED } }, _sum: { amount: true }, _count: true }),
      // Гүйлгээтэй ялгаатай сарын тоо — дундаж сарын зарлага тооцоход
      prisma.$queryRaw<{ months: number }[]>`
        SELECT COUNT(*)::int AS months FROM (
          SELECT DISTINCT date_trunc('month', t."date")
          FROM "Transaction" t
          JOIN "Statement" s ON s."id" = t."statementId"
          WHERE s."userId" = ${userId}
        ) q
      `,
      // Данс (банк) тус бүрийн орлого/зарлага/тоо
      prisma.$queryRaw<{ bank: string; type: string; total: number; count: number }[]>`
        SELECT COALESCE(NULLIF(btrim(s."bankName"), ''), 'Тодорхойгүй данс') AS bank,
               t."type" AS type,
               SUM(t."amount")::float AS total,
               COUNT(*)::int AS count
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
        GROUP BY 1, 2
      `,
      // Данс тус бүрийн хамгийн сүүлийн эцсийн үлдэгдэл
      prisma.$queryRaw<{ bank: string; bal: number; pend: Date | null }[]>`
        SELECT DISTINCT ON (bank) bank, bal, pend FROM (
          SELECT COALESCE(NULLIF(btrim(s."bankName"), ''), 'Тодорхойгүй данс') AS bank,
                 s."closingBalance"::float AS bal,
                 s."periodEnd" AS pend,
                 s."uploadedAt" AS up
          FROM "Statement" s
          WHERE s."userId" = ${userId} AND s."closingBalance" IS NOT NULL
        ) x
        ORDER BY bank, pend DESC NULLS LAST, up DESC
      `,
      // Сар бүрийн орлого/зарлага (өмнөх үетэй харьцуулахад)
      prisma.$queryRaw<{ m: Date; type: string; total: number }[]>`
        SELECT date_trunc('month', t."date") AS m,
               t."type" AS type,
               SUM(t."amount")::float AS total
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
        GROUP BY 1, 2
        ORDER BY 1 DESC
      `,
    ]);

    const totalInflow = incomeAgg._sum.amount ?? 0;
    const totalOutflow = expenseAgg._sum.amount ?? 0;
    const netCashFlow = totalInflow - totalOutflow;

    const incomeCount = incomeAgg._count;
    const expenseCount = expenseAgg._count;
    const totalCount = incomeCount + expenseCount;
    const uncategorizedCount = uncatAgg._count;
    const uncategorizedAmount = uncatAgg._sum.amount ?? 0;
    const categorizedCount = Math.max(totalCount - uncategorizedCount, 0);
    const coveragePct = totalCount > 0 ? (categorizedCount / totalCount) * 100 : 100;

    // ── Дансны задаргаа + нийт бэлэн мөнгөний үлдэгдэл ──────────────
    const closingMap = new Map<string, { balance: number; periodEnd: Date | null }>();
    for (const r of closingByBank) {
      closingMap.set(r.bank, { balance: r.bal, periodEnd: r.pend });
    }
    const acctMap = new Map<string, { bank: string; income: number; expense: number; count: number; closingBalance: number | null; periodEnd: Date | null }>();
    for (const r of flowByBank) {
      const e = acctMap.get(r.bank) ?? {
        bank: r.bank, income: 0, expense: 0, count: 0,
        closingBalance: closingMap.get(r.bank)?.balance ?? null,
        periodEnd: closingMap.get(r.bank)?.periodEnd ?? null,
      };
      if (r.type === "income") e.income += r.total;
      else if (r.type === "expense") e.expense += r.total;
      e.count += r.count;
      acctMap.set(r.bank, e);
    }
    const perAccount = Array.from(acctMap.values())
      .map(a => ({ ...a, net: a.income - a.expense }))
      .sort((a, b) => b.count - a.count);

    const hasClosingBalance = closingByBank.length > 0;
    const cashBalance = hasClosingBalance
      ? closingByBank.reduce((s, r) => s + (r.bal ?? 0), 0)
      : null;

    // ── Бэлэн мөнгөний нөөц (runway) ───────────────────────────────
    const monthsWithData = Math.max(monthsRow[0]?.months ?? 0, 1);
    const avgMonthlyOutflow = totalOutflow / monthsWithData;
    const runwayMonths =
      cashBalance !== null && avgMonthlyOutflow > 0
        ? cashBalance / avgMonthlyOutflow
        : null;

    // ── Үе-үеийн харьцуулалт (сүүлийн 2 сар) ───────────────────────
    const monthAgg = new Map<string, { date: Date; income: number; expense: number }>();
    for (const r of periodRows) {
      const d = new Date(r.m);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const e = monthAgg.get(key) ?? { date: d, income: 0, expense: 0 };
      if (r.type === "income") e.income += r.total;
      else if (r.type === "expense") e.expense += r.total;
      monthAgg.set(key, e);
    }
    const sortedMonths = Array.from(monthAgg.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    const monthLabel = (d: Date) => `${d.getUTCFullYear()} оны ${d.getUTCMonth() + 1}-р сар`;
    let periodOverPeriod: {
      current: { label: string; inflow: number; outflow: number; net: number };
      previous: { label: string; inflow: number; outflow: number; net: number };
      inflowPct: number | null;
      outflowPct: number | null;
      netPct: number | null;
    } | null = null;
    if (sortedMonths.length >= 2) {
      const c = sortedMonths[0];
      const p = sortedMonths[1];
      periodOverPeriod = {
        current: { label: monthLabel(c.date), inflow: c.income, outflow: c.expense, net: c.income - c.expense },
        previous: { label: monthLabel(p.date), inflow: p.income, outflow: p.expense, net: p.income - p.expense },
        inflowPct: pctChange(c.income, p.income),
        outflowPct: pctChange(c.expense, p.expense),
        netPct: pctChange(c.income - c.expense, p.income - p.expense),
      };
    }

    return NextResponse.json({
      totalInflow,
      totalOutflow,
      netCashFlow,
      cashBalance,
      hasClosingBalance,
      avgMonthlyOutflow,
      monthsWithData,
      runwayMonths,
      coverage: {
        total: totalCount,
        categorized: categorizedCount,
        uncategorizedCount,
        uncategorizedAmount,
        pct: coveragePct,
      },
      perAccount,
      periodOverPeriod,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[dashboard] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
