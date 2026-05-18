"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { BarChart2, RefreshCw, Upload, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import HighlightCards from "@/components/HighlightCards";
import UncategorizedSection from "@/components/UncategorizedSection";
import YearTimeline from "@/components/YearTimeline";
import UserMenu from "@/components/UserMenu";

interface Highlight { amount: number; count: number }

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
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function Home() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      // year-гүй → all-time
      const res = await fetch("/api/reports");
      const data = await res.json();
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ESC дарж upload modal-ийг хаах
  useEffect(() => {
    if (!uploadModalOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUploadModalOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [uploadModalOpen]);

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchOverview();
    // YearTimeline дотроосоо refetch хийнэ (onChange→handleRefetch)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">Санхүүгийн дүн шинжилгээ</h1>
              <p className="text-xs text-gray-500 truncate">Банкны хуулга задлан шинжилгээ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Файл оруулах</span>
            </button>
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Шинэчлэх"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Overall summary stat strip */}
        {overview && overview.incomeCount + overview.expenseCount > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-green-200 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase text-green-700 font-semibold">Нийт орлого</p>
              <p className="text-lg font-bold text-green-700 tabular-nums">+{fmt(overview.totalIncome)}</p>
              <p className="text-[10px] text-green-600/70 mt-0.5">{overview.incomeCount} гүйлгээ</p>
            </div>
            <div className="bg-white border border-red-200 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase text-red-700 font-semibold">Нийт зарлага</p>
              <p className="text-lg font-bold text-red-700 tabular-nums">−{fmt(overview.totalExpense)}</p>
              <p className="text-[10px] text-red-600/70 mt-0.5">{overview.expenseCount} гүйлгээ</p>
            </div>
            <div className={`bg-white border rounded-xl px-4 py-3 ${
              overview.balance >= 0 ? "border-blue-200" : "border-orange-200"
            }`}>
              <p className={`text-[10px] uppercase font-semibold ${
                overview.balance >= 0 ? "text-blue-700" : "text-orange-700"
              }`}>Үлдэгдэл</p>
              <p className={`text-lg font-bold tabular-nums ${
                overview.balance >= 0 ? "text-blue-700" : "text-orange-700"
              }`}>{overview.balance >= 0 ? "+" : ""}{fmt(overview.balance)}</p>
              <p className={`text-[10px] mt-0.5 ${
                overview.balance >= 0 ? "text-blue-600/70" : "text-orange-600/70"
              }`}>{overview.balance >= 0 ? "Ашигтай" : "Алдагдалтай"}</p>
            </div>
          </div>
        )}

        {overview?.highlights && overview.incomeCount + overview.expenseCount > 0 && (
          <HighlightCards
            bankFees={overview.highlights.bankFees}
            salaryPaid={overview.highlights.salaryPaid}
            taxes={overview.highlights.taxes}
            salaryReceived={overview.highlights.salaryReceived}
          />
        )}

        {overview && overview.uncategorizedCount > 0 && (
          <UncategorizedSection
            statementId=""
            count={overview.uncategorizedCount}
            onUpdate={fetchOverview}
          />
        )}

        {/* Гол YearTimeline */}
        <YearTimeline onChange={fetchOverview} />
      </main>

      {/* Global upload modal */}
      {uploadModalOpen && (
        <>
          <div
            onClick={() => setUploadModalOpen(false)}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Файл оруулах</h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              PDF, Excel (.xlsx) эсвэл CSV формат дэмжигдэнэ. Файл доторх гүйлгээ нь огнооны дагуу зөв сард байршина.
            </p>
            <FileUpload onSuccess={handleUploadSuccess} />
          </div>
        </>
      )}
    </div>
  );
}
