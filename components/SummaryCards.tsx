"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import FormulaTip from "@/components/FormulaTip";

interface Props {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  /** Карт бүр дээр "Задаргаа" холбоос харуулах эсэх (зөвхөн хяналтын самбар). */
  breakdownLinks?: boolean;
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
  href,
  formula,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  accent: Accent;
  /** Өгвөл картын доор задаргаа руу шилжих товч харагдана. */
  href?: string;
  /** Тухайн дүнгийн тооцооллын томьёо (ⓘ tooltip). */
  formula: string;
}) {
  const p = PALETTES[accent];
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-0.5">
      {/* Гоёлын radial ring — зөвхөн энэ давхаргыг л таслана (tooltip-д саад болохгүй) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-radial ${p.ring} opacity-80 blur-2xl transition-transform duration-500 group-hover:scale-110`} />
      </div>
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <FormulaTip text={formula} />
        </div>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.chip}`}>
          {icon}
        </span>
      </div>
      <p className={`relative mt-3 text-2xl font-semibold tabular-nums ${p.value}`}>{value}</p>
      <p className="relative mt-2 text-xs text-slate-500">{sub}</p>
      {href && (
        <Link
          href={href}
          className="relative mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-900 hover:text-white"
        >
          Задаргаа
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  incomeCount,
  expenseCount,
  breakdownLinks = false,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Нийт орлого"
        value={`+${fmt(totalIncome)}`}
        sub={`${incomeCount} гүйлгээ`}
        icon={<TrendingUp className="h-4 w-4" />}
        accent="emerald"
        href={breakdownLinks ? "/breakdown?type=income" : undefined}
        formula={`Бүх «орлого» төрлийн гүйлгээний дүнгийн нийлбэр.\nΣ ${incomeCount} гүйлгээ = ${fmt(totalIncome)}`}
      />
      <StatCard
        label="Нийт зарлага"
        value={`−${fmt(totalExpense)}`}
        sub={`${expenseCount} гүйлгээ`}
        icon={<TrendingDown className="h-4 w-4" />}
        accent="rose"
        href={breakdownLinks ? "/breakdown?type=expense" : undefined}
        formula={`Бүх «зарлага» төрлийн гүйлгээний дүнгийн нийлбэр.\nΣ ${expenseCount} гүйлгээ = ${fmt(totalExpense)}`}
      />
      <StatCard
        label="Үлдэгдэл"
        value={`${balance >= 0 ? "+" : "−"}${fmt(Math.abs(balance))}`}
        sub={balance >= 0 ? "Ашигтай" : "Алдагдалтай"}
        icon={<Wallet className="h-4 w-4" />}
        accent={balance >= 0 ? "blue" : "orange"}
        href={breakdownLinks ? "/breakdown" : undefined}
        formula={`Нийт орлого − Нийт зарлага.\n${fmt(totalIncome)} − ${fmt(totalExpense)} = ${balance >= 0 ? "+" : "−"}${fmt(Math.abs(balance))}`}
      />
    </div>
  );
}
