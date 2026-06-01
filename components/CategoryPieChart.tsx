"use client";

import { createElement, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getCategoryColor, getCategoryStyle } from "@/lib/category-icons";
import { getIncomeCategoryNames, getExpenseCategoryNames } from "@/lib/categories";
import { useCustomCategories } from "@/lib/use-custom-categories";
import { resolveCustomCategoryIcon } from "@/lib/custom-category-icons";

interface CategoryItem {
  category: string;
  type: string;
  _sum: { amount: number | null };
  _count: number;
}

interface Props {
  byCategory: CategoryItem[];
  type: "income" | "expense";
  title: string;
  /** Гадна карт (border/bg)-гүйгээр шигтгэн харуулна. */
  bare?: boolean;
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
}: Props) {
  // Hover хийсэн сегментийг pie болон legend хоёрын аль алинаас тодруулна.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

  // Орлого/зарлагын ангиллын бүх боломжит нэр (personal + business хоёулангаас нь)
  // Энэ нь userType солигдсон ч хуучин гүйлгээнүүдийг зөв шүүхэд хэрэгтэй.
  const validNamesForThisType = useMemo(() => {
    const incomeNames = new Set([
      ...getIncomeCategoryNames("personal"),
      ...getIncomeCategoryNames("business"),
      "Бусад орлого",
    ]);
    const expenseNames = new Set([
      ...getExpenseCategoryNames("personal"),
      ...getExpenseCategoryNames("business"),
      "Бусад зарлага",
    ]);
    return { incomeNames, expenseNames };
  }, []);

  const data = useMemo<PieDatum[]>(() =>
    byCategory
      .filter(c => {
        if ((c._sum.amount ?? 0) <= 0) return false;
        const { incomeNames, expenseNames } = validNamesForThisType;
        const isKnownIncome = incomeNames.has(c.category);
        const isKnownExpense = expenseNames.has(c.category);

        if (type === "income") {
          // Орлогын chart: nameKey нь орлогын нэр байх ёстой
          // Хэрвээ category нэр нь зарлагынх бол (өгөгдлийн зөрчил) — хасна
          if (isKnownExpense && !isKnownIncome) return false;
          // Тодорхой орлогын нэр — оруулна
          if (isKnownIncome) return true;
          // "Ангилаагүй" гэх мэт танигдаагүй нэр — type талбараар шалгана
          return c.type === "income";
        } else {
          if (isKnownIncome && !isKnownExpense) return false;
          if (isKnownExpense) return true;
          return c.type === "expense";
        }
      })
      .map(c => ({
        name: c.category,
        value: c._sum.amount ?? 0,
        count: c._count,
        color: getCategoryColor(c.category),
      }))
      .sort((a, b) => b.value - a.value),
  [byCategory, type, validNamesForThisType]);

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

      {/* Pie + Legend хажуулж */}
      <div className="flex gap-3 min-h-0">
        {/* Pie chart */}
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={64}
                innerRadius={30}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
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
        <div className="flex-1 min-w-0 overflow-y-auto max-h-36 space-y-0.5 pr-1">
          {data.map((entry, i) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
            const active = activeIndex === i;

            return (
              <div
                key={i}
                className={`flex items-center gap-1.5 min-w-0 rounded px-1 py-0.5 transition-colors cursor-default ${
                  active ? "bg-slate-100" : ""
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                title={`${entry.name} · ${fmt(entry.value)} · ${pct}% · ${entry.count} гүйлгээ`}
              >
                {/* Өнгийн дөрвөлж */}
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />

                {/* Icon — өнгөийг сегментийн өнгөтэй нийцүүлнэ */}
                <CatIcon
                  name={entry.name}
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
    </div>
  );
}

// Тогтвортой (module-level) icon компонент — нэр бүрийн icon-г шийдэж createElement-ээр
// зурна. Render дотор шинэ компонент үүсгэхээс зайлсхийнэ (react-hooks/static-components).
// Дараалал: (1) хэрэглэгчийн custom лого → (2) нэгдсэн каталог → (3) fallback.
function CatIcon({
  name,
  customIconByName,
  className,
}: {
  name: string;
  customIconByName: Map<string, string | null | undefined>;
  className?: string;
}) {
  const icon = customIconByName.has(name)
    ? resolveCustomCategoryIcon(customIconByName.get(name))
    : getCategoryStyle(name).icon;
  return createElement(icon, { className, style: { color: getCategoryColor(name) } });
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
        <CatIcon name={p.name} customIconByName={customIconByName} className="w-3.5 h-3.5" />
        <span>{p.name}</span>
      </div>
      <div className="mt-1 text-xs text-slate-600 tabular-nums">
        {fmt(p.value)} <span className="text-slate-400">· {pct}%</span>
      </div>
      <div className="text-[11px] text-slate-400 tabular-nums">{p.count} гүйлгээ</div>
    </div>
  );
}
