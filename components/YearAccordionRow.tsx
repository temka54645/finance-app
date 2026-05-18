"use client";

import { ChevronRight } from "lucide-react";
import MonthRow from "./MonthRow";

interface Month {
  month: number;
  income: number;
  expense: number;
  txCount: number;
}

interface Props {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  months: Month[];
  expanded: boolean;
  onToggle: () => void;
  onOpenDetail: (year: number, month: number) => void;
  onUploadSuccess: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function YearAccordionRow({
  year, totalIncome, totalExpense, balance, txCount, months,
  expanded, onToggle, onOpenDetail, onUploadSuccess,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Year header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <div className="flex-1 text-left">
          <h2 className="text-lg font-bold text-gray-900">{year} он</h2>
          <p className="text-xs text-gray-400">{txCount} нийт гүйлгээ</p>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase text-gray-400 font-medium">Орлого</p>
            <p className="text-sm font-bold text-green-600 tabular-nums">+{fmt(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-gray-400 font-medium">Зарлага</p>
            <p className="text-sm font-bold text-red-600 tabular-nums">−{fmt(totalExpense)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-gray-400 font-medium">Үлдэгдэл</p>
            <p className={`text-sm font-bold tabular-nums ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {balance >= 0 ? "+" : ""}{fmt(balance)}
            </p>
          </div>
        </div>
      </button>

      {/* Mobile stats (below header) */}
      <div className="sm:hidden flex items-center justify-around px-4 pb-3 -mt-2 text-xs">
        <span className="text-green-600 font-semibold">+{fmt(totalIncome)}</span>
        <span className="text-red-600 font-semibold">−{fmt(totalExpense)}</span>
        <span className={`font-semibold ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
          ⚖ {fmt(balance)}
        </span>
      </div>

      {/* Months (accordion body — grid trick for animated height) */}
      <div
        className={`grid transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-2 py-2 bg-gray-50/50 space-y-0.5">
            {months.map(m => (
              <MonthRow
                key={m.month}
                year={year}
                month={m.month}
                income={m.income}
                expense={m.expense}
                txCount={m.txCount}
                onOpenDetail={onOpenDetail}
                onUploadSuccess={onUploadSuccess}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
