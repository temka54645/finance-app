"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Tx {
  date: string;
  amount: number;
  type: string;
}

interface Props {
  year: number;
  month: number; // 1-12
  transactions: Tx[];
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "сая";
  if (Math.abs(n) >= 1_000) return Math.round(n / 1_000) + "K";
  return n.toString();
}

function fmtFull(v: number | string | undefined) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function DailyBarChart({ year, month, transactions }: Props) {
  const data = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDay = new Map<number, { income: number; expense: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      byDay.set(d, { income: 0, expense: 0 });
    }
    for (const tx of transactions) {
      const d = new Date(tx.date).getUTCDate();
      const bucket = byDay.get(d);
      if (!bucket) continue;
      if (tx.type === "income") bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }
    return Array.from(byDay.entries()).map(([d, v]) => ({
      day: d,
      Орлого: v.income,
      Зарлага: v.expense,
    }));
  }, [year, month, transactions]);

  const hasData = data.some(d => d["Орлого"] > 0 || d["Зарлага"] > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Өдрийн динамик</h3>
        {!hasData && <span className="text-xs text-gray-400">Гүйлгээгүй</span>}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={2} />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={fmtShort} />
            <Tooltip
              formatter={(v) => fmtFull(v as number | string | undefined)}
              labelFormatter={(label) => `${label}-ны өдөр`}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            <Bar dataKey="Орлого" fill="#16a34a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Зарлага" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
