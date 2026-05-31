"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, AlertCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import SummaryCards from "@/components/SummaryCards";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import CounterpartyInsights from "@/components/CounterpartyInsights";
import { useDataRefresh } from "@/lib/use-data-refresh";

interface OverviewReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  uncategorizedCount: number;
}

/** Үндсэн dashboard дээр үйлдэл хийгдэхгүй — энэ wrapper нь доtorх агуулгыг
 *  идэвхгүй болгож, дарахад "Задаргаа" цэс рүү шилжүүлнэ. */
function ToBreakdown({ href = "/breakdown", children }: { href?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative block rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400"
      title="Задаргаа харах"
    >
      <span className="pointer-events-none absolute right-3 top-3 z-10 hidden items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg group-hover:flex">
        Задаргаа харах <ArrowRight className="h-3 w-3" />
      </span>
      <div className="pointer-events-none transition-opacity group-hover:opacity-95">{children}</div>
    </Link>
  );
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<OverviewReport | null>(null);

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/reports");
    const data = await res.json();
    setOverview(data);
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useDataRefresh(fetchOverview);

  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "хэрэглэгч";
  const hasData = overview && overview.incomeCount + overview.expenseCount > 0;

  return (
    <AppShell>
      {/* Мэндчилгээ */}
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">Тойм</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Сайн байна уу,{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            {displayName}
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Үзүүлэлт дээр дарж дэлгэрэнгүй задаргааг харна уу
        </p>
      </div>

      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="mb-1 text-sm font-medium text-slate-500">Гүйлгээний мэдээлэл байхгүй байна</p>
          <p className="text-xs text-slate-400">Дээрх «Файл оруулах» товчоор эхний хуулгаа оруулаарай</p>
        </div>
      )}

      {hasData && overview && (
        <>
          {/* Тойм карт — дарахад задаргаа руу */}
          <ToBreakdown>
            <SummaryCards
              totalIncome={overview.totalIncome}
              totalExpense={overview.totalExpense}
              balance={overview.balance}
              incomeCount={overview.incomeCount}
              expenseCount={overview.expenseCount}
            />
          </ToBreakdown>

          {/* Ангилаагүй гүйлгээний сэрэмжлүүлэг — задаргаанд ангилна */}
          {overview.uncategorizedCount > 0 && (
            <Link
              href="/breakdown"
              className="group flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {overview.uncategorizedCount} тодорхойгүй гүйлгээ
                </p>
                <p className="text-xs text-amber-700">Задаргаа цэсэд орж ангилна уу</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-amber-600 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {/* Сарын динамик — интерактив (жил сонгох, бүгдийг нэгтгэх, ангиллын pie) */}
          <MonthlyBarChart />

          {/* Гүйлгээний шинжилгээ — топ үзүүлэлт, дарахад бүрэн жагсаалт руу */}
          <ToBreakdown href="/insights">
            <CounterpartyInsights />
          </ToBreakdown>
        </>
      )}
    </AppShell>
  );
}
