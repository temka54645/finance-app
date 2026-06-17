import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Хуудас (page / layout) түвшний эрхийн хамгаалалт.
 *
 * Админ хэсэг тусдаа app (`finmate-admin`) болж салсан тул энэ web app нь
 * зөвхөн энгийн хэрэглэгчийн талбар. Энд "нэвтэрсэн эсэх"-ийг л шалгана —
 * `role` ялгаварлахгүй (admin хэрэглэгч ч энгийн апп-аа ашиглаж болно).
 */

/**
 * Энгийн хэрэглэгчийн апп хуудсууд (`/`, `/account`, `/statements` гм).
 * - Нэвтрээгүй → `/login`
 * @returns userId
 */
export async function requireUserPage(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * Энгийн нэвтрэх хуудсууд (`/login`, `/signup`).
 * Аль хэдийн нэвтэрсэн бол нүүр рүү буцаана — back товчоор login руу буцаж
 * ороход самбар алдагдахаас сэргийлнэ.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) redirect("/");
}
