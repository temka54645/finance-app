"use client";

import { Calendar, ChevronDown } from "lucide-react";

interface Props {
  year: number;
  availableYears: number[];
  onChange: (year: number) => void;
}

export default function YearSelector({ year, availableYears, onChange }: Props) {
  // Хэрэв өгөгдөл байхгүй бол одоогийн жилийг үзүүлнэ
  const years = availableYears.length > 0 ? availableYears : [year];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500" />
      <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Жил:</label>
      <div className="relative">
        <select
          value={year}
          onChange={e => onChange(Number(e.target.value))}
          className="pl-3 pr-8 py-1.5 border rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
