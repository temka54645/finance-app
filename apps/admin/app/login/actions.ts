"use server";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/auth";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Admin login: credentials шалгаад зөвхөн role==='admin' хэрэглэгчийг хүлээж авна.
 * Non-admin credential байсан ч сессийг шууд устгана.
 */
export async function adminLoginAction(formData: FormData): Promise<AdminLoginResult> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Имэйл болон нууц үг шаардлагатай" };
  }

  // Эхлээд DB-ээс role-г шалгана — non-admin бол credentials шалгахгүй
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, emailVerified: true },
  });

  if (!user) {
    return { ok: false, error: "Имэйл эсвэл нууц үг буруу" };
  }
  if (user.role !== "admin") {
    return { ok: false, error: "Энэ хэсэгт хандах эрхгүй байна" };
  }
  if (!user.emailVerified) {
    return { ok: false, error: "Имэйлээ баталгаажуулна уу" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("EmailNotVerified")) {
      return { ok: false, error: "Имэйлээ баталгаажуулна уу" };
    }
    return { ok: false, error: "Имэйл эсвэл нууц үг буруу" };
  }
}

/**
 * Хамгаалалтын зорилгоор ашиглах logout — sys login дээр алдаа гарсан үед сессийг устгана.
 */
export async function adminSignOutAction() {
  await signOut({ redirect: false });
}

export type AdminGoogleResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * /sys/login дээрх Google товч нь шууд OAuth flow руу яаралтай биш —
 * эхлээд server side оруулсан email нь admin role-той эсэхийг шалгана.
 *
 * Энэ нь random duryn hun /sys/login URL-ийг олж аваад Google товч дарж
 * аккаунт үүсгэх боломжгүй болгодог.
 */
export async function adminGoogleSigninAction(formData: FormData): Promise<AdminGoogleResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return { ok: false, error: "Имэйл шаардлагатай" };

  // Pre-check: уг хэрэглэгч одоо DB-д admin байгаа эсэхийг шалгана
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, emailVerified: true },
  });

  if (!user) {
    return { ok: false, error: "Энэ имэйл системд бүртгэлгүй байна" };
  }
  if (user.role !== "admin") {
    return { ok: false, error: "Энэ имэйл нь админ эрхгүй байна" };
  }
  if (!user.emailVerified) {
    return { ok: false, error: "Имэйлийг баталгаажуулна уу" };
  }

  // Бүх шалгалт амжилттай — client side signIn("google") руу буцаана
  return { ok: true, email };
}
