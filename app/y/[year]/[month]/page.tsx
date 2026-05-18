import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import MonthDetailContent from "@/components/MonthDetailContent";

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
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Буцах"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase">Сарын дэлгэрэнгүй</p>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {year} он · {MONTH_NAMES[month - 1]}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <MonthDetailContent year={year} month={month} />
      </main>
    </div>
  );
}
