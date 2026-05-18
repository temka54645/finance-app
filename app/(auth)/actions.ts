"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";

const signupSchema = z.object({
  email: z.string().email("Имэйл хаяг буруу"),
  password: z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
  name: z.string().min(1).max(80).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signupAction(formData: FormData): Promise<ActionResult> {
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
  await prisma.user.create({
    data: { email: lowerEmail, hashedPassword, name: name ?? null },
  });

  // Бүртгэлийн дараа автомат нэвтрэх
  try {
    await signIn("credentials", {
      email: lowerEmail,
      password,
      redirect: false,
    });
  } catch (err) {
    console.error("[signup] auto-signin failed:", err);
    return { ok: false, error: "Бүртгэгдлээ, гэхдээ нэвтрэхэд алдаа гарлаа. Login хийнэ үү." };
  }

  return { ok: true };
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Имэйл болон нууц үг шаардлагатай" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch {
    return { ok: false, error: "Имэйл эсвэл нууц үг буруу" };
  }
}
