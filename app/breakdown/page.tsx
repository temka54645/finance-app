import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/route-guards";
import BreakdownClient from "@/components/BreakdownClient";

export default async function Page() {
  // Нэвтрээгүй → /login, admin → /sys/control. Энгийн хэрэглэгч л цааш үргэлжилнэ.
  const userId = await requireUserPage();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userType: true },
  });

  if (!user?.userType) redirect("/onboarding");

  return <BreakdownClient />;
}
