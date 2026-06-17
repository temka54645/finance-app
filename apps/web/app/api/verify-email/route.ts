import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token шаардлагатай" }, { status: 400 });
    }

    const verifyToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verifyToken) {
      return NextResponse.json({ error: "Token олдсонгүй эсвэл аль хэдийн ашиглагдсан" }, { status: 404 });
    }

    if (verifyToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "Token-ийн хугацаа дууссан. Дахин баталгаажуулах линк хүсэлт өгнө үү." }, { status: 410 });
    }

    // Хэрэглэгчийг олж emailVerified тохируулна
    const user = await prisma.user.findUnique({
      where: { email: verifyToken.identifier },
      select: { id: true, email: true },
    });

    if (!user) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      // Энэ хэрэглэгчийн бүх verification token-уудыг устгана
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
    ]);

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[verify-email] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
