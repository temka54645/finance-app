import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// GET /api/statements/gaps
// Хэрэглэгчийн бүх statement-ийг periodEnd-ийн дараалалд харьцуулж,
// зэрэгцээ хуулга хоорондын opening↔prior-closing зөрүү > 1₮ бол warning буцаана.
//
// Энэ нь upload route-доос gap detection-ийг тусгаарласан: parallel upload-ийн
// үед зэрэг ажиллаж буй хүсэлтүүд бие биеийнхээ commit-ийг хараагүй учир
// "өмнөх" statement-ийг буруу сонгож false-positive үүсгэдэг асуудлыг зассан.
// Энэ endpoint нь бүх upload commit болсны дараа нэг л удаа дуудагдана.
export async function GET() {
  try {
    const userId = await requireUserId();

    const statements = await prisma.statement.findMany({
      where: {
        userId,
        periodStart: { not: null },
        periodEnd: { not: null },
        openingBalance: { not: null },
        closingBalance: { not: null },
      },
      orderBy: { periodEnd: "asc" },
      select: {
        id: true,
        fileName: true,
        periodStart: true,
        periodEnd: true,
        openingBalance: true,
        closingBalance: true,
      },
    });

    const gaps: Array<{
      statementId: string;
      message: string;
      diff: number;
      priorStatementId: string;
      priorFile: string;
      priorPeriodEnd: string | null;
      priorClosing: number;
      thisOpening: number;
    }> = [];

    const fmt = (n: number) =>
      n.toLocaleString("mn-MN", { maximumFractionDigits: 2 }) + "₮";

    for (let i = 1; i < statements.length; i++) {
      const prev = statements[i - 1];
      const cur = statements[i];
      if (
        prev.closingBalance == null ||
        cur.openingBalance == null ||
        !Number.isFinite(prev.closingBalance) ||
        !Number.isFinite(cur.openingBalance)
      ) continue;

      const diff = cur.openingBalance - prev.closingBalance;
      if (Math.abs(diff) > 1) {
        gaps.push({
          statementId: cur.id,
          message:
            `Анхаарал: Энэ хуулгын эхний үлдэгдэл (${fmt(cur.openingBalance)}) нь ` +
            `өмнөх хуулгын (${prev.fileName}) эцсийн үлдэгдлээс (${fmt(prev.closingBalance)}) ` +
            `${fmt(Math.abs(diff))}-ээр зөрж байна. Дунд нь оруулаагүй хуулга байж магадгүй.`,
          diff,
          priorStatementId: prev.id,
          priorFile: prev.fileName,
          priorPeriodEnd: prev.periodEnd ? prev.periodEnd.toISOString() : null,
          priorClosing: prev.closingBalance,
          thisOpening: cur.openingBalance,
        });
      }
    }

    return NextResponse.json({ gaps });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
