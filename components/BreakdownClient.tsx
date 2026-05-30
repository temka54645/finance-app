"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import UncategorizedSection from "@/components/UncategorizedSection";
import YearTimeline from "@/components/YearTimeline";
import { emitDataChanged, useDataRefresh } from "@/lib/use-data-refresh";

export default function BreakdownClient() {
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/reports");
    const data = await res.json();
    setUncategorizedCount(data.uncategorizedCount ?? 0);
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useDataRefresh(fetchOverview);

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

      {/* Интерактив сарын динамик — олон жил сонгох боломжтой */}
      <MonthlyBarChart />

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
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Жил тус бүрийн задаргаа
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Жилийн мөр дээр дарж сар тус бүрийн дүнг нээх боломжтой
          </p>
        </div>
        <YearTimeline onChange={emitDataChanged} />
      </section>
    </AppShell>
  );
}
