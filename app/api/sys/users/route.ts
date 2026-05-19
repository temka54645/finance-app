import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, ForbiddenError, AdminUnauthorizedError } from "@/lib/admin";

const ALLOWED_PLANS = ["free", "pro", "business"] as const;
const ALLOWED_PAYMENT_STATUSES = ["active", "overdue", "cancelled"] as const;
const ALLOWED_ROLES = ["user", "admin"] as const;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const userType = searchParams.get("userType");
    const role = searchParams.get("role");
    const plan = searchParams.get("plan");
    const paymentStatus = searchParams.get("paymentStatus");
    const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

    const where: Record<string, unknown> = {};
    if (userType === "personal" || userType === "business") where.userType = userType;
    if (role === "user" || role === "admin") where.role = role;
    if (plan && ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number])) where.plan = plan;
    if (paymentStatus && ALLOWED_PAYMENT_STATUSES.includes(paymentStatus as typeof ALLOWED_PAYMENT_STATUSES[number])) {
      where.paymentStatus = paymentStatus;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name:  { contains: search, mode: "insensitive" } },
        { id:    { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        role: true,
        plan: true,
        paymentStatus: true,
        planAmount: true,
        paidAt: true,
        createdAt: true,
        _count: { select: { statements: true, issues: true } },
        statements: {
          select: {
            uploadedAt: true,
            _count: { select: { transactions: true } },
          },
        },
      },
    });

    const enriched = users.map(u => {
      const txCount = u.statements.reduce((s, st) => s + st._count.transactions, 0);
      const lastUpload = u.statements
        .map(s => s.uploadedAt.getTime())
        .sort((a, b) => b - a)[0] ?? null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        userType: u.userType,
        role: u.role,
        plan: u.plan,
        paymentStatus: u.paymentStatus,
        planAmount: u.planAmount,
        paidAt: u.paidAt ? u.paidAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        statementCount: u._count.statements,
        issueCount: u._count.issues,
        txCount,
        lastActive: lastUpload ? new Date(lastUpload).toISOString() : null,
      };
    });

    return NextResponse.json({ users: enriched, total: enriched.length });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[sys/users GET] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, role, plan, paymentStatus, planAmount, markPaid } = body as {
      id?: string;
      role?: string;
      plan?: string;
      paymentStatus?: string;
      planAmount?: number;
      markPaid?: boolean;
    };

    if (!id) return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (role && ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) data.role = role;
    if (plan && ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number])) data.plan = plan;
    if (paymentStatus && ALLOWED_PAYMENT_STATUSES.includes(paymentStatus as typeof ALLOWED_PAYMENT_STATUSES[number])) {
      data.paymentStatus = paymentStatus;
    }
    if (typeof planAmount === "number" && planAmount >= 0) data.planAmount = planAmount;
    if (markPaid) {
      data.paidAt = new Date();
      data.paymentStatus = "active";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Шинэчлэх талбар алга" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, userType: true, role: true,
        plan: true, paymentStatus: true, planAmount: true, paidAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[sys/users PATCH] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
