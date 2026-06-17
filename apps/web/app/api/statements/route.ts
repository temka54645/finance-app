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
    const body = await req.json().catch(() => ({})) as { id?: string; ids?: string[] };

    // Хоёр формат дэмжинэ:
    //   { id: "..." }          — нэг хуулга устгах (хуучин формат, backward-compat)
    //   { ids: ["...","..."] } — олон хуулгыг нэг дор устгах
    const idList: string[] = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string" && x.length > 0)
      : (typeof body.id === "string" && body.id ? [body.id] : []);

    if (idList.length === 0) {
      return NextResponse.json({ error: "id эсвэл ids заавал хэрэгтэй" }, { status: 400 });
    }

    // deleteMany — өөр tenant-ийн id үед P2025 throw хийхгүй, count = устгасан мөрийн тоо
    const result = await prisma.statement.deleteMany({
      where: { id: { in: idList }, userId },
    });
    return NextResponse.json({ success: result.count > 0, deleted: result.count });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
