"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Calendar } from "lucide-react";
import YearAccordionRow from "./YearAccordionRow";
import FileUpload from "./FileUpload";

interface MonthData {
  month: number;
  income: number;
  expense: number;
  txCount: number;
}

interface YearData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
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

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timeline");
      const data = await res.json();
      setTimeline(data.timeline ?? []);
      if (data.timeline && data.timeline.length > 0) {
        setExpandedYears(prev => {
          const next = new Set(prev);
          next.add(data.timeline[0].year);
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const handleRefetch = useCallback(() => {
    fetchTimeline();
    onChange();
  }, [fetchTimeline, onChange]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (loading && timeline.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Эхний statement-ээ оруулна уу
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Банкны хуулга оруулсны дараа жил жилээр гүйлгээ нь энд харагдана.
        </p>
        <div className="max-w-sm mx-auto">
          <FileUpload onSuccess={handleRefetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map(y => (
        <YearAccordionRow
          key={y.year}
          year={y.year}
          totalIncome={y.totalIncome}
          totalExpense={y.totalExpense}
          balance={y.balance}
          txCount={y.txCount}
          months={y.months}
          expanded={expandedYears.has(y.year)}
          onToggle={() => toggleYear(y.year)}
          onUploadSuccess={handleRefetch}
        />
      ))}
    </div>
  );
}
