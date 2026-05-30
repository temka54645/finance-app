import type { ReactNode } from "react";
import { requireUserPage } from "@/lib/route-guards";

// Onboarding нь client component тул server-side эрхийн хамгаалалтыг
// layout дотор хийнэ: нэвтрээгүй → /login, admin → /sys/control.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireUserPage();
  return children;
}
