import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const metadata: Metadata = {
  title: "Админ нэвтрэх",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Нэвтэрсэн admin → /sys/control, нэвтэрсэн энгийн хэрэглэгч → /.
  await redirectIfAuthenticated();
  return children;
}
