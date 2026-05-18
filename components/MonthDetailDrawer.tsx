"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import SummaryCards from "./SummaryCards";
import TransactionTable from "./TransactionTable";
import UncategorizedSection from "./UncategorizedSection";

const MONTH_NAMES = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

interface Report {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  uncategorizedCount: number;
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
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onChange: () => void; // parent timeline-руу refetch trigger
}

export default function MonthDetailDrawer({ open, year, month, onClose, onChange }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `year=${year}&month=${month}`;
      const [r, t] = await Promise.all([
        fetch(`/api/reports?${qs}`).then(r => r.json()),
        fetch(`/api/transactions?${qs}`).then(r => r.json()),
      ]);
      setReport(r);
      setTransactions(t.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  // ESC дарж хаах
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const handleInternalUpdate = () => {
    fetchData();
    onChange();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[640px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 uppercase">Дэлгэрэнгүй</p>
            <h2 className="text-lg font-bold text-gray-900">
              {year} он · {MONTH_NAMES[month - 1]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Хаах"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && !report ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : report ? (
            <>
              <SummaryCards
                totalIncome={report.totalIncome}
                totalExpense={report.totalExpense}
                balance={report.balance}
                incomeCount={report.incomeCount}
                expenseCount={report.expenseCount}
              />

              {report.uncategorizedCount > 0 && (
                <UncategorizedSection
                  statementId=""
                  count={report.uncategorizedCount}
                  onUpdate={handleInternalUpdate}
                />
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Гүйлгээ</h3>
                <TransactionTable transactions={transactions} onUpdate={handleInternalUpdate} />
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-10">Мэдээлэл олдсонгүй</p>
          )}
        </div>
      </aside>
    </>
  );
}
