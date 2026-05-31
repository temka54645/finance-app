import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/route-guards";
import BreakdownClient from "@/components/BreakdownClient";
import { type Metric } from "@/components/CounterpartyDrilldown";

const METRICS: Metric[] = ["income", "expense", "largest", "frequent"];

interface PageProps {
  searchParams: Promise<{ type?: string; metric?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  // Нэвтрээгүй → /login, admin → /sys/control. Энгийн хэрэглэгч л цааш үргэлжилнэ.
  const userId = await requireUserPage();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userType: true },
  });

  if (!user?.userType) redirect("/onboarding");

  const { type, metric } = await searchParams;
  const initialType = type === "income" || type === "expense" ? type : "all";
  const initialMetric = METRICS.includes(metric as Metric) ? (metric as Metric) : null;

  return <BreakdownClient initialType={initialType} initialMetric={initialMetric} />;
}
