"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getCategoryColor } from "@/lib/category-icons";
import { getIncomeGroups, getExpenseGroups, type UserType } from "@/lib/categories";

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
  userType?: UserType;
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
  userType = "personal",
}: Props) {
  // categories.ts-аас icon авна
  const iconMap = useMemo(() => {
    const groups = type === "income"
      ? getIncomeGroups(userType)
      : getExpenseGroups(userType);
    const map: Record<string, { icon: React.ElementType; color: string }> = {};
    for (const g of groups) {
      for (const item of g.items) {
        map[item.name] = { icon: item.icon, color: item.color };
      }
    }
    return map;
  }, [type, userType]);

  const data = useMemo(() =>
    byCategory
      .filter(c => c.type === type && (c._sum.amount ?? 0) > 0)
      .map(c => ({
        name: c.category,
        value: c._sum.amount ?? 0,
        count: c._count,
        color: getCategoryColor(c.category),
        meta: iconMap[c.category],
      }))
      .sort((a, b) => b.value - a.value),
  [byCategory, type, iconMap]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
        <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
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
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                itemStyle={{ color: "#374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom legend — scroll-тэй, overflow хийхгүй */}
        <div className="flex-1 min-w-0 overflow-y-auto max-h-36 space-y-1 pr-1">
          {data.map((entry, i) => {
            const Icon = entry.meta?.icon;
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";

            return (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                {/* Өнгийн дөрвөлж */}
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />

                {/* Icon */}
                {Icon && (
                  <Icon
                    className={`flex-shrink-0 w-3 h-3 ${entry.meta?.color ?? "text-gray-400"}`}
                  />
                )}

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
