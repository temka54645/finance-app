"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Upload } from "lucide-react";
import YearAccordionRow from "./YearAccordionRow";
import FileUpload from "./FileUpload";

interface BankData {
  bankName: string | null;
  income: number;
  expense: number;
  txCount: number;
}

interface MonthData {
  month: number;
  income: number;
  expense: number;
  txCount: number;
  banks?: BankData[];
}

interface YearData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  banks?: string[];
  months: MonthData[];
}

interface Props {
  onChange: () => void;
}

export default function YearTimeline({ onChange }: Props) {
  const [timeline, setTimeline] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([new Date().getFullYear()])
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timeline");
      const data = await res.json();
      setTimeline(data.timeline ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleToggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchTimeline();
    onChange();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-500 text-sm font-medium mb-1">Гүйлгээний мэдээлэл байхгүй байна</p>
        <p className="text-slate-400 text-xs mb-6">Эхний statement-ээ оруулаад эхлээрэй</p>
        {uploadModalOpen ? (
          <div className="max-w-sm mx-auto">
            <FileUpload onSuccess={handleUploadSuccess} />
          </div>
        ) : (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all"
          >
            <Upload className="h-4 w-4" />
            Файл оруулах
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map(yr => (
        <YearAccordionRow
          key={yr.year}
          data={yr}
          isOpen={expandedYears.has(yr.year)}
          onToggle={() => handleToggleYear(yr.year)}
        />
      ))}
    </div>
  );
}
