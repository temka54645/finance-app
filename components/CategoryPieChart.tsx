"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getCategoryColor } from "@/lib/category-icons";

interface CategoryItem {
  category: string;
  type: string;
  _sum: { amount: number };
  _count: number;
}

interface Props {
  byCategory: CategoryItem[];
  type: "income" | "expense";
  title: string;
}

function fmt(v: number) {
  const n = Number(v ?? 0);
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function CategoryPieChart({ byCategory, type, title }: Props) {
  const data = byCategory
    .filter(c => c.type === type && c._sum.amount > 0)
    .map(c => ({
      name: c.category,
      value: c._sum.amount,
      count: c._count,
      color: getCategoryColor(c.category),
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => fmt(v as number)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
