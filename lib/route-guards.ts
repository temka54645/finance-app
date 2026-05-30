import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";

/**
 * Хуудас (page / layout) түвшний эрхийн хамгаалалт.
 *
 * Энэ апп нэг л NextAuth session-той — admin гэдэг нь зүгээр `role: "admin"`
 * хэрэглэгч. Тиймээс "admin талбар" ба "энгийн хэрэглэгчийн апп" хоёрыг тус
 * тусад нь барих логикийг энд төвлөрүүлж, хуудас бүрт давтахгүй.
 *
 * `session.user.role` нь auth.ts-ийн session callback дотор DB-ээс ҮРГЭЛЖ
 * шинэхэн уншигддаг тул энд дахин DB лук хийх шаардлагагүй (stale байхгүй).
 */

function roleOf(session: Session | null): "admin" | "user" {
  return (session?.user as { role?: string | null } | undefined)?.role === "admin"
    ? "admin"
    : "user";
}

/** Нэвтэрсэн хэрэглэгчийн role-д тохирох "нүүр" замыг буцаана. */
function homeFor(role: "admin" | "user"): string {
  return role === "admin" ? "/sys/control" : "/";
}

/**
 * Энгийн хэрэглэгчийн апп хуудсууд (`/`, `/account`, `/statements` гм).
 * - Нэвтрээгүй  → `/login`
 * - Admin       → `/sys/control` (админ энгийн апп-ыг ашиглахгүй)
 * @returns userId
 */
export async function requireUserPage(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (roleOf(session) === "admin") redirect("/sys/control");
  return session.user.id;
}

/**
 * Админ талбарын хуудсууд (`/sys/*`).
 * - Нэвтрээгүй  → `/sys/login`
 * - Admin биш   → `/` (энгийн апп руу)
 * @returns userId (admin-ийнх)
 */
export async function requireAdminPage(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/sys/login");
  if (roleOf(session) !== "admin") redirect("/");
  return session.user.id;
}

/**
 * Энгийн нэвтрэх хуудсууд (`/login`, `/signup`).
 * Аль хэдийн нэвтэрсэн бол role-ийнх нь нүүр рүү буцаана —
 * back товчоор login руу буцаж ороход самбар алдагдахаас сэргийлнэ.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) redirect(homeFor(roleOf(session)));
}
