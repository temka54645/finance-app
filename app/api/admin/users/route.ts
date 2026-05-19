import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, ForbiddenError, AdminUnauthorizedError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const userType = searchParams.get("userType"); // personal | business | all
    const role = searchParams.get("role");          // user | admin | all
    const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

    const where: Record<string, unknown> = {};
    if (userType === "personal" || userType === "business") where.userType = userType;
    if (role === "user" || role === "admin") where.role = role;
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
        createdAt: true,
        _count: {
          select: {
            statements: true,
          },
        },
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
        createdAt: u.createdAt.toISOString(),
        statementCount: u._count.statements,
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
    console.error("[admin/users] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
