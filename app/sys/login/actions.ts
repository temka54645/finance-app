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
