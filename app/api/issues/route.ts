import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

const ALLOWED_TYPES = ["bug", "feature", "question", "other"] as const;
type IssueType = typeof ALLOWED_TYPES[number];

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { type, title, description } = body as {
      type?: string;
      title?: string;
      description?: string;
    };

    if (!type || !ALLOWED_TYPES.includes(type as IssueType)) {
      return NextResponse.json({ error: "type буруу" }, { status: 400 });
    }
    if (!title?.trim() || title.length > 200) {
      return NextResponse.json({ error: "title 1-200 тэмдэгт" }, { status: 400 });
    }
    if (!description?.trim() || description.length > 5000) {
      return NextResponse.json({ error: "description 1-5000 тэмдэгт" }, { status: 400 });
    }

    const issue = await prisma.issue.create({
      data: {
        userId,
        type,
        title: title.trim(),
        description: description.trim(),
      },
    });

    return NextResponse.json({ issue });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[issues POST] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}

// Хэрэглэгч өөрийн илгээсэн issue-уудаа харж болно
export async function GET() {
  try {
    const userId = await requireUserId();
    const issues = await prisma.issue.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ issues });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
