"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import UncategorizedSection from "@/components/UncategorizedSection";
import TransactionTable from "@/components/TransactionTable";
import CounterpartyDrilldown, { METRIC_META, type Metric } from "@/components/CounterpartyDrilldown";
import { emitDataChanged, useDataRefresh } from "@/lib/use-data-refresh";

interface Transaction {
  id: string;
  date: string;
  description: string;
  counterparty?: string | null;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName: string; bankName?: string | null };
}

const MONTHS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

const METRIC_ORDER: Metric[] = ["income", "expense", "largest", "frequent"];

interface Props {
  initialType?: "all" | "income" | "expense";
  initialMetric?: Metric | null;
}

export default function BreakdownClient({ initialType = "all", initialMetric = null }: Props) {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | "all">("all");
  const [month, setMonth] = useState<number | "all">("all");
  // null = энгийн гүйлгээний жагсаалт; metric = тухайн үзүүлэлтийн харьцагчийн задаргаа.
  const [metric, setMetric] = useState<Metric | null>(initialMetric);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // "Бүгд" жилийн lazy ачаалалт — хэрэглэгч шүүлт хийж эхлэхэд л бүх жилийн
  // гүйлгээг татна (анхдагчаар татахгүй, ингэснээр хуудас хурдан нээгдэнэ).
  const [loadAll, setLoadAll] = useState(false);

  const fetchData = useCallback(async (opts?: { background?: boolean }) => {
    // background=true (дата шинэчлэгдсэн event) — байгаа агуулгыг spinner-ээр
    // битгий орлуул; ингэснээр хүснэгт unmount болохгүй, scroll байрандаа үлдэнэ.
    if (!opts?.background) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (year !== "all") qs.set("year", String(year));
      if (year !== "all" && month !== "all") qs.set("month", String(month));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      // reports — хөнгөн нэгтгэл (жилийн жагсаалт, ангилаагүйн тоо) тул үргэлж татна.
      const reports = await fetch(`/api/reports${suffix}`).then(r => r.json());
      // availableYears нь шүүлтээс үл хамаарч бүх жилийг буцаадаг
      setYears(reports.availableYears ?? []);
      setUncategorizedCount(reports.uncategorizedCount ?? 0);
      // Гүйлгээний жагсаалтыг зөвхөн "Гүйлгээ" горимд татна.
      // (Үзүүлэлтийн задаргаа горим өөрийн хөнгөн нэгтгэл + lazy татацтай тул энд татах шаардлагагүй.)
      // "Бүгд" жил сонгосон үед автоматаар БҮХ жилийн гүйлгээг татахгүй (хүнд) —
      // хэрэглэгч шүүлт хийж эхлэхэд (loadAll=true болоход) л суффиксгүйгээр бүгдийг татна.
      const shouldFetchTx = metric === null && (year !== "all" || loadAll);
      if (shouldFetchTx) {
        const txs = await fetch(`/api/transactions${suffix}`).then(r => r.json());
        setTransactions(txs.transactions ?? []);
      } else {
        setTransactions([]);
      }
    } finally {
      if (!opts?.background) setLoading(false);
    }
  }, [year, month, metric, loadAll]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const refresh = useCallback(() => fetchData({ background: true }), [fetchData]);
  useDataRefresh(refresh);

  const selectYear = (y: number | "all") => {
    setYear(y);
    setMonth("all"); // жил солих үед сарын шүүлтийг буцаана
    setLoadAll(false); // шинэ хүрээнд "Бүгд" бол дахин lazy эхэлнэ
  };

  // TransactionTable дотор шүүлт идэвхжихэд (lazy "Бүгд" горимд) бүх гүйлгээг татуулна.
  const requestLoadAll = useCallback(() => setLoadAll(true), []);

  const scopedYear = year !== "all" ? year : undefined;
  const scopedMonth = year !== "all" && month !== "all" ? month : undefined;

  return (
    <AppShell>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">Задаргаа</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Гүйлгээний задаргаа
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Жил, сараар шүүж бүх гүйлгээг харах, эсвэл үзүүлэлт бүрээр харьцагчийн задаргааг харах
        </p>
      </div>

      {/* Үзүүлэлтийн шүүлт — энгийн жагсаалт эсвэл харьцагчийн задаргаа */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Үзүүлэлт:</span>
          <button
            onClick={() => setMetric(null)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Гүйлгээ
          </button>
          {METRIC_ORDER.map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                metric === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {METRIC_META[m].label}
            </button>
          ))}
        </div>
      </section>

      {/* Жил / сарын шүүлт — хоёр горимд хамаарна */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Жил:</span>
          <button
            onClick={() => selectYear("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              year === "all" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Бүгд
          </button>
          {years.map(y => (
            <button
              key={y}
              onClick={() => selectYear(y)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                year === y ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Сар — зөвхөн тодорхой жил сонгосон үед */}
        {year !== "all" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Сар:</span>
            <button
              onClick={() => setMonth("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                month === "all" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Бүгд
            </button>
            {MONTHS.map((label, i) => {
              const m = i + 1;
              return (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    month === m ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Ангилаагүй гүйлгээ — сонгосон хугацааны хүрээнд */}
      {uncategorizedCount > 0 && (
        <UncategorizedSection
          statementId=""
          count={uncategorizedCount}
          onUpdate={emitDataChanged}
          year={scopedYear}
          month={scopedMonth}
        />
      )}

      {/* Үндсэн агуулга */}
      <section>
        {metric !== null ? (
          // Харьцагчийн задаргаа — харьцагч дээр дарж гүйлгээг lazy үзнэ
          <CounterpartyDrilldown metric={metric} year={scopedYear} month={scopedMonth} />
        ) : (
          // "Гүйлгээ" горим — хүснэгтийг үргэлж mount байлгана (шүүлтийн төлөв
          // хадгалагдах ёстой). "Бүгд" жилийн үед lazy: шүүлт хийж эхлэхэд татна.
          <TransactionTable
            transactions={transactions}
            onUpdate={emitDataChanged}
            initialType={initialType}
            defaultAdvancedOpen
            loading={loading}
            lazy={year === "all" && !loadAll}
            onRequestLoad={requestLoadAll}
          />
        )}
      </section>
    </AppShell>
  );
}
