"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import AppShell from "@/components/AppShell";
import SummaryCards from "@/components/SummaryCards";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import CounterpartyInsights from "@/components/CounterpartyInsights";
import DashboardHeadline, { type PeriodOverPeriod, type PeriodPoint } from "@/components/DashboardHeadline";
import CategorizationCoverage from "@/components/CategorizationCoverage";
import PerAccountBreakdown, { type AccountRow } from "@/components/PerAccountBreakdown";
import MissingDataSection from "@/components/MissingDataSection";
import { useDataRefresh } from "@/lib/use-data-refresh";

interface OverviewReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  uncategorizedCount: number;
}

interface DashboardData {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  cashBalance: number | null;
  hasClosingBalance: boolean;
  avgMonthlyOutflow: number;
  monthsWithData: number;
  runwayMonths: number | null;
  coverage: {
    total: number;
    categorized: number;
    uncategorizedCount: number;
    uncategorizedAmount: number;
    pct: number;
  };
  perAccount: AccountRow[];
  periodOverPeriod: PeriodOverPeriod | null;
  periodSeries?: PeriodPoint[];
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const fetchAll = useCallback(async () => {
    const [reports, dash] = await Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/dashboard").then(r => r.json()),
    ]);
    setOverview(reports);
    setDashboard(dash && !dash.error ? dash : null);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useDataRefresh(fetchAll);

  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "хэрэглэгч";
  const hasData = overview && overview.incomeCount + overview.expenseCount > 0;
  const lowCoverage = dashboard ? dashboard.coverage.pct < 80 : false;

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
          Карт бүрийн «Задаргаа» товчоор гүйлгээний дэлгэрэнгүйг харна уу
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
          {/* Гол үзүүлэлт — том тоо, чиг хандлагын сум, эгзэгтэй төлвийг улаанаар */}
          {dashboard && (
            <DashboardHeadline
              cashBalance={dashboard.cashBalance}
              hasClosingBalance={dashboard.hasClosingBalance}
              netCashFlow={dashboard.netCashFlow}
              runwayMonths={dashboard.runwayMonths}
              avgMonthlyOutflow={dashboard.avgMonthlyOutflow}
              accountCount={dashboard.perAccount.length}
              periodOverPeriod={dashboard.periodOverPeriod}
              periodSeries={dashboard.periodSeries}
            />
          )}

          {/* Тойм карт — карт бүр өөрийн задаргаа руу холбогдоно */}
          <SummaryCards
            totalIncome={overview.totalIncome}
            totalExpense={overview.totalExpense}
            balance={overview.balance}
            incomeCount={overview.incomeCount}
            expenseCount={overview.expenseCount}
            breakdownLinks
          />

          {/* Ангиллын хамрах хүрээ — ангилаагүй дүн/тоо + бүрэн бус бол сэрэмжлүүлэг */}
          {dashboard && (
            <CategorizationCoverage
              total={dashboard.coverage.total}
              categorized={dashboard.coverage.categorized}
              uncategorizedCount={dashboard.coverage.uncategorizedCount}
              uncategorizedAmount={dashboard.coverage.uncategorizedAmount}
              pct={dashboard.coverage.pct}
            />
          )}

          {/* Сарын динамик — интерактив (жил сонгох, бүгдийг нэгтгэх, ангиллын pie) */}
          <MonthlyBarChart lowCoverage={lowCoverage} uncategorizedCount={dashboard?.coverage.uncategorizedCount ?? 0} />

          {/* Данс тус бүрийн үлдэгдэл ба гүйлгээний задаргаа */}
          {dashboard && <PerAccountBreakdown accounts={dashboard.perAccount} />}

          {/* Харьцагчийн 4 үзүүлэлт — бүх хугацаагаар */}
          <CounterpartyInsights />

          {/* Нэмэлт өгөгдөл шаардсан санхүүгийн харьцаанууд */}
          <MissingDataSection />
        </>
      )}
    </AppShell>
  );
}
