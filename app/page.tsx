"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, ChevronDown, RefreshCw } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import SummaryCards from "@/components/SummaryCards";
import HighlightCards from "@/components/HighlightCards";
import UncategorizedSection from "@/components/UncategorizedSection";
import TransactionTable from "@/components/TransactionTable";

interface Highlight { amount: number; count: number }

interface Report {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  highlights: {
    bankFees: Highlight;
    salaryPaid: Highlight;
    taxes: Highlight;
    salaryReceived: Highlight;
  };
  uncategorizedCount: number;
  byCategory: { category: string; type: string; _sum: { amount: number }; _count: number }[];
  statements: { id: string; fileName: string; bankName?: string; uploadedAt: string }[];
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

export default function Home() {
  const [report, setReport] = useState<Report | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"upload" | "transactions" | "report">("upload");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, txRes] = await Promise.all([
        fetch(`/api/reports${selectedStatement ? `?statementId=${selectedStatement}` : ""}`),
        fetch(`/api/transactions${selectedStatement ? `?statementId=${selectedStatement}` : ""}`),
      ]);
      const [reportData, txData] = await Promise.all([reportRes.json(), txRes.json()]);
      setReport(reportData);
      setTransactions(txData.transactions);
    } finally {
      setLoading(false);
    }
  }, [selectedStatement]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUploadSuccess = () => {
    fetchData();
    setActiveTab("transactions");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Санхүүгийн дүн шинжилгээ</h1>
              <p className="text-xs text-gray-500">Банкны хуулга задлан шинжилгээ</p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {report && (
          <>
            <SummaryCards
              totalIncome={report.totalIncome}
              totalExpense={report.totalExpense}
              balance={report.balance}
              incomeCount={report.incomeCount}
              expenseCount={report.expenseCount}
            />
            {report.highlights && (
              <HighlightCards
                bankFees={report.highlights.bankFees}
                salaryPaid={report.highlights.salaryPaid}
                taxes={report.highlights.taxes}
                salaryReceived={report.highlights.salaryReceived}
              />
            )}
            {report.uncategorizedCount > 0 && (
              <UncategorizedSection
                statementId={selectedStatement}
                count={report.uncategorizedCount}
                onUpdate={fetchData}
              />
            )}
          </>
        )}

        {report?.statements && report.statements.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Хуулга шүүх:</label>
            <div className="relative">
              <select
                value={selectedStatement}
                onChange={e => setSelectedStatement(e.target.value)}
                className="pl-3 pr-8 py-2 border rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Бүгд</option>
                {report.statements.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.bankName ? `${s.bankName} — ` : ""}{s.fileName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(["upload", "transactions", "report"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab === "upload" ? "📁 Файл оруулах" : tab === "transactions" ? "📋 Гүйлгээнүүд" : "📊 Тайлан"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "upload" && (
              <FileUpload onSuccess={handleUploadSuccess} />
            )}

            {activeTab === "transactions" && (
              <TransactionTable transactions={transactions} onUpdate={fetchData} />
            )}

            {activeTab === "report" && report && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Категориор хуваарилалт</h3>
                {report.byCategory.length === 0 ? (
                  <p className="text-gray-400 text-sm">Мэдээлэл байхгүй байна</p>
                ) : (
                  <div className="space-y-2">
                    {report.byCategory
                      .sort((a, b) => b._sum.amount - a._sum.amount)
                      .map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${item.type === "income" ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-sm text-gray-700">{item.category}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                              {item.type === "income" ? "Орлого" : "Зарлага"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium text-sm ${item.type === "income" ? "text-green-600" : "text-red-600"}`}>
                              {item._sum.amount.toLocaleString("mn-MN")}₮
                            </p>
                            <p className="text-xs text-gray-400">{item._count} гүйлгээ</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
