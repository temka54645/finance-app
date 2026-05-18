import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, userType: true, createdAt: true },
    });
    return NextResponse.json({ user });
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
    const { userType, name } = body;

    if (userType && !["personal", "business"].includes(userType)) {
      return NextResponse.json(
        { error: "userType нь 'personal' эсвэл 'business' байх ёстой" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(userType && { userType }),
        ...(name !== undefined && { name }),
      },
      select: { id: true, email: true, name: true, userType: true },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
