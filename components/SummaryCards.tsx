"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Props {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { style: "currency", currency: "MNT", maximumFractionDigits: 0 });
}

export default function SummaryCards({ totalIncome, totalExpense, balance, incomeCount, expenseCount }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-green-700">Нийт орлого</span>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-2xl font-bold text-green-800">{fmt(totalIncome)}</p>
        <p className="text-xs text-green-600 mt-1">{incomeCount} гүйлгээ</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-red-700">Нийт зарлага</span>
          <TrendingDown className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-2xl font-bold text-red-800">{fmt(totalExpense)}</p>
        <p className="text-xs text-red-600 mt-1">{expenseCount} гүйлгээ</p>
      </div>

      <div className={`border rounded-xl p-4 ${balance >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>Үлдэгдэл</span>
          <Wallet className={`w-5 h-5 ${balance >= 0 ? "text-blue-500" : "text-orange-500"}`} />
        </div>
        <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-800" : "text-orange-800"}`}>{fmt(balance)}</p>
        <p className={`text-xs mt-1 ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
          {balance >= 0 ? "Ашигтай" : "Алдагдалтай"}
        </p>
      </div>
    </div>
  );
}
