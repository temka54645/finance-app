"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, User, Building2, Tags, Tag, Plus, X, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import AppShell from "@/components/AppShell";
import {
  getIncomeGroups,
  getExpenseGroups,
  getIncomeCategoryNames,
  getExpenseCategoryNames,
  type UserType,
  type CategoryGroup,
} from "@/lib/categories";
import { useCustomCategories } from "@/lib/use-custom-categories";

export default function CategoriesPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"income" | "expense">("expense");
  const [search, setSearch] = useState("");

  const sessionUserType = (session?.user as { userType?: string | null } | undefined)?.userType;
  const [userType, setUserType] = useState<UserType>("personal");

  useEffect(() => {
    if (sessionUserType === "business" || sessionUserType === "personal") {
      setUserType(sessionUserType);
    }
  }, [sessionUserType]);

  const groups: CategoryGroup[] = useMemo(
    () => (tab === "income" ? getIncomeGroups(userType) : getExpenseGroups(userType)),
    [tab, userType]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(i => i.name.toLowerCase().includes(q)),
      }))
      .filter(g => g.items.length > 0);
  }, [groups, search]);

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);

  // ── Хэрэглэгчийн өөрийн ангилал ──────────────────────────────────
  const { income: customIncome, expense: customExpense, reload } = useCustomCategories(userType);
  const customItems = tab === "income" ? customIncome : customExpense;
  const visibleCustom = useMemo(() => {
    if (!search.trim()) return customItems;
    const q = search.toLowerCase();
    return customItems.filter(c => c.name.toLowerCase().includes(q));
  }, [customItems, search]);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const staticNames = useMemo(
    () =>
      new Set(
        (tab === "income" ? getIncomeCategoryNames(userType) : getExpenseCategoryNames(userType)).map(n =>
          n.toLowerCase()
        )
      ),
    [tab, userType]
  );

  const addCategory = async () => {
    const name = newName.trim();
    setError("");
    if (!name) return;
    if (staticNames.has(name.toLowerCase())) {
      setError("Энэ ангилал каталогт аль хэдийн байна");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: tab, userType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Нэмэхэд алдаа гарлаа");
        return;
      }
      setNewName("");
      await reload();
    } finally {
      setAdding(false);
    }
  };

  const removeCategory = async (id: string) => {
    await fetch(`/api/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await reload();
  };

  return (
    <AppShell>
      {/* Гарчиг */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Орлого, зарлагын ангилал</h2>
            <p className="text-sm text-slate-500">
              {userType === "business" ? "Байгууллагын" : "Хувь хүний"} каталог · нийт {totalItems} ангилал
            </p>
          </div>
        </div>
      </div>

      {/* UserType switch + tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setUserType("personal")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              userType === "personal"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Хувь хүн
          </button>
          <button
            onClick={() => setUserType("business")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              userType === "business"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Байгууллага
          </button>
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ангилал хайх..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none"
          />
        </div>
      </div>

      {/* Income / Expense tabs */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => { setTab("income"); setError(""); }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "income" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Орлого
        </button>
        <button
          onClick={() => { setTab("expense"); setError(""); }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "expense" ? "bg-rose-100 text-rose-700" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          Зарлага
        </button>
      </div>

      {/* Миний ангилал — хэрэглэгч өөрөө нэмж/хасна */}
      <section className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">Миний ангилал</h3>
            <p className="text-xs text-slate-500">
              {userType === "business" ? "Байгууллагын" : "Хувь хүний"} {tab === "income" ? "орлогын" : "зарлагын"} өөрийн ангилал нэмж, хасна
            </p>
          </div>
        </div>

        {/* Нэмэх форм */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
            maxLength={40}
            placeholder={`Шинэ ${tab === "income" ? "орлогын" : "зарлагын"} ангиллын нэр...`}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none"
          />
          <button
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Нэмэх
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

        {/* Жагсаалт */}
        {visibleCustom.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleCustom.map(cat => (
              <div
                key={cat.id}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Tag className="h-4 w-4" />
                </div>
                <span className="flex-1 truncate text-sm font-medium text-slate-700" title={cat.name}>
                  {cat.name}
                </span>
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="flex-shrink-0 rounded-lg p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Устгах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            {search.trim() ? "Хайлтад тохирох өөрийн ангилал алга." : "Одоогоор өөрийн ангилал нэмээгүй байна."}
          </p>
        )}
      </section>

      {/* Каталогийн бүлгүүд */}
      <div className="space-y-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">&quot;{search}&quot; гэсэн ангилал олдсонгүй</p>
          </div>
        ) : (
          filtered.map(group => {
            const GroupIcon = group.icon;
            return (
              <section
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <GroupIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-slate-900">{group.name}</h3>
                    <p className="text-xs text-slate-500">{group.items.length} ангилал</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {group.items.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-md"
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cat.bg} ${cat.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
