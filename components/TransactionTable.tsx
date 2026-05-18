"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Pencil, Check, X, Trash2, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";
import { getCategoryStyle } from "@/lib/category-icons";
import { getIncomeGroups, getExpenseGroups, type UserType } from "@/lib/categories";

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

type TypeFilter = "all" | "income" | "expense";

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

// Бүх text хайлтад тохирох мөр гаргах helper
function matchesSearch(t: Transaction, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const dateLocal = new Date(t.date).toLocaleDateString("mn-MN").toLowerCase();
  const haystack = [
    dateLocal,
    new Date(t.date).toISOString().slice(0, 10),
    t.description.toLowerCase(),
    t.category.toLowerCase(),
    t.type === "income" ? "орлого income" : "зарлага expense",
    String(t.amount),
    t.note?.toLowerCase() ?? "",
    t.statement?.fileName?.toLowerCase() ?? "",
    t.statement?.bankName?.toLowerCase() ?? "",
  ].join(" ");
  return haystack.includes(q);
}

export default function TransactionTable({ transactions, onUpdate }: Props) {
  const { data: session } = useSession();
  const userType: UserType = ((session?.user as { userType?: string | null } | undefined)?.userType === "business")
    ? "business"
    : "personal";

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ type: string; category: string; note: string }>({ type: "", category: "", note: "" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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

  // Editing dropdown-д харагдах категори бүлэглэгдсэн, userType-аас хамаарна
  const categoryGroups = useMemo(
    () => editData.type === "income" ? getIncomeGroups(userType) : getExpenseGroups(userType),
    [editData.type, userType]
  );

  // Filter + search
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (!matchesSearch(t, search)) return false;
      return true;
    });
  }, [transactions, typeFilter, search]);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Огноо, тайлбар, дүн, категори... ямар ч талбараар хайх"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { v: "all" as TypeFilter, label: "Бүгд", icon: Filter },
            { v: "income" as TypeFilter, label: "Орлого", icon: TrendingUp },
            { v: "expense" as TypeFilter, label: "Зарлага", icon: TrendingDown },
          ].map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === v
                  ? v === "income"
                    ? "bg-green-100 text-green-700"
                    : v === "expense"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="text-xs text-slate-500 px-1">
        {filtered.length} / {transactions.length} гүйлгээ
        {search.trim() && ` · "${search}" хайлт`}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">
          {transactions.length === 0 ? "Гүйлгээ байхгүй байна" : "Шүүлтэд тохирох гүйлгээ олдсонгүй"}
        </p>
      ) : (
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
              {filtered.map(t => (
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
                        className="border rounded px-2 py-1 text-xs w-44"
                      >
                        <option value="">— Сонгох —</option>
                        {categoryGroups.map(g => (
                          <optgroup key={g.id} label={g.name}>
                            {g.items.map(i => (
                              <option key={i.id} value={i.name}>{i.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (() => {
                      const style = getCategoryStyle(t.category);
                      const Icon = style.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${style.bg} ${style.text}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {t.category}
                        </span>
                      );
                    })()}
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
      )}
    </div>
  );
}
