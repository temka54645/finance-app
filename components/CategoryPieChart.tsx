"use client";

import { createElement, useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { X, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getCategoryStyle } from "@/lib/category-icons";
import { useCustomCategories } from "@/lib/use-custom-categories";
import { resolveCustomCategoryIcon } from "@/lib/custom-category-icons";

/**
 * Тод, давтагдахгүй өнгөний багц — саарал өнгөгүй. Ангиллуудыг дүнгээр нь
 * эрэмбэлсний дараа индексээр нь онооно. Ингэснээр зэргэлдээ сегментүүд
 * болон legend-ийн мөрүүд харааны хувьд тод ялгарна.
 */
const CHART_PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#f59e0b", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
  "#ea580c", // orange
  "#0d9488", // teal
  "#4f46e5", // indigo
  "#ca8a04", // yellow-600
  "#be123c", // rose
  "#9333ea", // purple
  "#0284c7", // sky
  "#15803d", // green-700
  "#c026d3", // fuchsia
  "#e11d48", // rose-600
  "#059669", // emerald
  "#d97706", // amber-600
];

interface CategoryItem {
  category: string;
  type: string;
  _sum: { amount: number | null };
  _count: number;
}

/** Modal-д харуулах гүйлгээний хөнгөн хувилбар. */
export interface CategoryTransaction {
  id: string;
  date: string;
  description: string;
  counterparty?: string | null;
  amount: number;
  type: string;
  category: string;
  statement?: { fileName: string; bankName?: string | null } | null;
}

interface Props {
  byCategory: CategoryItem[];
  type: "income" | "expense";
  title: string;
  /** Гадна карт (border/bg)-гүйгээр шигтгэн харуулна. */
  bare?: boolean;
  /**
   * Сегмент/мөр дээр дарахад тухайн ангилалд бүртгэгдсэн гүйлгээнүүдийг
   * ачаалах callback. Өгвөл график дээр дарах боломжтой болж, гүйлгээний
   * жагсаалтыг modal-аар харуулна.
   */
  loadCategoryTransactions?: (category: string, type: "income" | "expense") => Promise<CategoryTransaction[]>;
}

interface PieDatum {
  name: string;
  value: number;
  count: number;
  color: string;
}

