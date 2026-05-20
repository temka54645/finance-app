"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import BankBadge from "./BankBadge";

interface BankData {
  bankName: string | null;
  income: number;
  expense: number;
  txCount: number;
}

interface MonthData {
  month: number;
  income: number;
  expense: number;
  txCount: number;
  banks?: BankData[];
}

interface Props {
  year: number;
  data: MonthData;
}

const MONTH_NAMES = [
  "1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар",
  "7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар",
];

function fmt(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function MonthRow({ year, data }: Props) {
  const hasData = data.txCount > 0;
  const balance = data.income - data.expense;
  const banks = data.banks ?? [];

  const row = (
    <>
      <span className="w-20 flex-shrink-0 text-sm font-medium text-slate-700">
        {MONTH_NAMES[data.month - 1]}
      </span>

      <span className={`w-32 text-right text-sm tabular-nums ${hasData && data.income > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
        {hasData && data.income > 0 ? "+" + fmt(data.income) : "—"}
      </span>

      <span className={`w-32 text-right text-sm tabular-nums ${hasData && data.expense > 0 ? "text-rose-600 font-medium" : "text-slate-400"}`}>
        {hasData && data.expense > 0 ? "−" + fmt(data.expense) : "—"}
      </span>

      <span className={`flex-1 text-right text-sm tabular-nums font-medium ${
        !hasData ? "text-slate-400" :
        balance >= 0 ? "text-blue-600" : "text-orange-600"
      }`}>
        {hasData ? (balance >= 0 ? "+" : "−") + fmt(Math.abs(balance)) : "—"}
      </span>

      <span className="text-xs text-slate-400 w-20 text-right">
        {hasData ? `${data.txCount} гүйлгээ` : ""}
      </span>

      {/* Банкны badge-ууд — энэ сард гүйлгээтэй банкууд */}
      <span className="hidden lg:flex w-40 flex-shrink-0 pl-2 items-center gap-1 flex-wrap">
        {banks.slice(0, 3).map((b, i) => (
          <BankBadge key={i} bankName={b.bankName} size="sm" />
        ))}
        {banks.length > 3 && (
          <span className="text-[10px] text-slate-400 font-medium">+{banks.length - 3}</span>
        )}
      </span>

      <span className="flex-shrink-0 w-8 flex items-center justify-end">
        {hasData && (
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        )}
      </span>
    </>
  );

  if (!hasData) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 opacity-50">
        {row}
      </div>
    );
  }

  return (
    <Link
      href={`/y/${year}/${data.month}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors hover:bg-blue-50"
      title={banks.length > 1 ? `${banks.length} банкны гүйлгээ — дарж дэлгэрэнгүй харна уу` : undefined}
    >
      {row}
    </Link>
  );
}
