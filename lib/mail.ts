/**
 * Email илгээх тусгай туслах модуль (Resend ашиглана).
 * RESEND_API_KEY env шаардлагатай. Тохируулаагүй бол log-д хэвлэгдэх болно
 * (dev үед verification line зочин-руу ажиллахгүй).
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.MAIL_FROM ?? "Finance Analytics <onboarding@resend.dev>";
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface SendVerificationOptions {
  /** Хүлээн авагчийн email */
  email: string;
  /** Баталгаажуулах token (URL-д явна) */
  token: string;
  /** Дэлгэцэнд харагдах хэрэглэгчийн нэр (optional) */
  name?: string | null;
}

export async function sendVerificationEmail({ email, token, name }: SendVerificationOptions) {
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = name ? `Сайн байна уу, ${name}!` : "Сайн байна уу!";

  const subject = "Finance Analytics — имэйл баталгаажуулна уу";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #2563eb;">Finance Analytics</h1>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Банкны хуулга задлан шинжилгээ</p>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
        <p style="margin: 0 0 16px; color: #334155; font-size: 14px; line-height: 1.6;">
          Танай имэйл хаягийг баталгаажуулахын тулд доорх товчийг дарна уу.
          Энэхүү линк нь 24 цагийн дотор хүчинтэй.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; font-size: 14px;">
            Имэйл баталгаажуулах
          </a>
        </div>
        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
          Хэрэв товч ажиллахгүй бол энэ хаягийг хуулж browser-д тавьна уу:<br>
          <span style="color: #2563eb; word-break: break-all;">${verifyUrl}</span>
        </p>
      </div>
      <p style="margin: 24px 0 0; text-align: center; color: #94a3b8; font-size: 12px;">
        Хэрэв та бүртгэл үүсгээгүй бол энэ имэйлийг үл харгалзана уу.
      </p>
    </div>
  `;

  if (!resend) {
    console.warn("[mail] RESEND_API_KEY тохируулаагүй — verification email log-руу хэвлэгдлээ");
    console.log("[mail] VERIFY URL:", verifyUrl);
    return { ok: true, dev: true } as const;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
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
