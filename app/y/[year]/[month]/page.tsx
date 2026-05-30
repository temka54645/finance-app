import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2, Check } from "lucide-react";
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
  // Нэвтрээгүй → /login, admin → /sys/control.
  await requireUserPage();

  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-3 min-w-0 rounded-xl px-2 py-1 -mx-2 hover:bg-slate-100 transition-colors"
            title="Нүүр хуудас руу буцах"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase">Сарын дэлгэрэнгүй</p>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {year} он · {MONTH_NAMES[month - 1]}
              </h1>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            title="Гүйлгээний өөрчлөлтийг ангиллаа автоматаар хадгалсан — нүүр хуудас руу буцах"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Хадгалаад буцах</span>
            <span className="sm:hidden">Буцах</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <MonthDetailContent year={year} month={month} />
      </main>
    </div>
  );
}
