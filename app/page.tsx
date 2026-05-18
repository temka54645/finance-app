import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export default async function Page() {
  // Server-side: fresh DB read, JWT staleness асуудал гарахгүй
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userType: true },
  });

  if (!user?.userType) redirect("/onboarding");

  return <DashboardClient />;
}
