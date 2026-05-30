"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import SummaryCards from "./SummaryCards";
import TransactionTable from "./TransactionTable";
import UncategorizedSection from "./UncategorizedSection";
import CategoryPieChart from "./CategoryPieChart";
import DailyBarChart from "./DailyBarChart";
import BankBreakdownCards from "./BankBreakdownCards";
import CounterpartyInsights from "./CounterpartyInsights";

interface Report {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  uncategorizedCount: number;
  byCategory: { category: string; type: string; _sum: { amount: number }; _count: number }[];
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName: string; bankName?: string | null };
}

interface Props {
  year: number;
  month: number;
  onExternalChange?: () => void; // notify parent for refetches (e.g. drawer→timeline)
}

export default function MonthDetailContent({ year, month, onExternalChange }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `year=${year}&month=${month}`;
      const [r, t] = await Promise.all([
        fetch(`/api/reports?${qs}`).then(r => r.json()),
        fetch(`/api/transactions?${qs}`).then(r => r.json()),
      ]);
      setReport(r);
      setTransactions(t.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInternalUpdate = () => {
    fetchData();
    onExternalChange?.();
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return <p className="text-gray-400 text-center py-10">Мэдээлэл олдсонгүй</p>;
  }

  return (
    <div className="space-y-5">
      <SummaryCards
        totalIncome={report.totalIncome}
        totalExpense={report.totalExpense}
        balance={report.balance}
        incomeCount={report.incomeCount}
        expenseCount={report.expenseCount}
      />

      {/* Хэрэв 2+ банкны гүйлгээ байгаа бол банкаар breakdown харуулна */}
      <BankBreakdownCards transactions={transactions} />

      {report.uncategorizedCount > 0 && (
        <UncategorizedSection
          statementId=""
          count={report.uncategorizedCount}
          onUpdate={handleInternalUpdate}
          year={year}
          month={month}
        />
      )}

      {transactions.length > 0 && (
        <>
          <DailyBarChart year={year} month={month} transactions={transactions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryPieChart
              byCategory={report.byCategory}
              type="income"
              title="Орлогын ангилал"
            />
            <CategoryPieChart
              byCategory={report.byCategory}
              type="expense"
              title="Зарлагын ангилал"
            />
          </div>
        </>
      )}

      {transactions.length > 0 && <CounterpartyInsights year={year} month={month} />}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Гүйлгээний дэлгэрэнгүй</h3>
        <TransactionTable transactions={transactions} onUpdate={handleInternalUpdate} />
      </div>
    </div>
  );
}
