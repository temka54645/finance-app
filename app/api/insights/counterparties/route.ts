import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// Бүх хугацааны харьцагч (counterparty) дээр суурилсан үзүүлэлтүүд.
// counterparty нь чөлөөт текст тул v1 дээр яг тэр стрингээр нь бүлэглэнэ
// (банк хооронд нэг харьцагч өөр өөр форматтай байж болзошгүй — мэдэгдэхүйц).
const TOP_N = 8;
// Бүрэн жагсаалт (задаргааны хуудас) дээр харуулах дээд хязгаар.
const FULL_N = 500;

interface GroupRow {
  counterparty: string;
  type: string;
  total: number;
  count: number;
}

interface LargestRow {
  counterparty: string | null;
  description: string;
  date: Date;
  amount: number;
  type: string;
}

interface RecurringRow {
  counterparty: string;
  type: string;
  months: number;
  count: number;
  avg_amount: number;
  sd: number;
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
    // full=1 — task: задаргаа харах хуудсанд бүтэн жагсаалтыг буцаана.
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

    const [grouped, largest, recurringRaw] = await Promise.all([
      // 1+3: харьцагч × төрөл бүрийн нийт дүн ба тоо
      prisma.$queryRaw<GroupRow[]>`
        SELECT t."counterparty" AS counterparty,
               t."type" AS type,
               SUM(t."amount")::float AS total,
               COUNT(*)::int AS count
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
          AND t."counterparty" IS NOT NULL
          AND btrim(t."counterparty") <> ''
          ${dateFilter}
        GROUP BY t."counterparty", t."type"
      `,
      // 2: хамгийн өндөр дүнтэй ганц гүйлгээнүүд
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
      // 4: тогтмол/давтагдсан төлбөр — ≥3 өөр сард гарсан харьцагч
      prisma.$queryRaw<RecurringRow[]>`
        SELECT t."counterparty" AS counterparty,
               t."type" AS type,
               COUNT(DISTINCT date_trunc('month', t."date"))::int AS months,
               COUNT(*)::int AS count,
               AVG(t."amount")::float AS avg_amount,
               COALESCE(STDDEV_POP(t."amount"), 0)::float AS sd
        FROM "Transaction" t
        JOIN "Statement" s ON s."id" = t."statementId"
        WHERE s."userId" = ${userId}
          AND t."counterparty" IS NOT NULL
          AND btrim(t."counterparty") <> ''
          ${dateFilter}
        GROUP BY t."counterparty", t."type"
        HAVING COUNT(DISTINCT date_trunc('month', t."date")) >= 3
      `,
    ]);

    // 1: Топ харьцагчид — орлого / зарлага тус тусдаа, нийт дүнгээр
    const topIncome = grouped
      .filter(r => r.type === "income")
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(r => ({ counterparty: r.counterparty, total: r.total, count: r.count }));

    const topExpense = grouped
      .filter(r => r.type === "expense")
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(r => ({ counterparty: r.counterparty, total: r.total, count: r.count }));

    // 3: Хамгийн их давтамжтай харьцагч — орлого+зарлага нийлбэр тоогоор
    const freqMap = new Map<string, { count: number; total: number }>();
    for (const r of grouped) {
      const e = freqMap.get(r.counterparty) ?? { count: 0, total: 0 };
      e.count += r.count;
      e.total += r.total;
      freqMap.set(r.counterparty, e);
    }
    const mostFrequent = Array.from(freqMap.entries())
      .map(([counterparty, v]) => ({ counterparty, count: v.count, total: v.total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // 4: Тогтмол төлбөр — дүн нь ойролцоо (хэлбэлзлийн коэффициент бага)
    const recurring = recurringRaw
      .map(r => {
        const mean = Math.abs(r.avg_amount);
        const cv = mean > 0 ? r.sd / mean : 1; // coefficient of variation
        return {
          counterparty: r.counterparty,
          type: r.type,
          months: r.months,
          count: r.count,
          avgAmount: Math.abs(r.avg_amount),
          cv,
        };
      })
      .filter(r => r.cv <= 0.35) // дүн харьцангуй тогтмол
      .sort((a, b) => (b.months - a.months) || (b.count - a.count))
      .slice(0, limit)
      .map(({ cv: _cv, ...rest }) => rest);

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
      recurring,
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
