import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { isValidIconKey } from "@/lib/custom-category-icons";

const TYPES = ["income", "expense"];
const USER_TYPES = ["personal", "business"];

/** Хэрэглэгчийн өөрийн нэмсэн ангиллуудыг буцаана. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const categories = await prisma.customCategory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, userType: true, icon: true },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

/** Хувийн ангилал устгана — ?id=... */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });
    }
    // Зөвхөн өөрийн ангиллыг устгана (userId шүүлтээр баталгаажуулна).
    const result = await prisma.customCategory.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Ангилал олдсонгүй" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

/** Шинэ хувийн ангилал нэмнэ. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const { type, userType } = body;
    // icon заавал биш — танигдахгүй key ирвэл хадгалахгүй (default "tag" болно).
    const icon = isValidIconKey(body.icon) ? body.icon : null;

    if (!name) {
      return NextResponse.json({ error: "Ангиллын нэр шаардлагатай" }, { status: 400 });
    }
    if (name.length > 40) {
      return NextResponse.json({ error: "Нэр хэт урт байна (40 тэмдэгт)" }, { status: 400 });
    }
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: "type буруу байна" }, { status: 400 });
    }
    if (!USER_TYPES.includes(userType)) {
      return NextResponse.json({ error: "userType буруу байна" }, { status: 400 });
    }

    try {
      const created = await prisma.customCategory.create({
        data: { userId, name, type, userType, icon },
        select: { id: true, name: true, type: true, userType: true, icon: true },
      });
      return NextResponse.json({ category: created }, { status: 201 });
    } catch (e) {
      // @@unique([userId, userType, type, name]) давхцал
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Ийм ангилал аль хэдийн байна" }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
