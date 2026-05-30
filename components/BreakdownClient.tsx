"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import UncategorizedSection from "@/components/UncategorizedSection";
import YearTimeline from "@/components/YearTimeline";
import { emitDataChanged, useDataRefresh } from "@/lib/use-data-refresh";

export default function BreakdownClient() {
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [years, setYears] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/reports");
    const data = await res.json();
    setUncategorizedCount(data.uncategorizedCount ?? 0);
    const yrs: number[] = data.availableYears ?? [];
    setYears(yrs);
    // Анхдагчаар бүх жилийг сонгоно (өмнөх сонголтыг хадгална).
    setSelected(prev => {
      const valid = new Set(Array.from(prev).filter(y => yrs.includes(y)));
      return valid.size ? valid : new Set(yrs);
    });
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useDataRefresh(fetchOverview);

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

  return (
    <AppShell>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">Задаргаа</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Дэлгэрэнгүй задаргаа
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Жил, сараар нь нээж гүйлгээний дэлгэрэнгүйг харах, ангилах боломжтой
        </p>
      </div>

      {/* Ангилаагүй гүйлгээ */}
      {uncategorizedCount > 0 && (
        <UncategorizedSection
          statementId=""
          count={uncategorizedCount}
          onUpdate={emitDataChanged}
        />
      )}

      {/* Жил тус бүрийн задаргаа — сар руу нээж дэлгэрэнгүй рүү шилжинэ */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Жил тус бүрийн задаргаа
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Жилийн мөр дээр дарж сар тус бүрийн дүнг нээх боломжтой
            </p>
          </div>

          {/* Жилийн фильтер */}
          {years.length > 0 && (
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
        <YearTimeline onChange={emitDataChanged} years={Array.from(selected)} />
      </section>
    </AppShell>
  );
}
