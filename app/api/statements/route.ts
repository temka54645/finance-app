import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const userId = await requireUserId();
    const statements = await prisma.statement.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      include: { _count: { select: { transactions: true } } },
    });
    return NextResponse.json({ statements });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { id } = await req.json();
    // deleteMany — буруу tenant id үед P2025 throw хийхгүй, count=0 буцна
    const result = await prisma.statement.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: result.count > 0 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
