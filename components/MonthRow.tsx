"use client";

import { useState, useRef, useEffect } from "react";
import { FolderOpen, Eye } from "lucide-react";
import InlineFileUpload from "./InlineFileUpload";

interface MonthData {
  month: number;
  income: number;
  expense: number;
  txCount: number;
}

interface Props {
  year: number;
  data: MonthData;
  onOpenDetail: (year: number, month: number) => void;
  onUploaded: () => void;
}

const MONTH_NAMES = [
  "1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар",
  "7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар",
];

function fmt(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function MonthRow({ year, data, onOpenDetail, onUploaded }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasData = data.txCount > 0;
  const balance = data.income - data.expense;

  useEffect(() => {
    if (!uploadOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUploadOpen(false);
    const onClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setUploadOpen(false);
      }
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [uploadOpen]);

  const handleUploadSuccess = () => {
    setUploadOpen(false);
    onUploaded();
  };

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors hover:bg-slate-50 ${
        !hasData ? "opacity-50" : ""
      }`}
    >
      <span className="w-20 flex-shrink-0 text-sm font-medium text-slate-700">
        {MONTH_NAMES[data.month - 1]}
      </span>

      <span className={`w-32 text-right text-sm tabular-nums ${hasData && data.income > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
        {hasData && data.income > 0 ? "+" + fmt(data.income) : "—"}
      </span>

      <span className={`w-32 text-right text-sm tabular-nums ${hasData && data.expense > 0 ? "text-rose-600 font-medium" : "text-slate-400"}`}>
        {hasData && data.expense > 0 ? "−" + fmt(data.expense) : "—"}
      </span>

      <span className={`flex-1 text-right text-sm tabular-nums font-medium ${
        !hasData ? "text-slate-400" :
        balance >= 0 ? "text-blue-600" : "text-orange-600"
      }`}>
        {hasData ? (balance >= 0 ? "+" : "−") + fmt(Math.abs(balance)) : "—"}
      </span>

      {hasData && (
        <span className="text-xs text-slate-400 w-16 text-right">
          {data.txCount} гүйлгээ
        </span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setUploadOpen(v => !v)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Файл оруулах"
          >
            <FolderOpen className="h-4 w-4" />
          </button>

          {uploadOpen && (
            <div
              ref={popoverRef}
              className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60"
            >
              <p className="mb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                {year} оны {MONTH_NAMES[data.month - 1]}
              </p>
              <InlineFileUpload onSuccess={handleUploadSuccess} />
            </div>
          )}
        </div>

        <button
          onClick={() => hasData && onOpenDetail(year, data.month)}
          disabled={!hasData}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
          title={hasData ? "Дэлгэрэнгүй харах" : "Гүйлгээ байхгүй"}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
