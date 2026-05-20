import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import AdminClient from "@/components/AdminClient";

export const metadata = {
  title: "Админ удирдлага | FinMate",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await auth();
  // Нэвтрээгүй бол админ-login хуудас руу шилжүүлнэ (engiin /login биш)
  if (!session?.user?.id) redirect("/sys/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  // Non-admin бол энгийн сайт руу буцаана
  if (user?.role !== "admin") redirect("/");

  return <AdminClient />;
}
