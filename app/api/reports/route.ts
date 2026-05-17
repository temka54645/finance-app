import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId");

  const where = statementId ? { statementId } : {};

  const [incomeAgg, expenseAgg, byCategory, statements] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: "income" }, _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({ where: { ...where, type: "expense" }, _sum: { amount: true }, _count: true }),
    prisma.transaction.groupBy({ by: ["category", "type"], where, _sum: { amount: true }, _count: true }),
    prisma.statement.findMany({ orderBy: { uploadedAt: "desc" }, select: { id: true, fileName: true, bankName: true, uploadedAt: true } }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;

  return NextResponse.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeCount: incomeAgg._count,
    expenseCount: expenseAgg._count,
    byCategory,
    statements,
  });
}
