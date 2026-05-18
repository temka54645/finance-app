import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

const UNCATEGORIZED = ["Бусад орлого", "Бусад зарлага", "Ангилаагүй"];

function yearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt:  new Date(Date.UTC(year, month, 1)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const statementId = searchParams.get("statementId");
    const uncategorized = searchParams.get("uncategorized") === "true";
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : null;
    const monthParam = searchParams.get("month");
    const month = monthParam ? Number(monthParam) : null;

    const where: Record<string, unknown> = {
      // tenant scope via the statement relation
      statement: { userId },
    };
    if (statementId) where.statementId = statementId;
    if (uncategorized) where.category = { in: UNCATEGORIZED };
    if (year && !isNaN(year) && month && !isNaN(month) && month >= 1 && month <= 12) {
      where.date = monthRange(year, month);
    } else if (year && !isNaN(year)) {
      where.date = yearRange(year);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { statement: { select: { fileName: true, bankName: true } } },
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    // Bulk update
    if (Array.isArray(body.ids)) {
      if (!body.category && !body.type) {
        return NextResponse.json({ error: "category эсвэл type шаардлагатай" }, { status: 400 });
      }
      const updated = await prisma.transaction.updateMany({
        where: { id: { in: body.ids }, statement: { userId } },
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

    const result = await prisma.transaction.updateMany({
      where: { id, statement: { userId } },
      data: {
        ...(type && { type }),
        ...(category && { category }),
        ...(note !== undefined && { note }),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Гүйлгээ олдсонгүй" }, { status: 404 });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    return NextResponse.json({ transaction });
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
    const result = await prisma.transaction.deleteMany({
      where: { id, statement: { userId } },
    });
    return NextResponse.json({ success: result.count > 0 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
