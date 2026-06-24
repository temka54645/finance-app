/**
 * Email илгээх тусгай туслах модуль (Resend ашиглана).
 * RESEND_API_KEY env шаардлагатай. Тохируулаагүй бол log-д хэвлэгдэх болно
 * (dev үед verification line зочин-руу ажиллахгүй).
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.MAIL_FROM ?? "FinMate <onboarding@resend.dev>";
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/** Имэйл доторх "захиалга цуцлах" / гомдол мэдэгдэх хаяг (deliverability-д тус болно). */
const UNSUBSCRIBE_MAILTO = process.env.MAIL_UNSUBSCRIBE ?? "noreply@finmate.mn";

interface SendVerificationOptions {
  /** Хүлээн авагчийн email */
  email: string;
  /** 6 оронтой баталгаажуулах код */
  code: string;
  /** Дэлгэцэнд харагдах хэрэглэгчийн нэр (optional) */
  name?: string | null;
}

export async function sendVerificationEmail({ email, code, name }: SendVerificationOptions) {
  const verifyUrl = `${APP_URL}/verify-email?email=${encodeURIComponent(email)}`;
  const greeting = name ? `Сайн байна уу, ${name}!` : "Сайн байна уу!";

  const subject = `FinMate баталгаажуулах код: ${code}`;

  // Кодыг "1 2 3 4 5 6" хэлбэрээр зайтай харуулна — уншихад/хуулахад хялбар.
  const spacedCode = code.split("").join(" ");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #2563eb;">FinMate</h1>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Таны цахим санхүүгийн зөвлөх</p>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
        <p style="margin: 0 0 8px; color: #334155; font-size: 14px; line-height: 1.6;">
          Имэйл хаягаа баталгаажуулахын тулд доорх 6 оронтой кодыг апп дээрх талбарт оруулна уу.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 16px 28px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b; font-family: 'SFMono-Regular', Consolas, monospace;">
            ${spacedCode}
          </div>
        </div>
        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
          Энэ код <strong>15 минутын</strong> дотор хүчинтэй. Кодыг хэн нэгэнтэй бүү хуваалцаарай.
        </p>
      </div>
      <p style="margin: 24px 0 0; text-align: center; color: #94a3b8; font-size: 12px;">
        Хэрэв та бүртгэл үүсгээгүй бол энэ имэйлийг үл харгалзана уу.
      </p>
    </div>
  `;

  // Plain-text хувилбар — multipart/alternative болгож spam оноог бууруулна.
  const text = [
    greeting,
    "",
    "FinMate-д имэйл хаягаа баталгаажуулах код:",
    "",
    `    ${code}`,
    "",
    "Энэ кодыг апп дээрх баталгаажуулах талбарт оруулна уу.",
    "Код 15 минутын дотор хүчинтэй. Кодыг хэн нэгэнтэй бүү хуваалцаарай.",
    "",
    "Хэрэв та бүртгэл үүсгээгүй бол энэ имэйлийг үл харгалзана уу.",
    "",
    "— FinMate",
    APP_URL,
  ].join("\n");

  if (!resend) {
    console.warn("[mail] RESEND_API_KEY тохируулаагүй — verification код log-руу хэвлэгдлээ");
    console.log("[mail] VERIFY CODE:", code, "for", email, "open:", verifyUrl);
    return { ok: true, dev: true } as const;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
      // Deliverability: gmail/yahoo bulk-sender дүрэмд one-click unsubscribe сайнаар үнэлэгддэг.
      headers: {
        "List-Unsubscribe": `<mailto:${UNSUBSCRIBE_MAILTO}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      console.error("[mail] Resend error:", result.error);
      return { ok: false, error: result.error.message } as const;
    }
    return { ok: true, id: result.data?.id } as const;
  } catch (err) {
    console.error("[mail] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Mail send failed" } as const;
  }
}
