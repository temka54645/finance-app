import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/route-guards";
import InsightsDetailClient, { type Metric } from "@/components/InsightsDetailClient";

const METRICS: Metric[] = ["income", "expense", "largest", "frequent"];

interface PageProps {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  // Нэвтрээгүй → /login, admin → /sys/control. Энгийн хэрэглэгч л цааш үргэлжилнэ.
  const userId = await requireUserPage();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userType: true },
  });
  if (!user?.userType) redirect("/onboarding");

  const { metric } = await params;
  if (!METRICS.includes(metric as Metric)) notFound();

  const { year, month } = await searchParams;
  const y = year ? Number(year) : undefined;
  const m = month ? Number(month) : undefined;

  return (
    <InsightsDetailClient
      metric={metric as Metric}
      year={Number.isFinite(y) ? y : undefined}
      month={Number.isFinite(m) ? m : undefined}
    />
  );
}
