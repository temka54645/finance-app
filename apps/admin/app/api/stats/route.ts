import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, ForbiddenError, AdminUnauthorizedError } from "@/lib/admin";
import { PLAN_TIERS, normalizePlan, PLAN_ORDER, type PlanKey } from "@/lib/plans";

interface MonthlyRevenueRow {
  month: string;
  revenue: number;
  paid_users: number;
}

interface TopPayingUserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  planAmount: number;
  paidAt: Date | null;
}

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
      revenueByTierRaw,
      topPayingUsersRaw,
      monthlyRevenueRaw,
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
      // Revenue by tier: paying users x sum(planAmount)
      prisma.user.groupBy({
        by: ["plan"],
        where: { paymentStatus: "active", planAmount: { gt: 0 } },
        _sum: { planAmount: true },
        _count: true,
      }),
      // Top 10 paying users
      prisma.user.findMany({
        where: { paymentStatus: "active", planAmount: { gt: 0 } },
        orderBy: { planAmount: "desc" },
        take: 10,
        select: { id: true, email: true, name: true, plan: true, planAmount: true, paidAt: true },
      }),
      // Сүүлийн 6 сарын revenue trend — paidAt дээр үндэслэнэ
      prisma.$queryRaw<MonthlyRevenueRow[]>`
        SELECT
          to_char(date_trunc('month', "paidAt"), 'YYYY-MM')      AS month,
          COALESCE(SUM("planAmount"), 0)::float                  AS revenue,
          COUNT(*)::int                                          AS paid_users
        FROM "User"
        WHERE "paidAt" IS NOT NULL
          AND "paidAt" >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1
        ORDER BY 1
      `,
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

    // Tier бүрийн орлого + хэрэглэгчдийн тоо (хуучин plan утгуудыг normalize)
    const tierRevenueMap = new Map<PlanKey, { revenue: number; payingUsers: number }>();
    for (const row of revenueByTierRaw) {
      const tier = normalizePlan(row.plan);
      const acc = tierRevenueMap.get(tier) ?? { revenue: 0, payingUsers: 0 };
      acc.revenue += row._sum.planAmount ?? 0;
      acc.payingUsers += row._count;
      tierRevenueMap.set(tier, acc);
    }
    const revenueByTier = PLAN_ORDER.map(key => {
      const stat = tierRevenueMap.get(key) ?? { revenue: 0, payingUsers: 0 };
      return {
        plan: key,
        label: PLAN_TIERS[key].label,
        priceMnt: PLAN_TIERS[key].priceMnt,
        payingUsers: stat.payingUsers,
        revenue: stat.revenue,
      };
    });

    const topPayingUsers = (topPayingUsersRaw as TopPayingUserRow[]).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: normalizePlan(u.plan),
      planLabel: PLAN_TIERS[normalizePlan(u.plan)].label,
      planAmount: u.planAmount,
      paidAt: u.paidAt ? u.paidAt.toISOString() : null,
    }));

    const monthlyRevenue = monthlyRevenueRaw.map(r => ({
      month: r.month,
      revenue: Number(r.revenue),
      payingUsers: Number(r.paid_users),
    }));

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
      // Revenue breakdown
      revenueByTier,
      topPayingUsers,
      monthlyRevenue,
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
