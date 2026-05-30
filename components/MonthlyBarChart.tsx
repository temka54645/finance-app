"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MonthRow {
  month: number; // 1-12
  income: number;
  expense: number;
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

export default function MonthlyBarChart() {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Боломжтой жилүүдийг авч, хамгийн сүүлийн жилийг сонгоно.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports");
        const data = await res.json();
        const yrs: number[] = data.availableYears ?? [];
        if (!cancelled) {
          setYears(yrs);
          setSelectedYear(yrs[0] ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Сонгосон жилийн сарын задаргааг авна.
  useEffect(() => {
    if (selectedYear === null) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/reports?year=${selectedYear}`);
      const data = await res.json();
      if (!cancelled) setMonthly(data.monthly ?? []);
    })();
    return () => { cancelled = true; };
  }, [selectedYear]);

  const data = useMemo(
    () => monthly.map(m => ({
      month: `${m.month}-р`,
      Орлого: m.income,
      Зарлага: m.expense,
    })),
    [monthly]
  );

  const hasData = monthly.some(m => m.income > 0 || m.expense > 0);

  if (!loading && years.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-md shadow-slate-200/50">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Сарын динамик</h3>
        <div className="flex items-center gap-2">
          {!hasData && !loading && <span className="text-xs text-slate-400">Гүйлгээгүй</span>}
          {years.length > 0 && (
            <select
              value={selectedYear ?? ""}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              {years.map(y => (
                <option key={y} value={y}>{y} он</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={fmtShort} />
            <Tooltip
              formatter={(v) => fmtFull(v as number | string | undefined)}
              labelFormatter={(label) => `${label} сар`}
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
