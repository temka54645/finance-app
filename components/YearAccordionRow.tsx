"use client";

import { ChevronDown } from "lucide-react";
import MonthRow from "./MonthRow";

interface MonthData {
  month: number;
  income: number;
  expense: number;
  txCount: number;
}

interface YearData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  months: MonthData[];
}

interface Props {
  data: YearData;
  isOpen: boolean;
  onToggle: () => void;
  onOpenDetail: (year: number, month: number) => void;
  onUploaded: () => void;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function YearAccordionRow({ data, isOpen, onToggle, onOpenDetail, onUploaded }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Year header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <ChevronDown
          className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-300 motion-reduce:transition-none ${
            isOpen ? "rotate-0" : "-rotate-90"
          }`}
        />

        <span className="text-base font-semibold text-slate-900 w-16 flex-shrink-0">
          {data.year}
        </span>

        <span className="text-xs text-slate-400 flex-shrink-0">{data.txCount} гүйлгээ</span>

        <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            +{fmt(data.totalIncome)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
            −{fmt(data.totalExpense)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            data.balance >= 0
              ? "bg-blue-50 text-blue-700 ring-blue-200"
              : "bg-orange-50 text-orange-700 ring-orange-200"
          }`}>
            ⚖ {data.balance >= 0 ? "+" : "−"}{fmt(Math.abs(data.balance))}
          </span>
        </div>
      </button>

      {/* Animated body using grid trick */}
      <div
        className="grid transition-all duration-300 motion-reduce:transition-none"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-2 py-2 space-y-0.5">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-1 text-xs uppercase tracking-wide text-slate-400 font-medium">
              <span className="w-20 flex-shrink-0">Сар</span>
              <span className="w-32 text-right">Орлого</span>
              <span className="w-32 text-right">Зарлага</span>
              <span className="flex-1 text-right">Баланс</span>
              <span className="w-16 text-right"></span>
              <span className="w-16 flex-shrink-0"></span>
            </div>
            {data.months.map(m => (
              <MonthRow
                key={m.month}
                year={data.year}
                data={m}
                onOpenDetail={onOpenDetail}
                onUploaded={onUploaded}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
