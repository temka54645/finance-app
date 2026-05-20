import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

const UNCATEGORIZED = ["Бусад орлого", "Бусад зарлага", "Ангилаагүй"];

interface Row {
  year: number;
  month: number;
  bank_name: string | null;
  type: string;
  total: number;
  tx_count: number;
  uncategorized_count: number;
}

export interface BankBucket {
  bankName: string | null;   // null = тодорхойгүй банк
  income: number;
  expense: number;
  txCount: number;
}

export interface MonthBucket {
  month: number;
  income: number;
  expense: number;
  txCount: number;
  uncategorizedCount: number;
  banks: BankBucket[];       // тухайн сард гүйлгээтэй банкууд
}

export interface YearBucket {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  uncategorizedCount: number;
  banks: string[];           // тухайн жилд гүйлгээтэй банкуудын unique жагсаалт
  months: MonthBucket[];
}

const UNKNOWN = "__unknown__";

export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        EXTRACT(YEAR FROM t."date")::int AS year,
        EXTRACT(MONTH FROM t."date")::int AS month,
        s."bankName"                     AS bank_name,
        t."type"                         AS type,
        SUM(t."amount")::float           AS total,
        COUNT(*)::int                    AS tx_count,
        SUM(CASE WHEN t."category" = ANY(${UNCATEGORIZED}::text[]) THEN 1 ELSE 0 END)::int AS uncategorized_count
      FROM "Transaction" t
      JOIN "Statement" s ON s."id" = t."statementId"
      WHERE s."userId" = ${userId}
      GROUP BY 1, 2, 3, 4
      ORDER BY 1 DESC, 2
    `;

    // Жил → Сар → Банк нэстэн map
    const yearsMap = new Map<number, YearBucket>();
    // Year-level unique bank set
    const yearBankSet = new Map<number, Set<string>>();
    // Month-level bank map
    const monthBankMap = new Map<string, Map<string, BankBucket>>(); // key: `${year}-${month}`

    for (const r of rows) {
      // Жилийн bucket
      if (!yearsMap.has(r.year)) {
        const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          income: 0,
          expense: 0,
          txCount: 0,
          uncategorizedCount: 0,
          banks: [],
        }));
        yearsMap.set(r.year, {
          year: r.year,
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          txCount: 0,
          uncategorizedCount: 0,
          banks: [],
          months,
        });
        yearBankSet.set(r.year, new Set());
      }

      const yearBucket = yearsMap.get(r.year)!;
      const monthBucket = yearBucket.months[r.month - 1];

      // Year/Month aggregates
      if (r.type === "income") {
        monthBucket.income += r.total;
        yearBucket.totalIncome += r.total;
      } else if (r.type === "expense") {
        monthBucket.expense += r.total;
        yearBucket.totalExpense += r.total;
      }
      monthBucket.txCount += r.tx_count;
      yearBucket.txCount += r.tx_count;
      monthBucket.uncategorizedCount += Number(r.uncategorized_count) || 0;
      yearBucket.uncategorizedCount += Number(r.uncategorized_count) || 0;

      // Bank-level: month-аар нэгтгэх
      const monthKey = `${r.year}-${r.month}`;
      if (!monthBankMap.has(monthKey)) monthBankMap.set(monthKey, new Map());
      const banksForMonth = monthBankMap.get(monthKey)!;
      const bankKey = r.bank_name ?? UNKNOWN;
      if (!banksForMonth.has(bankKey)) {
        banksForMonth.set(bankKey, {
          bankName: r.bank_name,
          income: 0,
          expense: 0,
          txCount: 0,
        });
      }
      const bankBucket = banksForMonth.get(bankKey)!;
      if (r.type === "income") bankBucket.income += r.total;
      else if (r.type === "expense") bankBucket.expense += r.total;
      bankBucket.txCount += r.tx_count;

      // Year-level unique bank list
      yearBankSet.get(r.year)!.add(bankKey);
    }

    // Bank-уудыг month bucket-руу нэмж, sort хийнэ
    for (const [monthKey, banks] of monthBankMap) {
      const [yearStr, monthStr] = monthKey.split("-");
      const yr = Number(yearStr);
      const mo = Number(monthStr);
      const sorted = Array.from(banks.values()).sort(
        (a, b) => (b.income + b.expense) - (a.income + a.expense)
      );
      const monthBucket = yearsMap.get(yr)?.months[mo - 1];
      if (monthBucket) monthBucket.banks = sorted;
    }

    // Year-level bank жагсаалтыг тогтоох (UNKNOWN-г "" гэж хадгална)
    for (const [yr, bankSet] of yearBankSet) {
      const yearBucket = yearsMap.get(yr);
      if (yearBucket) {
        yearBucket.banks = Array.from(bankSet).map(k => k === UNKNOWN ? "" : k);
      }
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
