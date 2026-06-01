"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import TransactionTable from "@/components/TransactionTable";
import { emitDataChanged, useDataRefresh } from "@/lib/use-data-refresh";

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
  /** Энэ харьцагчийн ангилагдаагүй гүйлгээний тоо (>0 бол тодотгоно). */
  uncatCount: number;
}

interface InsightsData {
  topIncome: { counterparty: string; total: number; count: number; uncatCount: number }[];
  topExpense: { counterparty: string; total: number; count: number; uncatCount: number }[];
  mostFrequent: { counterparty: string; count: number; total: number; uncatCount: number }[];
  largestParties: { counterparty: string; max: number; count: number; uncatCount: number }[];
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

function toRows(metric: Metric, data: InsightsData): PartyRow[] {
  switch (metric) {
    case "income":
      return data.topIncome.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.total),
        secondary: `${r.count} гүйлгээ`,
        uncatCount: r.uncatCount,
      }));
    case "expense":
      return data.topExpense.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.total),
        secondary: `${r.count} гүйлгээ`,
        uncatCount: r.uncatCount,
      }));
    case "frequent":
      return data.mostFrequent.map(r => ({
        counterparty: r.counterparty,
        primary: `${r.count} удаа`,
        secondary: fmt(r.total),
        uncatCount: r.uncatCount,
      }));
    case "largest":
      return data.largestParties.map(r => ({
        counterparty: r.counterparty,
        primary: fmt(r.max),
        secondary: `${r.count} гүйлгээ`,
        uncatCount: r.uncatCount,
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
  const openRef = useRef<string | null>(null);
  useEffect(() => { openRef.current = open; }, [open]);

  const scopeQs = useCallback(() => {
    const qs = new URLSearchParams();
    if (typeof year === "number") qs.set("year", String(year));
    if (typeof month === "number") qs.set("month", String(month));
    return qs;
  }, [year, month]);

  // Хүрээ (үзүүлэлт/жил/сар) солигдоход дэлгээстэй мөр болон кэшийг шинэчилнэ.
  useEffect(() => {
    setOpen(null);
    setTxCache({});
  }, [metric, year, month]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = scopeQs();
      qs.set("full", "1");
      const res = await fetch(`/api/insights/counterparties?${qs.toString()}`);
      const data: InsightsData = await res.json();
      setRows(toRows(metric, data));
    } finally {
      setLoading(false);
    }
  }, [metric, scopeQs]);

  useEffect(() => { fetchList(); }, [fetchList]);

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

  // Дата шинэчлэгдвэл (категори өөрчлөгдөх г.м) жагсаалт + дэлгээстэй мөрийг
  // дахин ачаална — задаргааг хаалгүйгээр.
  const refresh = useCallback(async () => {
    await fetchList();
    const cur = openRef.current;
    if (cur) loadTx(cur);
  }, [fetchList, loadTx]);
  useDataRefresh(refresh);

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
        const flagged = r.uncatCount > 0;
        return (
          <li key={r.counterparty} className={flagged ? "border-l-2 border-amber-400 bg-amber-50/50" : ""}>
            <button
              onClick={() => toggle(r.counterparty)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  flagged ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-slate-800" title={r.counterparty}>
                  {r.counterparty}
                </span>
                {flagged && (
                  <span
                    className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                    title={`${r.uncatCount} гүйлгээ ангилагдаагүй — дүн бүрэн бус байж болзошгүй. Дэлгэж ангилна уу.`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {r.uncatCount} ангилаагүй
                  </span>
                )}
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
              <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4">
                {txLoading === r.counterparty && !txs ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : txs ? (
                  <TransactionTable
                    transactions={txs}
                    onUpdate={emitDataChanged}
                    initialType={metricType ?? "all"}
                  />
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
