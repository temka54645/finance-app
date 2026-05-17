import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const statements = await prisma.statement.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { _count: { select: { transactions: true } } },
  });
  return NextResponse.json({ statements });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.statement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
