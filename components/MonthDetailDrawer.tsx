"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import SummaryCards from "./SummaryCards";
import UncategorizedSection from "./UncategorizedSection";
import TransactionTable from "./TransactionTable";

interface Highlight { amount: number; count: number }

interface Report {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  uncategorizedCount: number;
  highlights: {
    bankFees: Highlight;
    salaryPaid: Highlight;
    taxes: Highlight;
    salaryReceived: Highlight;
  };
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName: string; bankName?: string | null };
}

interface Props {
  year: number;
  month: number;
  onClose: () => void;
  onUpdate: () => void;
}

const MONTH_NAMES = [
  "1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар",
  "7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар",
];

export default function MonthDetailDrawer({ year, month, onClose, onUpdate }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/reports?year=${year}&month=${month}`),
        fetch(`/api/transactions?year=${year}&month=${month}`),
      ]);
      const [rData, tData] = await Promise.all([rRes.json(), tRes.json()]);
      setReport(rData);
      setTransactions(tData.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
    // Trigger slide-in animation
    requestAnimationFrame(() => setMounted(true));
  }, [fetchData]);

  // ESC to close
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const handleUpdate = () => {
    fetchData();
    onUpdate();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 motion-reduce:transition-none ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-50 z-50 shadow-2xl shadow-slate-900/20 flex flex-col transition-transform duration-300 motion-reduce:transition-none ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Дэлгэрэнгүй</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {year} оны {MONTH_NAMES[month - 1]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {report && (
                <SummaryCards
                  totalIncome={report.totalIncome}
                  totalExpense={report.totalExpense}
                  balance={report.balance}
                  incomeCount={report.incomeCount}
                  expenseCount={report.expenseCount}
                />
              )}

              {report && report.uncategorizedCount > 0 && (
                <UncategorizedSection
                  statementId=""
                  count={report.uncategorizedCount}
                  onUpdate={handleUpdate}
                />
              )}

              <TransactionTable
                transactions={transactions}
                onUpdate={handleUpdate}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
