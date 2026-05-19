import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminUnauthorizedError, ForbiddenError } from "@/lib/admin";

const ALLOWED_STATUSES = ["new", "in_progress", "resolved", "wont_fix"] as const;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (status && ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) where.status = status;
    if (type) where.type = type;

    const issues = await prisma.issue.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      take: 200,
    });

    const counts = await prisma.issue.groupBy({
      by: ["status"],
      _count: true,
    });
    const statusCounts = Object.fromEntries(counts.map(c => [c.status, c._count]));

    return NextResponse.json({ issues, statusCounts });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, status, adminNote } = body as {
      id?: string;
      status?: string;
      adminNote?: string;
    };
    if (!id) return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });
    if (status && !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      return NextResponse.json({ error: "status буруу" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "resolved" || status === "wont_fix") data.resolvedAt = new Date();
      if (status === "new" || status === "in_progress") data.resolvedAt = null;
    }
    if (adminNote !== undefined) data.adminNote = adminNote;

    const issue = await prisma.issue.update({ where: { id }, data });
    return NextResponse.json({ issue });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
