"use client";

import { useState } from "react";
import { Pencil, Check, X, Trash2, TrendingUp, TrendingDown } from "lucide-react";

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
  transactions: Transaction[];
  onUpdate: () => void;
}

const INCOME_CATEGORIES = ["Цалин", "Орлого", "Шилжүүлэг хүлээн авсан", "Буцаалт", "Хүү", "Бусад орлого"];
const EXPENSE_CATEGORIES = ["Хоол & Ресторан", "Тээвэр", "Худалдаа", "Коммунал", "Эрүүл мэнд", "Боловсрол", "Цэвэрлэгээ & Засвар", "Бусад зарлага"];

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function TransactionTable({ transactions, onUpdate }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ type: string; category: string; note: string }>({ type: "", category: "", note: "" });

  const startEdit = (t: Transaction) => {
    setEditId(t.id);
    setEditData({ type: t.type, category: t.category, note: t.note ?? "" });
  };

  const save = async () => {
    if (!editId) return;
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, ...editData }),
    });
    setEditId(null);
    onUpdate();
  };

  const remove = async (id: string) => {
    if (!confirm("Гүйлгээг устгах уу?")) return;
    await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdate();
  };

  const categories = editData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (transactions.length === 0) {
    return <p className="text-center text-gray-400 py-10">Гүйлгээ байхгүй байна</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Огноо</th>
            <th className="px-4 py-3 text-left">Тайлбар</th>
            <th className="px-4 py-3 text-left">Төрөл</th>
            <th className="px-4 py-3 text-left">Категори</th>
            <th className="px-4 py-3 text-right">Дүн</th>
            <th className="px-4 py-3 text-left">Тэмдэглэл</th>
            <th className="px-4 py-3 text-center">Үйлдэл</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {new Date(t.date).toLocaleDateString("mn-MN")}
              </td>
              <td className="px-4 py-3 max-w-xs">
                <p className="truncate text-gray-800">{t.description}</p>
                {t.statement?.bankName && (
                  <p className="text-xs text-gray-400">{t.statement.bankName}</p>
                )}
              </td>
              <td className="px-4 py-3">
                {editId === t.id ? (
                  <select
                    value={editData.type}
                    onChange={e => setEditData(prev => ({ ...prev, type: e.target.value, category: "" }))}
                    className="border rounded px-2 py-1 text-xs w-24"
                  >
                    <option value="income">Орлого</option>
                    <option value="expense">Зарлага</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {t.type === "income" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {t.type === "income" ? "Орлого" : "Зарлага"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {editId === t.id ? (
                  <select
                    value={editData.category}
                    onChange={e => setEditData(prev => ({ ...prev, category: e.target.value }))}
                    className="border rounded px-2 py-1 text-xs w-36"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <span className="text-gray-700">{t.category}</span>
                )}
              </td>
              <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                t.type === "income" ? "text-green-600" : "text-red-600"
              }`}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </td>
              <td className="px-4 py-3">
                {editId === t.id ? (
                  <input
                    value={editData.note}
                    onChange={e => setEditData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Тэмдэглэл..."
                    className="border rounded px-2 py-1 text-xs w-32"
                  />
                ) : (
                  <span className="text-gray-400 text-xs">{t.note || "—"}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  {editId === t.id ? (
                    <>
                      <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(t)} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(t.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
