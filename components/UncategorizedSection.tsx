"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { getIncomeGroups, getExpenseGroups, type UserType } from "@/lib/categories";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
}

interface Props {
  statementId: string;
  count: number;
  onUpdate: () => void;
  /** Year/month filter — байвал тухайн сарын танигдаагүй гүйлгээг л харуулна */
  year?: number;
  month?: number;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function UncategorizedSection({ statementId, count, onUpdate, year, month }: Props) {
  const { data: session } = useSession();
  const userType: UserType = ((session?.user as { userType?: string | null } | undefined)?.userType === "business")
    ? "business"
    : "personal";

  const incomeGroups = useMemo(() => getIncomeGroups(userType), [userType]);
  const expenseGroups = useMemo(() => getExpenseGroups(userType), [userType]);

  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchUncategorized = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ uncategorized: "true" });
      if (statementId) params.set("statementId", statementId);
      // Year/month filter — энэ нь header дээрх count-тай таарч байх ёстой
      if (typeof year === "number" && !isNaN(year)) params.set("year", String(year));
      if (typeof month === "number" && !isNaN(month)) params.set("month", String(month));
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions);
    } finally {
      setLoading(false);
    }
  }, [statementId, year, month]);

  useEffect(() => {
    if (expanded) fetchUncategorized();
  }, [expanded, fetchUncategorized]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === transactions.length) setSelected(new Set());
    else setSelected(new Set(transactions.map(t => t.id)));
  };

  const updateSingle = async (id: string, category: string) => {
    setSaving(true);
    try {
      await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, category }),
      });
      await fetchUncategorized();
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const applyBulk = async () => {
    if (!bulkCategory || selected.size === 0) return;
    setSaving(true);
    try {
      await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), category: bulkCategory }),
      });
      setSelected(new Set());
      setBulkCategory("");
      await fetchUncategorized();
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  if (count === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="text-left">
            <p className="font-semibold text-amber-900">
              {count} тодорхойлогдоогүй гүйлгээ
            </p>
            <p className="text-xs text-amber-700">
              Гар аргаар ангилахын тулд дарна уу
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
      </button>

      {expanded && (
        <div className="border-t border-amber-200 bg-white">
          {/* Bulk action toolbar */}
          {transactions.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.size === transactions.length && transactions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded"
                />
                Бүгдийг сонгох
              </label>
              {selected.size > 0 && (
                <>
                  <span className="text-sm text-amber-700">({selected.size} сонгосон)</span>
                  <select
                    value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    className="border rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
                  >
                    <option value="">Категори сонгох...</option>
                    {incomeGroups.map(g => (
                      <optgroup key={`in-${g.id}`} label={`📈 ${g.name}`}>
                        {g.items.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                      </optgroup>
                    ))}
                    {expenseGroups.map(g => (
                      <optgroup key={`out-${g.id}`} label={`📉 ${g.name}`}>
                        {g.items.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={applyBulk}
                    disabled={!bulkCategory || saving}
                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Хадгалах
                  </button>
                </>
              )}
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></div>
            ) : transactions.length === 0 ? (
              <p className="p-8 text-center text-gray-400 text-sm">Тодорхойлогдоогүй гүйлгээ байхгүй</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map(t => {
                  const groups = t.type === "income" ? incomeGroups : expenseGroups;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(t.date).toLocaleDateString("mn-MN")} ·{" "}
                          <span className={t.type === "income" ? "text-green-600" : "text-red-600"}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </span>
                        </p>
                      </div>
                      <select
                        defaultValue=""
                        onChange={e => e.target.value && updateSingle(t.id, e.target.value)}
                        disabled={saving}
                        className="border rounded px-2 py-1 text-xs w-48"
                      >
                        <option value="" disabled>Категори сонгох...</option>
                        {groups.map(g => (
                          <optgroup key={g.id} label={g.name}>
                            {g.items.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
