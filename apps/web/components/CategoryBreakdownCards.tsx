"use client";

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, X, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getCategoryStyle } from "@/lib/category-icons";
import { useCustomCategories } from "@/lib/use-custom-categories";
import { resolveCustomCategoryIcon } from "@/lib/custom-category-icons";
import type { CategoryTransaction } from "@/components/CategoryPieChart";

/** `/api/reports`-ийн `byCategory`-ийн нэг мөр. */
export interface CategoryItem {
  category: string;
  type: string;
  _sum: { amount: number | null };
  _count: number;
}

interface Props {
  byCategory: CategoryItem[];
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

interface Row {
  category: string;
  total: number;
  count: number;
}

/**
 * Хяналтын самбарын 2 шинэ карт — ангилсан орлого/зарлагыг ангиллын төрлөөр нь
 * «Топ орлого/зарлага»-тай ИЖИЛ эрэмбэлсэн ЖАГСААЛТ хэлбэрээр харуулна
 * (pie биш). Өгөгдөл нь `/api/reports`-ийн `byCategory` (бүх хугацаа).
 * Мөр дээр дарвал тухайн ангиллын гүйлгээнүүдийг modal-аар үзүүлнэ.
 */
export default function CategoryBreakdownCards({ byCategory }: Props) {
  // Ангилал дээр дарахад тухайн ангиллын бүх хугацааны гүйлгээг татна.
  const loadCategoryTransactions = useCallback(
    async (category: string, type: "income" | "expense"): Promise<CategoryTransaction[]> => {
      const res = await fetch(
        `/api/transactions?category=${encodeURIComponent(category)}&type=${type}`
      );
      const data = await res.json();
      return (data.transactions ?? []).sort(
        (a: CategoryTransaction, b: CategoryTransaction) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    []
  );

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          Ангиллын задаргаа
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Бүх хугацааны орлого, зарлагыг ангиллын төрлөөр нь нэгтгэв
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CategoryListCard
          byCategory={byCategory}
          type="income"
          title="Орлого ангиллаар"
          subtitle="Ангилал тус бүрийн нийт орлого"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="bg-emerald-100 text-emerald-700 border-emerald-200"
          load={loadCategoryTransactions}
        />
        <CategoryListCard
          byCategory={byCategory}
          type="expense"
          title="Зарлага ангиллаар"
          subtitle="Ангилал тус бүрийн нийт зарлага"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="bg-rose-100 text-rose-700 border-rose-200"
          load={loadCategoryTransactions}
        />
      </div>
    </section>
  );
}

function CategoryListCard({
  byCategory,
  type,
  title,
  subtitle,
  icon,
  accent,
  load,
}: {
  byCategory: CategoryItem[];
  type: "income" | "expense";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  load: (category: string, type: "income" | "expense") => Promise<CategoryTransaction[]>;
}) {
  const [open, setOpen] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      byCategory
        .filter(c => c.type === type && (c._sum.amount ?? 0) > 0)
        .map(c => ({ category: c.category, total: c._sum.amount ?? 0, count: c._count }))
        .sort((a, b) => b.total - a.total),
    [byCategory, type]
  );

  const total = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);
  const max = rows[0]?.total ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accent}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {rows.length > 0 && (
          <span className="flex-shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums text-slate-900">{fmt(total)}</span>
            <span className="block text-[10px] text-slate-400">{rows.length} ангилал</span>
          </span>
        )}
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto pr-1">
        {rows.length ? (
          <ul className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <CategoryRow
                key={r.category}
                rank={i + 1}
                row={r}
                pct={total > 0 ? (r.total / total) * 100 : 0}
                barPct={max > 0 ? (r.total / max) * 100 : 0}
                type={type}
                onOpen={() => setOpen(r)}
              />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-center text-xs text-slate-400">
            {type === "income" ? "Орлогын мэдээлэл алга" : "Зарлагын мэдээлэл алга"}
          </p>
        )}
      </div>

      {open && (
        <CategoryTxModal
          category={open.category}
          total={open.total}
          count={open.count}
          type={type}
          load={load}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function CategoryRow({
  rank,
  row,
  pct,
  barPct,
  type,
  onOpen,
}: {
  rank: number;
  row: Row;
  pct: number;
  barPct: number;
  type: "income" | "expense";
  onOpen: () => void;
}) {
  const style = getCategoryStyle(row.category);
  const barColor = type === "income" ? "bg-emerald-400" : "bg-rose-400";

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 py-1.5 text-left transition-colors hover:bg-slate-50"
        title={`${row.category} · ${fmt(row.total)} · ${pct.toFixed(1)}% — дарж харна уу`}
      >
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
          {rank}
        </span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
          {createElement(style.icon, { className: `h-3.5 w-3.5 ${style.text}` })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-slate-700">{row.category}</span>
          <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <span className={`block h-full rounded-full ${barColor}`} style={{ width: `${Math.max(barPct, 2)}%` }} />
          </span>
        </span>
        <span className="flex-shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-slate-900">{fmt(row.total)}</span>
          <span className="block text-[10px] text-slate-400">{pct.toFixed(0)}% · {row.count} гүйлгээ</span>
        </span>
      </button>
    </li>
  );
}

// Тухайн ангилалд бүртгэгдсэн гүйлгээнүүдийг жагсаан харуулах modal.
function CategoryTxModal({
  category,
  total,
  count,
  type,
  load,
  onClose,
}: {
  category: string;
  total: number;
  count: number;
  type: "income" | "expense";
  load: (category: string, type: "income" | "expense") => Promise<CategoryTransaction[]>;
  onClose: () => void;
}) {
  const [txs, setTxs] = useState<CategoryTransaction[] | null>(null);
  const [error, setError] = useState(false);
  const { all: customCategories } = useCustomCategories();
  const style = getCategoryStyle(category);
  const customIcon = customCategories.find(c => c.type === type && c.name === category)?.icon;
  const IconComp = customIcon !== undefined ? resolveCustomCategoryIcon(customIcon) : style.icon;

  // Modal нь ангилал тус бүрт шинээр mount хийгддэг (open төлвөөр) тул
  // эхний төлөв (null/false) аль хэдийн "ачаалж байна"-г илэрхийлнэ —
  // effect дотор дахин setState хийх шаардлагагүй (cascading render-ээс зайлсхийв).
  useEffect(() => {
    let alive = true;
    load(category, type)
      .then(rows => { if (alive) setTxs(rows); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [category, type, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
              {createElement(IconComp, { className: `h-4 w-4 ${style.text}` })}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-800">{category}</h3>
              <p className="text-xs text-slate-500 tabular-nums">{fmt(total)} · {count} гүйлгээ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Хаах"
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error ? (
            <p className="py-10 text-center text-sm text-rose-500">Гүйлгээг ачаалахад алдаа гарлаа</p>
          ) : txs === null ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : txs.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Гүйлгээ олдсонгүй</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {txs.map(t => (
                <li key={t.id} className="flex items-center gap-2 px-2 py-2.5">
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                    t.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  }`}>
                    {t.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700" title={t.description}>
                      {t.description || t.counterparty || "—"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(t.date).toLocaleDateString("mn-MN")}
                      {t.statement?.bankName ? ` · ${t.statement.bankName}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold tabular-nums ${
                    t.type === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
