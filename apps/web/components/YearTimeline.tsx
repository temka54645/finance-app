"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Upload } from "lucide-react";
import YearAccordionRow from "./YearAccordionRow";
import FileUpload from "./FileUpload";
import { useDataRefresh } from "@/lib/use-data-refresh";

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
  uncategorizedCount?: number;
  banks?: BankData[];
}

interface YearData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  uncategorizedCount?: number;
  banks?: string[];
  months: MonthData[];
}

interface Props {
  onChange: () => void;
  /** Сонгосон жилүүд. Хоосон/өгөгдөөгүй бол бүгдийг харуулна. */
  years?: number[];
}

const STORAGE_KEY = "finmate.expandedYears";

function loadExpandedYears(): Set<number> {
  if (typeof window === "undefined") return new Set([new Date().getFullYear()]);
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.filter((n: unknown) => typeof n === "number"));
    }
  } catch {}
  return new Set([new Date().getFullYear()]);
}

function saveExpandedYears(set: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export default function YearTimeline({ onChange, years }: Props) {
  const [timeline, setTimeline] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(loadExpandedYears);
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

  // Хуулга орох / шинэчлэх үед timeline-ийг дахин татна.
  useDataRefresh(fetchTimeline);

  // Хэрэглэгч сараас буцаж ирсэн бол тэр жил рүү scroll хийнэ
  useEffect(() => {
    if (loading || timeline.length === 0) return;
    try {
      const last = window.sessionStorage.getItem("finmate.lastViewedYear");
      if (last) {
        const el = document.getElementById(`year-${last}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        window.sessionStorage.removeItem("finmate.lastViewedYear");
      }
    } catch {}
  }, [loading, timeline]);

  const handleToggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      saveExpandedYears(next);
      return next;
    });
  };

  // Upload-ийн дараа timeline-ийг refetch хийнэ — панелийг автоматаар хаахгүй.
  // Хэрэглэгч success banner дахь "Дашбоард руу очих" товчоор л хаана.
  const handleUploadRefetch = () => {
    fetchTimeline();
    onChange();
  };
  const handleUploadClose = () => {
    setUploadModalOpen(false);
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
            <FileUpload onSuccess={handleUploadRefetch} onRequestClose={handleUploadClose} />
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

  const filterSet = years && years.length > 0 ? new Set(years) : null;
  const visible = filterSet ? timeline.filter(yr => filterSet.has(yr.year)) : timeline;

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">Сонгосон жилд тохирох мэдээлэл алга</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map(yr => (
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
