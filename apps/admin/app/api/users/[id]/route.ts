import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, ForbiddenError, AdminUnauthorizedError } from "@/lib/admin";

/** GET /api/users/:id — нэг хэрэглэгчийн дэлгэрэнгүй мэдээлэл */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        userType: true,
        role: true,
        plan: true,
        paymentStatus: true,
        planAmount: true,
        paidAt: true,
        createdAt: true,
        _count: {
          select: { statements: true, issues: true, customCategories: true },
        },
        accounts: { select: { provider: true } },
        statements: {
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            fileName: true,
            bankName: true,
            uploadedAt: true,
            periodStart: true,
            periodEnd: true,
            _count: { select: { transactions: true } },
          },
        },
        issues: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" }, { status: 404 });
    }

    // Орлого/зарлагын нэгдсэн дүнг хэрэглэгчийн бүх гүйлгээгээр тооцоолно
    const agg = await prisma.transaction.groupBy({
      by: ["type"],
      where: { statement: { userId: id } },
      _sum: { amount: true },
      _count: true,
    });
    const totalIncome = agg.find(a => a.type === "income")?._sum.amount ?? 0;
    const totalExpense = agg.find(a => a.type === "expense")?._sum.amount ?? 0;
    const txCount = agg.reduce((s, a) => s + a._count, 0);

    return NextResponse.json({
      user: {
        ...user,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        paidAt: user.paidAt ? user.paidAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        providers: user.accounts.map(a => a.provider),
        statementCount: user._count.statements,
        issueCount: user._count.issues,
        categoryCount: user._count.customCategories,
        statements: user.statements.map(s => ({
          id: s.id,
          fileName: s.fileName,
          bankName: s.bankName,
          uploadedAt: s.uploadedAt.toISOString(),
          periodStart: s.periodStart ? s.periodStart.toISOString() : null,
          periodEnd: s.periodEnd ? s.periodEnd.toISOString() : null,
          txCount: s._count.transactions,
        })),
        issues: user.issues.map(i => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        })),
        totalIncome,
        totalExpense,
        txCount,
      },
    });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[sys/users/:id GET] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}

/** DELETE /api/users/:id — хэрэглэгч болон холбогдох бүх өгөгдлийг устгана (cascade) */
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  try {
    const adminId = await requireAdmin();
    const { id } = await ctx.params;

    // Өөрийгөө устгахаас сэргийлнэ — самбарт хандах эрхээ алдахгүйн тулд
    if (id === adminId) {
      return NextResponse.json(
        { error: "Өөрийн бүртгэлийг устгах боломжгүй" },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" }, { status: 404 });
    }

    // Сүүлчийн админыг устгахаас сэргийлнэ
    if (target.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Системд үлдсэн цорын ганц админыг устгах боломжгүй" },
          { status: 400 },
        );
      }
    }

    // Statement → Transaction, Account, Session, Issue, CustomCategory бүгд
    // onDelete: Cascade тул хэрэглэгчийг устгахад дагалдан цэвэрлэгдэнэ.
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[sys/users/:id DELETE] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
