"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDataRefresh } from "@/lib/use-data-refresh";

interface SeriesRow {
  year: number;
  month: number; // 1-12
  income: number;
  expense: number;
}

interface Props {
  /** Уншихад зориулсан горим — жил сонгох товчгүй, зөвхөн сүүлийн жилийг харуулна. */
  readOnly?: boolean;
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

export default function MonthlyBarChart({ readOnly = false }: Props) {
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/insights/monthly");
    const data = await res.json();
    const yrs: number[] = data.years ?? [];
    setSeries(data.series ?? []);
    setYears(yrs);
    // Анхдагчаар хамгийн сүүлийн жилийг сонгоно (өмнөх сонголтыг хадгална).
    setSelected(prev => {
      const valid = new Set(Array.from(prev).filter(y => yrs.includes(y)));
      return valid.size ? valid : new Set(yrs.length ? [yrs[0]] : []);
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataRefresh(fetchData);

  const toggleYear = (y: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(y)) {
        if (next.size > 1) next.delete(y); // дор хаяж нэг жил сонгогдсон байх
      } else {
        next.add(y);
      }
      return next;
    });
  };

  const allSelected = years.length > 0 && selected.size === years.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set(years.length ? [years[0]] : []) : new Set(years));
  };

  // Сонгосон жилүүдийн сарыг он цагийн дарааллаар нэг тэнхлэгт байрлуулна.
  const data = useMemo(() => {
    const rows = series
      .filter(r => selected.has(r.year))
      .sort((a, b) => a.year - b.year || a.month - b.month);
    const multiYear = selected.size > 1;
    return rows.map(r => ({
      label: multiYear ? `${String(r.year).slice(2)}/${r.month}` : `${r.month}-р`,
      fullLabel: `${r.year} оны ${r.month}-р сар`,
      Орлого: r.income,
      Зарлага: r.expense,
    }));
  }, [series, selected]);

  const hasData = data.some(d => d["Орлого"] > 0 || d["Зарлага"] > 0);

  if (!loading && years.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-md shadow-slate-200/50">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Сарын динамик</h3>
          {!hasData && !loading && <span className="text-xs text-slate-400">Гүйлгээгүй</span>}
        </div>
        {!readOnly && years.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {years.length > 1 && (
              <button
                onClick={toggleAll}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  allSelected
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Бүгд
              </button>
            )}
            {years.map(y => {
              const on = selected.has(y);
              return (
                <button
                  key={y}
                  onClick={() => toggleYear(y)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    on
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              interval={data.length > 14 ? Math.floor(data.length / 12) : 0}
            />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={fmtShort} />
            <Tooltip
              formatter={(v) => fmtFull(v as number | string | undefined)}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
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
