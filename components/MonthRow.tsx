"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Eye, Loader2, X } from "lucide-react";
import FileUpload from "./FileUpload";

const MONTH_NAMES = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

interface Props {
  year: number;
  month: number;
  income: number;
  expense: number;
  txCount: number;
  onOpenDetail: (year: number, month: number) => void;
  onUploadSuccess: () => void;
}

function fmt(n: number): string {
  if (n === 0) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "сая";
  if (Math.abs(n) >= 1_000) return Math.round(n / 1_000) + "K";
  return Math.round(n).toString();
}

export default function MonthRow({ year, month, income, expense, txCount, onOpenDetail, onUploadSuccess }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const balance = income - expense;
  const isEmpty = txCount === 0;

  useEffect(() => {
    if (!uploadOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUploadOpen(false);
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setUploadOpen(false);
      }
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClick);
    };
  }, [uploadOpen]);

  return (
    <div className={`relative grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
      isEmpty ? "opacity-50" : "hover:bg-blue-50/40"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-medium text-gray-500 w-12">{year}</span>
        <span className="text-sm font-medium text-gray-800">{MONTH_NAMES[month - 1]}</span>
        {!isEmpty && <span className="text-xs text-gray-400">· {txCount} гүйлгээ</span>}
      </div>

      <span className={`text-sm font-semibold tabular-nums ${income > 0 ? "text-green-600" : "text-gray-300"}`}>
        +{fmt(income)}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${expense > 0 ? "text-red-600" : "text-gray-300"}`}>
        −{fmt(expense)}
      </span>
      <span className={`text-sm font-semibold tabular-nums w-20 text-right ${
        balance === 0 ? "text-gray-300" : balance > 0 ? "text-blue-600" : "text-orange-600"
      }`}>
        {balance >= 0 ? "+" : ""}{fmt(balance)}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setUploadOpen(v => !v); }}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="Файл оруулах"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={() => onOpenDetail(year, month)}
          disabled={isEmpty}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Дэлгэрэнгүй харах"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {uploadOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">
              {year} оны {MONTH_NAMES[month - 1]} — файл оруулах
            </p>
            <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            Файл доторх гүйлгээ нь огнооноосоо хамаарч зөв сард байршина.
          </p>
          <FileUpload
            compact
            onSuccess={() => {
              setUploadOpen(false);
              onUploadSuccess();
            }}
          />
        </div>
      )}
    </div>
  );
}
