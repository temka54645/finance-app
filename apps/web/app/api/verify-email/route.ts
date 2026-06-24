import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Кодыг хэдэн удаа буруу оруулж болох дээд хязгаар (brute-force-оос хамгаална). */
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").toLowerCase().trim();
    const code = String(body?.code ?? "").trim();

    if (!email || !code) {
      return NextResponse.json({ error: "Имэйл болон код шаардлагатай" }, { status: 400 });
    }

    // Энэ имэйлийн идэвхтэй кодыг олно (resend бүрт хуучныг устгадаг тул нэг л байх ёстой).
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Код олдсонгүй. Шинэ код хүсэлт өгнө үү." },
        { status: 404 },
      );
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json(
        { error: "Кодын хугацаа дууссан. Шинэ код хүсэлт өгнө үү." },
        { status: 410 },
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json(
        { error: "Хэт олон удаа буруу оруулсан тул код хүчингүй боллоо. Шинэ код хүсэлт өгнө үү." },
        { status: 429 },
      );
    }

    // Код буруу — оролдлогын тоог нэмж, үлдсэн оролдлогыг мэдэгдэнэ.
    if (record.token !== code) {
      const updated = await prisma.verificationToken.update({
        where: { identifier_token: { identifier: email, token: record.token } },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Код буруу байна. Үлдсэн оролдлого: ${left}`
              : "Хэт олон удаа буруу оруулсан тул код хүчингүй боллоо. Шинэ код хүсэлт өгнө үү.",
        },
        { status: 400 },
      );
    }

    // Код зөв — хэрэглэгчийг баталгаажуулна.
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      // Энэ хэрэглэгчийн бүх verification код устгана
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[verify-email] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
