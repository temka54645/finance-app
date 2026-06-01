import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import {
  ICON_CATALOG_FOR_AI,
  isValidIconKey,
  DEFAULT_ICON_KEY,
} from "@/lib/custom-category-icons";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Ангиллын нэрэнд тохирох лого (icon key)-г AI-аар тооцоолж санал болгоно.
 * POST { name: string, type?: "income" | "expense" } → { icon: string }
 */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = body.type === "income" ? "орлого" : body.type === "expense" ? "зарлага" : "";

    if (!name) {
      return NextResponse.json({ error: "Ангиллын нэр шаардлагатай" }, { status: 400 });
    }

    const prompt = `Та санхүүгийн апп-д ангиллын лого (icon) сонгох туслах байна.
Доорх жагсаалтаас "${name}"${type ? ` (${type})` : ""} гэсэн ангилалд ХАМГИЙН тохиромжтой нэг icon-ы key-г сонго.

Боломжит icon-ууд (key: түлхүүр үгс):
${ICON_CATALOG_FOR_AI}

Зөвхөн нэг key-г (жишээ: shopping-cart) буцаа. Өөр текст, тайлбар бүү бич. Тохирох нь олдохгүй бол "${DEFAULT_ICON_KEY}" гэж буцаа.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 24,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    // Хариунаас key хэлбэрийн эхний үгийг салгана.
    const candidate = (text.match(/[a-z][a-z-]*/i)?.[0] ?? "").toLowerCase();
    const icon = isValidIconKey(candidate) ? candidate : DEFAULT_ICON_KEY;

    return NextResponse.json({ icon });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[suggest-icon] error:", err);
    // AI бүтэлгүйтвэл default буцааж, UI-г блоклохгүй.
    return NextResponse.json({ icon: DEFAULT_ICON_KEY });
  }
}
