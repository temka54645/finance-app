import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import MonthDetailContent from "@/components/MonthDetailContent";
import { requireUserPage } from "@/lib/route-guards";

const MONTH_NAMES = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

interface PageProps {
  params: Promise<{ year: string; month: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { year, month } = await params;
  return {
    title: `${year} он ${MONTH_NAMES[Number(month) - 1] ?? month} | Санхүүгийн дүн шинжилгээ`,
  };
}

export default async function MonthDetailPage({ params }: PageProps) {
  // Нэвтрээгүй → /login.
  await requireUserPage();

  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    notFound();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/breakdown"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
            title="Задаргаа цэс рүү буцах"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Задаргаа руу буцах
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {year} он · {MONTH_NAMES[month - 1]}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Тухайн сарын гүйлгээний дэлгэрэнгүй — ангиллын өөрчлөлт автоматаар хадгалагдана
          </p>
        </div>
      </div>

      <MonthDetailContent year={year} month={month} />
    </AppShell>
  );
}
