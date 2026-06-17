import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";

// Админ app — энд бүх хуудас зөвхөн admin-д нээлттэй. Нэвтрээгүй / admin биш
// бол login руу буцаана (энэ app-д энгийн хэрэглэгчийн "нүүр" гэж байхгүй).

function roleOf(session: Session | null): "admin" | "user" {
  return (session?.user as { role?: string | null } | undefined)?.role === "admin"
    ? "admin"
    : "user";
}

/**
 * Админ хуудсууд (`/`, болон бусад).
 * - Нэвтрээгүй → `/login`
 * - Admin биш  → `/login`
 * @returns userId (admin-ийнх)
 */
export async function requireAdminPage(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (roleOf(session) !== "admin") redirect("/login");
  return session.user.id;
}

/**
 * Login хуудас (`/login`). Аль хэдийн нэвтэрсэн admin → dashboard (`/`).
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await auth();
  if (session?.user?.id && roleOf(session) === "admin") redirect("/");
}
