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
  // Нэвтэрсэн admin → самбар (/), нэвтрээгүй бол энэ login хуудас.
  await redirectIfAuthenticated();
  return children;
}
