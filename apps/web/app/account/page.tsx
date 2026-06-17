import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUsageContext, isLimitBypassed } from "@/lib/usage";
import { requireUserPage } from "@/lib/route-guards";
import AccountClient from "@/components/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  // Нэвтрээгүй → /login.
  const userId = await requireUserPage();

  const [user, ctx] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        role: true,
        plan: true,
        paymentStatus: true,
        planAmount: true,
        paidAt: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    getUsageContext(userId),
  ]);

  if (!user) redirect("/login");
  if (!user.userType) redirect("/onboarding");

  return (
    <AccountClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        role: user.role,
        plan: user.plan,
        paymentStatus: user.paymentStatus,
        planAmount: user.planAmount,
        paidAt: user.paidAt ? user.paidAt.toISOString() : null,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }}
      usage={ctx.usage}
      betaMode={isLimitBypassed()}
    />
  );
}
