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
  let userId = "?";
  try {
    userId = await requireUserId();
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

    // deleteMany — өөр tenant-ийн id үед P2025 throw хийхгүй, count = устгасан мөрийн тоо.
    // Гүйлгээ нь Transaction.statementId FK-ийн ON DELETE CASCADE-аар хамт устна.
    let deleted: number;
    try {
      const result = await prisma.statement.deleteMany({
        where: { id: { in: idList }, userId },
      });
      deleted = result.count;
    } catch (dbErr) {
      // FK/cascade зэрэг DB алдааг ил гаргаж, чимээгүй 500 болгохгүй.
      console.error(`[statements.DELETE] user=${userId} ids=${idList.join(",")} DB error:`, dbErr);
      return NextResponse.json({
        error: dbErr instanceof Error ? `Устгах үед DB алдаа: ${dbErr.message}` : "DB алдаа",
      }, { status: 500 });
    }

    // Нэг ч мөр устгаагүй — id буруу эсвэл өөр хэрэглэгчийнх (tenant таарахгүй).
    // Өмнө нь энэ тохиолдолд 200 буцаж, UI чимээгүй бүтэлгүйтдэг байсныг зассан.
    if (deleted === 0) {
      console.warn(`[statements.DELETE] user=${userId} ids=${idList.join(",")} matched 0 rows`);
      return NextResponse.json({
        error: "Хуулга олдсонгүй эсвэл аль хэдийн устсан байна.",
        deleted: 0,
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(`[statements.DELETE] user=${userId} unexpected error:`, err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Серверийн алдаа",
    }, { status: 500 });
  }
}
