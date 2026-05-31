import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/route-guards";
import BreakdownClient from "@/components/BreakdownClient";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  // Нэвтрээгүй → /login, admin → /sys/control. Энгийн хэрэглэгч л цааш үргэлжилнэ.
  const userId = await requireUserPage();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userType: true },
  });

  if (!user?.userType) redirect("/onboarding");

  const { type } = await searchParams;
  const initialType = type === "income" || type === "expense" ? type : "all";

  return <BreakdownClient initialType={initialType} />;
}
