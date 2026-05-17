import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId");

  const where = statementId ? { statementId } : {};

  const UNCATEGORIZED = ["Бусад орлого", "Бусад зарлага", "Ангилаагүй"];

  const [incomeAgg, expenseAgg, byCategory, statements, uncategorizedCount] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: "income" }, _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({ where: { ...where, type: "expense" }, _sum: { amount: true }, _count: true }),
    prisma.transaction.groupBy({ by: ["category", "type"], where, _sum: { amount: true }, _count: true }),
    prisma.statement.findMany({ orderBy: { uploadedAt: "desc" }, select: { id: true, fileName: true, bankName: true, uploadedAt: true } }),
    prisma.transaction.count({ where: { ...where, category: { in: UNCATEGORIZED } } }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;

  // Тусгай нэгтгэл: тодорхой категориудаар
  const findCategory = (name: string, type: "income" | "expense") => {
    const item = byCategory.find(c => c.category === name && c.type === type);
    return {
      amount: item?._sum.amount ?? 0,
      count: item?._count ?? 0,
    };
  };

  const highlights = {
    bankFees:   findCategory("Банкны шимтгэл", "expense"),
    salaryPaid: findCategory("Цалин зарлага", "expense"),
    taxes:      findCategory("Татвар", "expense"),
    salaryReceived: findCategory("Цалин", "income"),
  };

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
  });
}
