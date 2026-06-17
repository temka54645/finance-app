import type { ReactNode } from "react";
import { requireUserPage } from "@/lib/route-guards";

// Categories нь client component тул server-side эрхийн хамгаалалтыг
// layout дотор хийнэ: нэвтрээгүй → /login.
export default async function CategoriesLayout({ children }: { children: ReactNode }) {
  await requireUserPage();
  return children;
}
