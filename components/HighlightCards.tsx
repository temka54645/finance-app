"use client";

import { Banknote, Users, Receipt, Briefcase } from "lucide-react";

interface Highlight {
  amount: number;
  count: number;
}

interface Props {
  bankFees: Highlight;
  salaryPaid: Highlight;
  taxes: Highlight;
  salaryReceived: Highlight;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

interface CardProps {
  label: string;
  data: Highlight;
  icon: React.ReactNode;
  color: "blue" | "purple" | "amber" | "green";
}

const COLORS = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   icon: "text-blue-500",   value: "text-blue-900" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "text-purple-500", value: "text-purple-900" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  icon: "text-amber-500",  value: "text-amber-900" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  icon: "text-green-500",  value: "text-green-900" },
};

function Card({ label, data, icon, color }: CardProps) {
  const c = COLORS[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${c.text}`}>{label}</span>
        <span className={c.icon}>{icon}</span>
      </div>
      <p className={`text-xl font-bold ${c.value}`}>{fmt(data.amount)}</p>
      <p className={`text-xs ${c.text} mt-1`}>{data.count} гүйлгээ</p>
    </div>
  );
}

export default function HighlightCards({ bankFees, salaryPaid, taxes, salaryReceived }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Анхаарах дүнгүүд</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Банкны шимтгэл" data={bankFees} icon={<Receipt className="w-4 h-4" />} color="amber" />
        <Card label="Цалин зарлага" data={salaryPaid} icon={<Users className="w-4 h-4" />} color="purple" />
        <Card label="Татвар" data={taxes} icon={<Briefcase className="w-4 h-4" />} color="blue" />
        <Card label="Цалин (орлого)" data={salaryReceived} icon={<Banknote className="w-4 h-4" />} color="green" />
      </div>
    </div>
  );
}
