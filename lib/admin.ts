import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export class ForbiddenError extends Error {
  status = 403;
  constructor() { super("Зөвхөн админ хэрэглэгч хандах боломжтой"); }
}

export class AdminUnauthorizedError extends Error {
  status = 401;
  constructor() { super("Нэвтрэх шаардлагатай"); }
}

/**
 * Admin route бүрд эхэнд дуудаж эрх шалгана.
 * - 401 → нэвтрээгүй
 * - 403 → нэвтэрсэн боловч admin биш
 * - userId буцаах → admin бол
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AdminUnauthorizedError();

  // JWT-д хадгалагдсан role-г түрүүлж шалгана (хурдан path)
  const tokenRole = (session.user as { role?: string | null }).role;
  if (tokenRole === "admin") return session.user.id;

  // JWT staleness-аас зайлсхийхийн тулд DB-ээс баталгаажуулна
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (u?.role !== "admin") throw new ForbiddenError();
  return session.user.id;
}

export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
