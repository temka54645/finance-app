"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

type Accent = "emerald" | "rose" | "blue" | "orange";

const PALETTES: Record<Accent, { ring: string; chip: string; value: string }> = {
  emerald: {
    ring: "from-emerald-300/40 to-emerald-300/0",
    chip: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  rose: {
    ring: "from-rose-300/40 to-rose-300/0",
    chip: "bg-rose-100 text-rose-700",
    value: "text-rose-700",
  },
  blue: {
    ring: "from-blue-300/40 to-blue-300/0",
    chip: "bg-blue-100 text-blue-700",
    value: "text-blue-700",
  },
  orange: {
    ring: "from-orange-300/40 to-orange-300/0",
    chip: "bg-orange-100 text-orange-700",
    value: "text-orange-700",
  },
};

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  accent: Accent;
}) {
  const p = PALETTES[accent];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-radial ${p.ring} opacity-80 blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.chip}`}>
          {icon}
        </span>
      </div>
      <p className={`relative mt-3 text-2xl font-semibold tabular-nums ${p.value}`}>{value}</p>
      <p className="relative mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export default function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  incomeCount,
  expenseCount,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Нийт орлого"
        value={`+${fmt(totalIncome)}`}
        sub={`${incomeCount} гүйлгээ`}
        icon={<TrendingUp className="h-4 w-4" />}
        accent="emerald"
      />
      <StatCard
        label="Нийт зарлага"
        value={`−${fmt(totalExpense)}`}
        sub={`${expenseCount} гүйлгээ`}
        icon={<TrendingDown className="h-4 w-4" />}
        accent="rose"
      />
      <StatCard
        label="Үлдэгдэл"
        value={`${balance >= 0 ? "+" : "−"}${fmt(Math.abs(balance))}`}
        sub={balance >= 0 ? "Ашигтай" : "Алдагдалтай"}
        icon={<Wallet className="h-4 w-4" />}
        accent={balance >= 0 ? "blue" : "orange"}
      />
    </div>
  );
}
