import { requireAdminPage } from "@/lib/route-guards";
import AdminClient from "@/components/AdminClient";

export const metadata = {
  title: "Админ удирдлага | FinMate",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Нэвтрээгүй → /sys/login, admin биш → /.
  await requireAdminPage();

  return <AdminClient />;
}
