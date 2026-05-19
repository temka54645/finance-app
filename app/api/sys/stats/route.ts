import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, ForbiddenError, AdminUnauthorizedError } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalUsers,
      personalUsers,
      businessUsers,
      adminUsers,
      noTypeUsers,
      totalTransactions,
      totalStatements,
      totalIncomeAgg,
      totalExpenseAgg,
      topCategoriesRaw,
      recentSignups,
      planAgg,
      paymentStatusAgg,
      mrrAgg,
      openIssues,
      issuesByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { userType: "personal" } }),
      prisma.user.count({ where: { userType: "business" } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { userType: null } }),
      prisma.transaction.count(),
      prisma.statement.count(),
      prisma.transaction.aggregate({ where: { type: "income" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "expense" }, _sum: { amount: true } }),
      prisma.transaction.groupBy({
        by: ["category", "type"],
        _count: true,
        orderBy: { _count: { category: "desc" } },
        take: 8,
      }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.user.groupBy({
        by: ["plan"],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["paymentStatus"],
        _count: true,
      }),
      prisma.user.aggregate({
        where: { paymentStatus: "active" },
        _sum: { planAmount: true },
      }),
      prisma.issue.count({
        where: { status: { in: ["new", "in_progress"] } },
      }),
      prisma.issue.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const totalCount = topCategoriesRaw.reduce((s, c) => s + c._count, 0) || 1;
    const topCategories = topCategoriesRaw.map(c => ({
      name: c.category,
      type: c.type,
      count: c._count,
      share: c._count / totalCount,
    }));

    const plans = Object.fromEntries(planAgg.map(p => [p.plan, p._count]));
    const paymentStatuses = Object.fromEntries(paymentStatusAgg.map(p => [p.paymentStatus, p._count]));
    const issueStatusCounts = Object.fromEntries(issuesByStatus.map(i => [i.status, i._count]));

    return NextResponse.json({
      totalUsers,
      personalUsers,
      businessUsers,
      adminUsers,
      noTypeUsers,
      recentSignups,
      totalTransactions,
      totalStatements,
      totalIncome: totalIncomeAgg._sum.amount ?? 0,
      totalExpense: totalExpenseAgg._sum.amount ?? 0,
      topCategories,
      // Billing
      plans,
      paymentStatuses,
      mrr: mrrAgg._sum.planAmount ?? 0,
      // Issues
      openIssues,
      issueStatusCounts,
    });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[sys/stats] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
