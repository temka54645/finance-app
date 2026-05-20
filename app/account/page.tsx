import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUsageContext, isLimitBypassed } from "@/lib/usage";
import AccountClient from "@/components/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

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
