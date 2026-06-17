"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MonthlyDatum {
  month: number;
  income: number;
  expense: number;
}

interface Props {
  year: number;
  monthly: MonthlyDatum[];
}

const MONTH_LABELS = ["1-р", "2-р", "3-р", "4-р", "5-р", "6-р", "7-р", "8-р", "9-р", "10-р", "11-р", "12-р"];

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "сая";
  if (Math.abs(n) >= 1_000) return Math.round(n / 1_000) + "мян";
  return n.toString();
}

function tooltipFmt(value: number | string | undefined): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function MonthlyChart({ year, monthly }: Props) {
  const data = monthly.map(m => ({
    name: MONTH_LABELS[m.month - 1],
    Орлого: m.income,
    Зарлага: m.expense,
  }));

  const hasAnyData = monthly.some(m => m.income > 0 || m.expense > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{year} оны сарын динамик</h3>
        {!hasAnyData && (
          <span className="text-xs text-gray-400">Энэ жилд гүйлгээ байхгүй</span>
        )}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={fmt} />
            <Tooltip
              formatter={(v) => tooltipFmt(v as number | string | undefined)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Орлого" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Зарлага" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
