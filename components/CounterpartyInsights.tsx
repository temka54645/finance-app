"use client";

import { useCallback, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useDataRefresh } from "@/lib/use-data-refresh";

interface TopRow {
  counterparty: string;
  total: number;
  count: number;
}

interface LargestRow {
  counterparty: string | null;
  description: string;
  date: string;
  amount: number;
  type: string;
}

interface FreqRow {
  counterparty: string;
  count: number;
  total: number;
}

interface RecurringRow {
  counterparty: string;
  type: string;
  months: number;
  count: number;
  avgAmount: number;
}

interface InsightsData {
  topIncome: TopRow[];
  topExpense: TopRow[];
  largest: LargestRow[];
  mostFrequent: FreqRow[];
  recurring: RecurringRow[];
  hasCounterparty: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

function fmtDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Card({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accent}`}>
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function RankRow({
  rank,
  name,
  primary,
  secondary,
}: {
  rank: number;
  name: string;
  primary: string;
  secondary: string;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700" title={name}>
        {name}
      </span>
      <span className="flex-shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-slate-900">{primary}</span>
        <span className="block text-[10px] text-slate-400">{secondary}</span>
      </span>
    </li>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-3 text-center text-xs text-slate-400">{text}</p>;
}

interface Props {
  /** Хэрэв өгвөл тухайн сар/жилийн хүрээнд тооцоолно. Өгөхгүй бол бүх хугацаагаар. */
  year?: number;
  month?: number;
}

export default function CounterpartyInsights({ year, month }: Props = {}) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const scoped = typeof year === "number";

  const fetchData = useCallback(async () => {
    const qs = new URLSearchParams();
    if (typeof year === "number") qs.set("year", String(year));
    if (typeof month === "number") qs.set("month", String(month));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await fetch(`/api/insights/counterparties${suffix}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);
  useDataRefresh(fetchData);

  if (loading) {
    return (
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Харьцагчийн шинжилгээ
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {scoped ? "Энэ хугацааны дүнгээр" : "Бүх хугацааны дүнгээр"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white/60" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || !data.hasCounterparty) {
    return null; // харьцсан дансны мэдээлэл байхгүй бол хэсгийг нууна
  }

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          Харьцагчийн шинжилгээ
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {scoped
            ? "Энэ хугацааны харьцсан данс дээр суурилсан үзүүлэлтүүд"
            : "Бүх хугацааны харьцсан данс дээр суурилсан үзүүлэлтүүд"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* 1a — Топ орлогын эх үүсвэр */}
        <Card
          title="Топ орлогын эх үүсвэр"
          subtitle="Танд хамгийн их төлсөн харьцагчид"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="bg-emerald-100 text-emerald-700 border-emerald-200"
        >
          {data.topIncome.length ? (
            <ul className="divide-y divide-slate-100">
              {data.topIncome.map((r, i) => (
                <RankRow
                  key={r.counterparty}
                  rank={i + 1}
                  name={r.counterparty}
                  primary={fmt(r.total)}
                  secondary={`${r.count} гүйлгээ`}
                />
              ))}
            </ul>
          ) : (
            <EmptyHint text="Орлогын мэдээлэл алга" />
          )}
        </Card>

        {/* 1b — Топ зарлагын чиглэл */}
        <Card
          title="Топ зарлагын чиглэл"
          subtitle="Хамгийн их зарцуулсан харьцагчид"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="bg-rose-100 text-rose-700 border-rose-200"
        >
          {data.topExpense.length ? (
            <ul className="divide-y divide-slate-100">
              {data.topExpense.map((r, i) => (
                <RankRow
                  key={r.counterparty}
                  rank={i + 1}
                  name={r.counterparty}
                  primary={fmt(r.total)}
                  secondary={`${r.count} гүйлгээ`}
                />
              ))}
            </ul>
          ) : (
            <EmptyHint text="Зарлагын мэдээлэл алга" />
          )}
        </Card>

        {/* 2 — Хамгийн өндөр дүнтэй гүйлгээнүүд */}
        <Card
          title="Хамгийн өндөр дүнтэй гүйлгээ"
          subtitle="Нэг удаагийн томоохон гүйлгээнүүд"
          icon={<Trophy className="h-4 w-4" />}
          accent="bg-amber-100 text-amber-700 border-amber-200"
        >
          {data.largest.length ? (
            <ul className="divide-y divide-slate-100">
              {data.largest.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-1.5">
                  <span className="flex-shrink-0">
                    {r.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-700" title={r.counterparty ?? r.description}>
                      {r.counterparty || r.description || "Гүйлгээ"}
                    </span>
                    <span className="block text-[10px] text-slate-400">{fmtDate(r.date)}</span>
                  </span>
                  <span
                    className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                      r.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {fmt(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Гүйлгээ алга" />
          )}
        </Card>

        {/* 3 — Хамгийн их давтамжтай харьцагч */}
        <Card
          title="Хамгийн их давтамжтай харьцагч"
          subtitle="Гүйлгээний тоогоор"
          icon={<Repeat className="h-4 w-4" />}
          accent="bg-blue-100 text-blue-700 border-blue-200"
        >
          {data.mostFrequent.length ? (
            <ul className="divide-y divide-slate-100">
              {data.mostFrequent.map((r, i) => (
                <RankRow
                  key={r.counterparty}
                  rank={i + 1}
                  name={r.counterparty}
                  primary={`${r.count} удаа`}
                  secondary={fmt(r.total)}
                />
              ))}
            </ul>
          ) : (
            <EmptyHint text="Мэдээлэл алга" />
          )}
        </Card>
      </div>

      {/* 4 — Тогтмол/давтагдсан төлбөр (бүтэн өргөн) */}
      {data.recurring.length > 0 && (
        <div className="mt-3">
          <Card
            title="Тогтмол / давтагдсан төлбөр"
            subtitle="Дор хаяж 3 сард ойролцоо дүнтэй давтагдсан харьцагчид"
            icon={<Repeat className="h-4 w-4" />}
            accent="bg-indigo-100 text-indigo-700 border-indigo-200"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.recurring.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-700" title={r.counterparty}>
                      {r.counterparty}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {r.months} сар · {r.count} гүйлгээ · {r.type === "income" ? "орлого" : "зарлага"}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                    ≈{fmt(r.avgAmount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
