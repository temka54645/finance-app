import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UNCATEGORIZED = ["Бусад орлого", "Бусад зарлага", "Ангилаагүй"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId");
  const uncategorized = searchParams.get("uncategorized") === "true";

  const where: Record<string, unknown> = {};
  if (statementId) where.statementId = statementId;
  if (uncategorized) where.category = { in: UNCATEGORIZED };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: { statement: { select: { fileName: true, bankName: true } } },
  });

  return NextResponse.json({ transactions });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Bulk update: { ids: [...], category, type? }
  if (Array.isArray(body.ids)) {
    if (!body.category && !body.type) {
      return NextResponse.json({ error: "category эсвэл type шаардлагатай" }, { status: 400 });
    }
    const updated = await prisma.transaction.updateMany({
      where: { id: { in: body.ids } },
      data: {
        ...(body.type && { type: body.type }),
        ...(body.category && { category: body.category }),
      },
    });
    return NextResponse.json({ count: updated.count });
  }

  // Single update
  const { id, type, category, note } = body;
  if (!id) return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(category && { category }),
      ...(note !== undefined && { note }),
    },
  });

  return NextResponse.json({ transaction: updated });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
