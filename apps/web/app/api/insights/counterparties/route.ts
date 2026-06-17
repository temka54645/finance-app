import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@finmate/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { UNCATEGORIZED_CATEGORIES as UNCATEGORIZED } from "@/lib/categories";

// Харьцагч (counterparty) дээр суурилсан үзүүлэлтүүд.
// counterparty нь чөлөөт текст тул яг тэр стрингээр нь бүлэглэнэ
// (банк хооронд нэг харьцагч өөр өөр форматтай байж болзошгүй — мэдэгдэхүйц).
const TOP_N = 8;
// full=1 (задаргааны хуудас) — бүх харьцагчийг буцаах дээд хязгаар.
const FULL_N = 300;

interface GroupRow {
  counterparty: string;
  type: string;
  total: number;
  count: number;
  max: number;
  uncatCount: number;
}

interface LargestRow {
  counterparty: string | null;
  description: string;
  date: Date;
  amount: number;
  type: string;
}

function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

function yearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : null;
    const monthParam = searchParams.get("month");
    const month = monthParam ? Number(monthParam) : null;
    // full=1 — задаргааны хуудсанд top 8 биш бүх харьцагчийг буцаана.
    const limit = searchParams.get("full") === "1" ? FULL_N : TOP_N;

    // Хугацааны хязгаар (сонгосон бол) — бүх query-д нэмэх SQL fragment.
    let range: { gte: Date; lt: Date } | null = null;
    if (year && !isNaN(year) && month && !isNaN(month) && month >= 1 && month <= 12) {
      range = monthRange(year, month);
    } else if (year && !isNaN(year)) {
      range = yearRange(year);
    }
    const dateFilter = range
      ? Prisma.sql`AND t."date" >= ${range.gte} AND t."date" < ${range.lt}`
      : Prisma.empty;

    const [grouped, largest] = await Promise.all([
      // Харьцагч × төрөл бүрийн нийт дүн, тоо, нэг удаагийн дээд дүн
      prisma.$queryRaw<GroupRow[]>`
        SELECT t."counterparty" AS counterparty,
               t."type" AS type,
               SUM(t."amount")::float AS total,
               COUNT(*)::int AS count,
               MAX(t."amount")::float AS max,
               SUM(CASE WHEN t."category" IN (${Prisma.join(UNCATEGORIZED)}) THEN 1 ELSE 0 END)::int AS "uncatCount"
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
          AND t."counterparty" IS NOT NULL
          AND btrim(t."counterparty") <> ''
          ${dateFilter}
        GROUP BY t."counterparty", t."type"
      `,
      // Хамгийн өндөр дүнтэй ганц гүйлгээнүүд (картын жагсаалт — харьцагчгүй ч багтана)
      prisma.$queryRaw<LargestRow[]>`
        SELECT t."counterparty" AS counterparty,
               t."description" AS description,
               t."date" AS date,
               t."amount"::float AS amount,
               t."type" AS type
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
          ${dateFilter}
        ORDER BY t."amount" DESC
        LIMIT ${limit}
      `,
    ]);

    // 1: Топ харьцагчид — орлого / зарлага тус тусдаа, нийт дүнгээр
    const topIncome = grouped
      .filter(r => r.type === "income")
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(r => ({ counterparty: r.counterparty, total: r.total, count: r.count, uncatCount: r.uncatCount }));

    const topExpense = grouped
      .filter(r => r.type === "expense")
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(r => ({ counterparty: r.counterparty, total: r.total, count: r.count, uncatCount: r.uncatCount }));

    // 3: Хамгийн их давтамжтай харьцагч — орлого+зарлага нийлбэр тоогоор
    const freqMap = new Map<string, { count: number; total: number; uncatCount: number }>();
    // 4: Харьцагч тус бүрийн нэг удаагийн хамгийн өндөр гүйлгээ
    const maxMap = new Map<string, { max: number; count: number; uncatCount: number }>();
    for (const r of grouped) {
      const e = freqMap.get(r.counterparty) ?? { count: 0, total: 0, uncatCount: 0 };
      e.count += r.count;
      e.total += r.total;
      e.uncatCount += r.uncatCount;
      freqMap.set(r.counterparty, e);

      const m = maxMap.get(r.counterparty) ?? { max: 0, count: 0, uncatCount: 0 };
      m.max = Math.max(m.max, r.max);
      m.count += r.count;
      m.uncatCount += r.uncatCount;
      maxMap.set(r.counterparty, m);
    }
    const mostFrequent = Array.from(freqMap.entries())
      .map(([counterparty, v]) => ({ counterparty, count: v.count, total: v.total, uncatCount: v.uncatCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const largestParties = Array.from(maxMap.entries())
      .map(([counterparty, v]) => ({ counterparty, max: v.max, count: v.count, uncatCount: v.uncatCount }))
      .sort((a, b) => b.max - a.max)
      .slice(0, limit);

    return NextResponse.json({
      topIncome,
      topExpense,
      largest: largest.map(r => ({
        counterparty: r.counterparty,
        description: r.description,
        date: r.date,
        amount: r.amount,
        type: r.type,
      })),
      mostFrequent,
      largestParties,
      hasCounterparty: grouped.length > 0,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[insights/counterparties] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
