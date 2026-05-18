"use client";

import { Banknote, Users, Receipt, Briefcase } from "lucide-react";
import type { ReactNode } from "react";

interface HighlightItem {
  amount: number;
  count: number;
}

interface Props {
  bankFees: HighlightItem;
  salaryPaid: HighlightItem;
  taxes: HighlightItem;
  salaryReceived: HighlightItem;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

type Accent = "amber" | "purple" | "blue" | "emerald";

const PALETTES: Record<Accent, string> = {
  amber:   "bg-amber-100 text-amber-700 border-amber-200",
  purple:  "bg-purple-100 text-purple-700 border-purple-200",
  blue:    "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function Highlight({
  label,
  amount,
  count,
  icon,
  accent,
}: {
  label: string;
  amount: number;
  count: number;
  icon: ReactNode;
  accent: Accent;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 transition-colors hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${PALETTES[accent]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold tabular-nums text-slate-900">{fmt(amount)}</p>
      <p className="mt-0.5 text-xs text-slate-500">{count} гүйлгээ</p>
    </div>
  );
}

export default function HighlightCards({
  bankFees,
  salaryPaid,
  taxes,
  salaryReceived,
}: Props) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          Анхаарах дүнгүүд
        </h3>
        <p className="mt-1 text-xs text-slate-500">Хамгийн их давтамжтай ангилал</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Highlight
          label="Банкны шимтгэл"
          amount={bankFees.amount}
          count={bankFees.count}
          icon={<Receipt className="h-4 w-4" />}
          accent="amber"
        />
        <Highlight
          label="Цалин зарлага"
          amount={salaryPaid.amount}
          count={salaryPaid.count}
          icon={<Users className="h-4 w-4" />}
          accent="purple"
        />
        <Highlight
          label="Татвар"
          amount={taxes.amount}
          count={taxes.count}
          icon={<Briefcase className="h-4 w-4" />}
          accent="blue"
        />
        <Highlight
          label="Цалин (орлого)"
          amount={salaryReceived.amount}
          count={salaryReceived.count}
          icon={<Banknote className="h-4 w-4" />}
          accent="emerald"
        />
      </div>
    </section>
  );
}