function fmt(v: number) {
  return v.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

function fmtShort(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "тэрбум";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "сая";
  if (v >= 1_000) return Math.round(v / 1_000) + "мян";
  return v.toString();
}

export default function CategoryPieChart({
  byCategory,
  type,
  title,
  bare = false,
  loadCategoryTransactions,
}: Props) {
  // Hover хийсэн сегментийг pie болон legend хоёрын аль алинаас тодруулна.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Дарж сонгосон ангилал — гүйлгээний жагсаалтыг modal-аар харуулна.
  const [openCategory, setOpenCategory] = useState<{ name: string; value: number; count: number; color: string } | null>(null);
  const clickable = !!loadCategoryTransactions;

  // Хэрэглэгчийн өөрийн ангиллын нэр → сонгосон icon key (custom категорийн лого харуулна).
  // userType-аар бус нэрээр нь тааруулна — өөр дэлгэцэд (userType дамжуулаагүй) ч ажиллана.
  const { all: customCategories } = useCustomCategories();
  const customIconByName = useMemo(() => {
    const m = new Map<string, string | null | undefined>();
    for (const c of customCategories) {
      if (c.type === type) m.set(c.name, c.icon);
    }
    return m;
  }, [type, customCategories]);

  // Pie зөвхөн бодит бүртгэгдсэн гүйлгээнээс үүснэ — гүйлгээ бүрийн өөрийнх нь
  // `type` талбараар шүүнэ (ангиллын каталогийн нэрээр БУС). Ингэснээр жишээ нь
  // "Хөрөнгө оруулалт" гэж зарлагаар бүртгэсэн гүйлгээ ч зарлагын pie-д харагдана.
  // Дараа нь дүнгээр нь эрэмбэлж, индексээр давтагдахгүй өнгө онооно.
  const data = useMemo<PieDatum[]>(() =>
    byCategory
      .filter(c => c.type === type && (c._sum.amount ?? 0) > 0)
      .map(c => ({
        name: c.category,
        value: c._sum.amount ?? 0,
        count: c._count,
        color: "",
      }))
      .sort((a, b) => b.value - a.value)
      .map((c, i) => ({ ...c, color: CHART_PALETTE[i % CHART_PALETTE.length] })),
  [byCategory, type]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div
        className={
          bare
            ? "flex min-h-[120px] flex-col items-center justify-center"
            : "bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]"
        }
      >
        <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
        <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>
      </div>
    );
  }

  return (
    <div className={bare ? "flex flex-col gap-3" : "bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs font-medium text-gray-400">
          {data.length} ангилал · {fmt(total)}
        </span>
      </div>

      {clickable && (
        <p className="-mt-1 text-[11px] text-slate-400">Ангилал дээр дарж гүйлгээг нь харна уу</p>
      )}

      {/* Pie + Legend хажуулж — томруулсан, жижиг дэлгэцэд босоо овоолно */}
      <div className="flex flex-col items-center gap-3 min-h-0 sm:flex-row sm:items-stretch sm:gap-4">
        {/* Pie chart */}
        <div className="h-52 w-52 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={96}
                innerRadius={48}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(_, i) => {
                  if (clickable && data[i]) setOpenCategory({ name: data[i].name, value: data[i].value, count: data[i].count, color: data[i].color });
                }}
                className={clickable ? "cursor-pointer" : undefined}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    // Hover үед идэвхтэй сегментийг тодруулж, бусдыг бүдгэрүүлнэ —
                    // ингэснээр жижигхэн сегмент ч аль ангилалынх нь ялгарна.
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.3}
                    stroke={activeIndex === i ? "#fff" : "none"}
                    strokeWidth={activeIndex === i ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip total={total} customIconByName={customIconByName} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom legend — scroll-тэй, overflow хийхгүй */}
        <div className="w-full flex-1 min-w-0 overflow-y-auto max-h-52 space-y-0.5 pr-1">
          {data.map((entry, i) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
            const active = activeIndex === i;

            return (
              <div
                key={i}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                className={`flex items-center gap-1.5 min-w-0 rounded px-1 py-1 transition-colors ${
                  clickable ? "cursor-pointer hover:bg-slate-100" : "cursor-default"
                } ${active ? "bg-slate-100" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => { if (clickable) setOpenCategory({ name: entry.name, value: entry.value, count: entry.count, color: entry.color }); }}
                onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpenCategory({ name: entry.name, value: entry.value, count: entry.count, color: entry.color }); } }}
                title={`${entry.name} · ${fmt(entry.value)} · ${pct}% · ${entry.count} гүйлгээ${clickable ? " — дарж харна уу" : ""}`}
              >
                {/* Өнгийн дөрвөлж */}
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />

                {/* Icon — өнгөийг сегментийн өнгөтэй нийцүүлнэ */}
                <CatIcon
                  name={entry.name}
                  color={entry.color}
                  customIconByName={customIconByName}
                  className="flex-shrink-0 w-3.5 h-3.5"
                />

                {/* Нэр */}
                <span className="flex-1 min-w-0 text-[11px] text-gray-600 truncate">
                  {entry.name}
                </span>

                {/* Хувь + дүн */}
                <span className="flex-shrink-0 text-[11px] font-medium text-gray-500 tabular-nums">
                  {pct}%
                </span>
                <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums hidden sm:inline">
                  {fmtShort(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {openCategory && loadCategoryTransactions && (
        <CategoryTxModal
          category={openCategory.name}
          total={openCategory.value}
          count={openCategory.count}
          color={openCategory.color}
          type={type}
          load={loadCategoryTransactions}
          customIconByName={customIconByName}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
}

// Тухайн ангилалд бүртгэгдсэн гүйлгээнүүдийг жагсаан харуулах modal.
function CategoryTxModal({
  category, total, count, color, type, load, customIconByName, onClose,
}: {
  category: string;
  total: number;
  count: number;
  color: string;
  type: "income" | "expense";
  load: (category: string, type: "income" | "expense") => Promise<CategoryTransaction[]>;
  customIconByName: Map<string, string | null | undefined>;
  onClose: () => void;
}) {
  const [txs, setTxs] = useState<CategoryTransaction[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setTxs(null);
    setError(false);
    load(category, type)
      .then((rows) => { if (alive) setTxs(rows); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [category, type, load]);

  // Esc дарвал хаах
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 min-w-0">
            <CatIcon name={category} color={color} customIconByName={customIconByName} className="h-5 w-5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-800" style={{ color }}>{category}</h3>
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

        {/* Body */}
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
              {txs.map((t) => (
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

// Тогтвортой (module-level) icon компонент — нэр бүрийн icon-г шийдэж createElement-ээр
// зурна. Render дотор шинэ компонент үүсгэхээс зайлсхийнэ (react-hooks/static-components).
// Дараалал: (1) хэрэглэгчийн custom лого → (2) нэгдсэн каталог → (3) fallback.
function CatIcon({
  name,
  color,
  customIconByName,
  className,
}: {
  name: string;
  /** Pie/legend-тэй ижил оноосон өнгө. */
  color: string;
  customIconByName: Map<string, string | null | undefined>;
  className?: string;
}) {
  const icon = customIconByName.has(name)
    ? resolveCustomCategoryIcon(customIconByName.get(name))
    : getCategoryStyle(name).icon;
  return createElement(icon, { className, style: { color } });
}

// Hover хийхэд аль ангилал, ямар дүн, хэдэн хувь, хэдэн гүйлгээ болохыг тодорхой харуулна.
interface PieTooltipProps {
  active?: boolean;
  payload?: { payload: PieDatum }[];
  total: number;
  customIconByName: Map<string, string | null | undefined>;
}

function PieTooltip({ active, payload, total, customIconByName }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <CatIcon name={p.name} color={p.color} customIconByName={customIconByName} className="w-3.5 h-3.5" />
        <span>{p.name}</span>
      </div>
      <div className="mt-1 text-xs text-slate-600 tabular-nums">
        {fmt(p.value)} <span className="text-slate-400">· {pct}%</span>
      </div>
      <div className="text-[11px] text-slate-400 tabular-nums">{p.count} гүйлгээ</div>
    </div>
  );
}
