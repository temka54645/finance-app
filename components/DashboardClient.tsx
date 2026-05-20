"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BarChart2, RefreshCw, Upload, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import SummaryCards from "@/components/SummaryCards";
import HighlightCards from "@/components/HighlightCards";
import UncategorizedSection from "@/components/UncategorizedSection";
import YearTimeline from "@/components/YearTimeline";
import UserMenu from "@/components/UserMenu";
import FeedbackButton from "@/components/FeedbackButton";
import CategoryPieChart from "@/components/CategoryPieChart";
import MonthlyChart from "@/components/MonthlyChart";

interface Highlight { amount: number; count: number }
interface CategoryItem { category: string; type: string; _sum: { amount: number }; _count: number }

interface OverviewReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  highlights: {
    bankFees: Highlight;
    salaryPaid: Highlight;
    taxes: Highlight;
    salaryReceived: Highlight;
  };
  uncategorizedCount: number;
  byCategory: CategoryItem[];
  availableYears: number[];
  yearly: { year: number; income: number; expense: number }[];
  monthly: { month: number; income: number; expense: number }[];
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ month: number; income: number; expense: number }[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setOverview(data);
      // Хамгийн сүүлийн жилийг default сонгоно (зөвхөн анх нэг удаа)
      if (data.availableYears?.length > 0) {
        setSelectedYear(prev => prev ?? data.availableYears[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (year: number) => {
    setMonthlyLoading(true);
    try {
      const res = await fetch(`/api/reports?year=${year}`);
      const data = await res.json();
      setMonthlyData(data.monthly ?? []);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (selectedYear) fetchMonthly(selectedYear);
  }, [selectedYear, fetchMonthly]);

  useEffect(() => {
    if (!uploadModalOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUploadModalOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [uploadModalOpen]);

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchOverview();
  };

  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "хэрэглэгч";
  const userType = (session?.user as { userType?: string } | undefined)?.userType === "business" ? "business" : "personal";
  const hasData = overview && overview.incomeCount + overview.expenseCount > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-300/30 blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl animate-float-slow" style={{ animationDelay: "-1.7s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="group flex items-center gap-3 min-w-0 rounded-xl px-1 py-0.5 -mx-1 transition-all duration-200 hover:bg-slate-100/60"
            title="Нүүр хуудас"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-blue-500/40 group-hover:-rotate-3">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 truncate">
                FinMate
              </h1>
              <p className="text-xs text-slate-500 truncate">Таны цахим санхүүгийн зөвлөх</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="rounded-lg p-2 text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-700 hover:scale-110 active:scale-95"
              title="Шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:brightness-110 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Файл оруулах</span>
            </button>
            {session?.user && (
              <UserMenu
                email={session.user.email ?? ""}
                name={session.user.name}
              />
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Greeting */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <p className="text-xs uppercase tracking-wider text-slate-400">Тойм</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Сайн байна уу,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              {displayName}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Таны цахим санхүүгийн зөвлөх бэлэн байна</p>
        </div>

        {/* Summary cards */}
        {hasData && overview && (
          <SummaryCards
            totalIncome={overview.totalIncome}
            totalExpense={overview.totalExpense}
            balance={overview.balance}
            incomeCount={overview.incomeCount}
            expenseCount={overview.expenseCount}
          />
        )}

        {/* Highlight cards */}
        {hasData && overview?.highlights && (
          <HighlightCards
            bankFees={overview.highlights.bankFees}
            salaryPaid={overview.highlights.salaryPaid}
            taxes={overview.highlights.taxes}
            salaryReceived={overview.highlights.salaryReceived}
          />
        )}

        {/* Charts section */}
        {hasData && overview && (
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                Ангиллын задаргаа
              </h3>
              <p className="mt-1 text-xs text-slate-500">Нийт оруулсан бүх өгөгдөл дээр суурилсан</p>
            </div>

            {/* Pie charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CategoryPieChart
                byCategory={overview.byCategory}
                type="income"
                title="Орлогын ангилал"
                userType={userType}
              />
              <CategoryPieChart
                byCategory={overview.byCategory}
                type="expense"
                title="Зарлагын ангилал"
                userType={userType}
              />
            </div>

            {/* Bar chart — сарын динамик */}
            {overview.availableYears.length > 0 && (
              <div>
                {/* Year tabs */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  <span className="text-xs text-slate-500 mr-2">Жил сонгох:</span>
                  {overview.availableYears.map(yr => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        selectedYear === yr
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {selectedYear && (
                  <div className="relative">
                    {monthlyLoading && (
                      <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <MonthlyChart year={selectedYear} monthly={monthlyData} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Uncategorized alert */}
        {overview && overview.uncategorizedCount > 0 && (
          <UncategorizedSection
            statementId=""
            count={overview.uncategorizedCount}
            onUpdate={fetchOverview}
          />
        )}

        {/* Year-by-year timeline */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Жил тус бүрийн задаргаа
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Жилийн мөр дээр дарж сар тус бүрийн дүнг нээх боломжтой
            </p>
          </div>
          <YearTimeline onChange={fetchOverview} />
        </section>
      </main>

      {/* Global upload modal */}
      {uploadModalOpen && (
        <>
          <div
            onClick={() => setUploadModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-fade-in"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-300/40 z-50 p-6 border border-slate-200 animate-pop-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Файл оруулах</h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              PDF, Excel (.xlsx) эсвэл CSV формат дэмжигдэнэ. Файл доторх гүйлгээ нь огнооны дагуу зөв сард байршина.
            </p>
            <FileUpload onSuccess={handleUploadSuccess} />
          </div>
        </>
      )}

      {/* Floating feedback button — always visible */}
      <FeedbackButton />
    </div>
  );
}
