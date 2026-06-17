"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { getBankMeta, UNKNOWN_BANK } from "@/lib/bankMeta";

interface Transaction {
  amount: number;
  type: string;
  statement?: { bankName?: string | null };
}

interface Props {
  transactions: Transaction[];
}

interface BankStat {
  bankKey: string;     // grouping key (lowercased bankName or "unknown")
  bankName: string | null;
  income: number;
  expense: number;
  count: number;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function BankBreakdownCards({ transactions }: Props) {
  const stats = useMemo<BankStat[]>(() => {
    const map = new Map<string, BankStat>();
    for (const t of transactions) {
      const raw = t.statement?.bankName?.trim() || null;
      const key = raw ? raw.toLowerCase() : "unknown";
      let s = map.get(key);
      if (!s) {
        s = { bankKey: key, bankName: raw, income: 0, expense: 0, count: 0 };
        map.set(key, s);
      }
      if (t.type === "income") s.income += t.amount;
      else s.expense += t.amount;
      s.count += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.income + b.expense) - (a.income + a.expense)
    );
  }, [transactions]);

  // Зөвхөн нэг л банк байгаа бол breakdown харуулах шаардлагагүй
  if (stats.length <= 1) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">
          Банкаар задаргаа
        </h3>
        <span className="text-xs text-slate-400">· {stats.length} банк</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map(s => {
          const meta = s.bankName ? getBankMeta(s.bankName) : UNKNOWN_BANK;
          const balance = s.income - s.expense;
          return (
            <div
              key={s.bankKey}
              className={`rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-shadow hover:shadow-md`}
            >
              {/* Bank header */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.className}`}
                  title={meta.fullName}
                >
                  <Landmark className="h-3 w-3" />
                  {meta.shortName}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">{s.count} гүйлгээ</span>
              </div>

              {/* Income / Expense */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    Орлого
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-600">
                    +{fmt(s.income)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                    Зарлага
                  </span>
                  <span className="tabular-nums font-semibold text-rose-600">
                    −{fmt(s.expense)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs font-medium text-slate-600">Баланс</span>
                  <span className={`tabular-nums font-bold ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {balance >= 0 ? "+" : "−"}{fmt(Math.abs(balance))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
