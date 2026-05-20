"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { sendVerificationEmail } from "@/lib/mail";

const signupSchema = z.object({
  email: z.string().email("Имэйл хаяг буруу"),
  password: z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
  name: z.string().min(1).max(80).optional(),
});

export type SignupResult =
  | { ok: true; requiresVerification: true; email: string }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 цаг

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Хүчингүй өгөгдөл" };
  }

  const { email, password, name } = parsed.data;
  const lowerEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (existing) {
    return { ok: false, error: "Энэ имэйл аль хэдийн бүртгэгдсэн байна" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: lowerEmail, hashedPassword, name: name ?? null },
    select: { id: true, email: true, name: true },
  });

  // Verification token үүсгээд email илгээнэ
  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: lowerEmail,
      token,
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const mail = await sendVerificationEmail({ email: user.email, token, name: user.name });
  if (!mail.ok) {
    // Email явахгүй боловч бүртгэл амжилттай. Token DB-д бий тул дараа resend боломжтой.
    console.error("[signup] verification email failed:", mail.error);
  }

  return { ok: true, requiresVerification: true, email: user.email };
}

export async function resendVerificationAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  if (!email) return { ok: false, error: "Имэйл шаардлагатай" };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, emailVerified: true } });
  if (!user) return { ok: false, error: "Хэрэглэгч олдсонгүй" };
  if (user.emailVerified) return { ok: false, error: "Энэ имэйл аль хэдийн баталгаажсан байна" };

  // Хуучин token-уудыг устгаад шинэ үүсгэнэ
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const mail = await sendVerificationEmail({ email, token, name: user.name });
  if (!mail.ok) return { ok: false, error: mail.error ?? "Email илгээж чадсангүй" };
  return { ok: true };
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; code?: "EmailNotVerified" };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Имэйл болон нууц үг шаардлагатай" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (err) {
    // NextAuth-аас гарсан "EmailNotVerified" алдааг тусгайлан таниулна
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("EmailNotVerified")) {
      return {
        ok: false,
        error: "Энэ имэйлийг баталгаажуулаагүй байна. Имэйлээ шалгана уу.",
        code: "EmailNotVerified",
      };
    }
    return { ok: false, error: "Имэйл эсвэл нууц үг буруу" };
  }
}
