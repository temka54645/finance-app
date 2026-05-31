"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useDataRefresh } from "@/lib/use-data-refresh";

export type Metric = "income" | "expense" | "largest" | "frequent";

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

interface PartyRow {
  counterparty: string;
  primary: string;
  secondary: string;
}

interface InsightsData {
  topIncome: { counterparty: string; total: number; count: number }[];
  topExpense: { counterparty: string; total: number; count: number }[];
  mostFrequent: { counterparty: string; count: number; total: number }[];
  largestParties: { counterparty: string; max: number; count: number }[];
}

export const METRIC_META: Record<Metric, { label: string; type?: "income" | "expense" }> = {
  income: { label: "Топ орлого", type: "income" },
  expense: { label: "Топ зарлага", type: "expense" },
  largest: { label: "Өндөр дүнтэй" },
  frequent: { label: "Давтамжтай" },
};

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

function fmtDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function toRows(metric: Metric, data: InsightsData): PartyRow[] {
  switch (metric) {
    case "income":
      return data.topIncome.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.total),
        secondary: `${r.count} гүйлгээ`,
      }));
    case "expense":
      return data.topExpense.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.total),
        secondary: `${r.count} гүйлгээ`,
      }));
    case "frequent":
      return data.mostFrequent.map(r => ({
        counterparty: r.counterparty,
        primary: `${r.count} удаа`,
        secondary: fmt(r.total),
      }));
    case "largest":
      return data.largestParties.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.max),
        secondary: `${r.count} гүйлгээ`,
      }));
  }
}

interface Props {
  metric: Metric;
  year?: number;
  month?: number;
}

export default function CounterpartyDrilldown({ metric, year, month }: Props) {
  const metricType = METRIC_META[metric].type;
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Сонгосон (дэлгэсэн) харьцагч + түүний гүйлгээний кэш — зөвхөн сонгоход татна.
  const [open, setOpen] = useState<string | null>(null);
  const [txCache, setTxCache] = useState<Record<string, Transaction[]>>({});
  const [txLoading, setTxLoading] = useState<string | null>(null);

  const scopeQs = useCallback(() => {
    const qs = new URLSearchParams();
    if (typeof year === "number") qs.set("year", String(year));
    if (typeof month === "number") qs.set("month", String(month));
    return qs;
  }, [year, month]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = scopeQs();
      qs.set("full", "1");
      const res = await fetch(`/api/insights/counterparties?${qs.toString()}`);
      const data: InsightsData = await res.json();
      setRows(toRows(metric, data));
      setOpen(null);
      setTxCache({});
    } finally {
      setLoading(false);
    }
  }, [metric, scopeQs]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useDataRefresh(fetchList);

  const loadTx = useCallback(async (counterparty: string) => {
    setTxLoading(counterparty);
    try {
      const qs = scopeQs();
      qs.set("counterparty", counterparty);
      if (metricType) qs.set("type", metricType);
      const res = await fetch(`/api/transactions?${qs.toString()}`);
      const json = await res.json();
      let txs: Transaction[] = json.transactions ?? [];
      // "largest" — нэг удаагийн дүнгээр эрэмбэлж харуулна.
      if (metric === "largest") {
        txs = [...txs].sort((a, b) => b.amount - a.amount);
      }
      setTxCache(prev => ({ ...prev, [counterparty]: txs }));
    } finally {
      setTxLoading(null);
    }
  }, [scopeQs, metricType, metric]);

  const toggle = (counterparty: string) => {
    if (open === counterparty) {
      setOpen(null);
      return;
    }
    setOpen(counterparty);
    if (!txCache[counterparty]) loadTx(counterparty);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-500">Мэдээлэл алга</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {rows.map((r, i) => {
        const isOpen = open === r.counterparty;
        const txs = txCache[r.counterparty];
        return (
          <li key={r.counterparty}>
            <button
              onClick={() => toggle(r.counterparty)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={r.counterparty}>
                {r.counterparty}
              </span>
              <span className="flex-shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-slate-900">{r.primary}</span>
                <span className="block text-[10px] text-slate-400">{r.secondary}</span>
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                {txLoading === r.counterparty && !txs ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : txs && txs.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {txs.map(t => (
                      <li key={t.id} className="flex items-center gap-3 py-2">
                        <span className="flex-shrink-0">
                          {t.type === "income" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-rose-500" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-700" title={t.description}>
                            {t.description || "Гүйлгээ"}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {fmtDate(t.date)}
                            {t.category ? ` · ${t.category}` : ""}
                            {t.statement?.bankName ? ` · ${t.statement.bankName}` : ""}
                          </span>
                        </span>
                        <span
                          className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                            t.type === "income" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {fmt(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400">Гүйлгээ олдсонгүй</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
