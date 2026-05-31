"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import UncategorizedSection from "@/components/UncategorizedSection";
import TransactionTable from "@/components/TransactionTable";
import { emitDataChanged, useDataRefresh } from "@/lib/use-data-refresh";

interface Transaction {
  id: string;
  date: string;
  description: string;
  counterparty?: string | null;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName: string; bankName?: string | null };
}

const MONTHS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

interface Props {
  initialType?: "all" | "income" | "expense";
}

export default function BreakdownClient({ initialType = "all" }: Props) {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | "all">("all");
  const [month, setMonth] = useState<number | "all">("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (year !== "all") qs.set("year", String(year));
      if (year !== "all" && month !== "all") qs.set("month", String(month));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const [reports, txs] = await Promise.all([
        fetch(`/api/reports${suffix}`).then(r => r.json()),
        fetch(`/api/transactions${suffix}`).then(r => r.json()),
      ]);
      // availableYears нь шүүлтээс үл хамаарч бүх жилийг буцаадаг
      setYears(reports.availableYears ?? []);
      setUncategorizedCount(reports.uncategorizedCount ?? 0);
      setTransactions(txs.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataRefresh(fetchData);

  const selectYear = (y: number | "all") => {
    setYear(y);
    setMonth("all"); // жил солих үед сарын шүүлтийг буцаана
  };

  const scopedYear = year !== "all" ? year : undefined;
  const scopedMonth = year !== "all" && month !== "all" ? month : undefined;

  return (
    <AppShell>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">Задаргаа</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Гүйлгээний задаргаа
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Жил, сараар шүүж бүх гүйлгээг харах, олноор сонгож ангилахад зориулсан
        </p>
      </div>

      {/* Жил / сарын шүүлт */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Жил:</span>
          <button
            onClick={() => selectYear("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              year === "all" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Бүгд
          </button>
          {years.map(y => (
            <button
              key={y}
              onClick={() => selectYear(y)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                year === y ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Сар — зөвхөн тодорхой жил сонгосон үед */}
        {year !== "all" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Сар:</span>
            <button
              onClick={() => setMonth("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                month === "all" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Бүгд
            </button>
            {MONTHS.map((label, i) => {
              const m = i + 1;
              return (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    month === m ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Ангилаагүй гүйлгээ — сонгосон хугацааны хүрээнд */}
      {uncategorizedCount > 0 && (
        <UncategorizedSection
          statementId=""
          count={uncategorizedCount}
          onUpdate={emitDataChanged}
          year={scopedYear}
          month={scopedMonth}
        />
      )}

      {/* Бүх гүйлгээ — шүүж, олноор сонгож ангилна */}
      <section>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <TransactionTable
            transactions={transactions}
            onUpdate={emitDataChanged}
            initialType={initialType}
          />
        )}
      </section>
    </AppShell>
  );
}
