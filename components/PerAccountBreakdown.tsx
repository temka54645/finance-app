"use client";

import { Landmark } from "lucide-react";

export interface AccountRow {
  bank: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  closingBalance: number | null;
  periodEnd: string | null;
}

interface Props {
  accounts: AccountRow[];
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
}

export default function PerAccountBreakdown({ accounts }: Props) {
  if (accounts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Данс тус бүрийн задаргаа</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3 font-medium">Данс</th>
              <th className="py-2 px-3 text-right font-medium">Үлдэгдэл</th>
              <th className="py-2 px-3 text-right font-medium">Орлого</th>
              <th className="py-2 px-3 text-right font-medium">Зарлага</th>
              <th className="py-2 px-3 text-right font-medium">Цэвэр</th>
              <th className="py-2 pl-3 text-right font-medium">Гүйлгээ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <tr key={a.bank} className="hover:bg-slate-50">
                <td className="py-2.5 pr-3 font-medium text-slate-800">{a.bank}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                  {a.closingBalance !== null ? fmt(a.closingBalance) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600">{fmt(a.income)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">{fmt(a.expense)}</td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${a.net >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                  {fmtSigned(a.net)}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-slate-500">{a.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
