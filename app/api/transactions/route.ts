import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId");

  const transactions = await prisma.transaction.findMany({
    where: statementId ? { statementId } : undefined,
    orderBy: { date: "desc" },
    include: { statement: { select: { fileName: true, bankName: true } } },
  });

  return NextResponse.json({ transactions });
}

export async function PATCH(req: NextRequest) {
  const { id, type, category, note } = await req.json();

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
