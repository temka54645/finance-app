"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, BarChart2, TrendingUp, TrendingDown, User, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { getIncomeGroups, getExpenseGroups, type UserType, type CategoryGroup } from "@/lib/categories";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute bottom-0 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link
            href="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Буцах"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              Орлого, зарлагын ангилал
            </h1>
            <p className="text-xs text-slate-500">
              {userType === "business" ? "Байгууллагын" : "Хувь хүний"} ангилал · нийт {totalItems}
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-6 py-8">
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
              <User className="w-3.5 h-3.5" />
              Хувь хүн
            </button>
            <button
              onClick={() => setUserType("business")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                userType === "business"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Байгууллага
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ангилал хайх..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
        </div>

        {/* Income / Expense tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab("income")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "income"
                ? "bg-emerald-100 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Орлого
          </button>
          <button
            onClick={() => setTab("expense")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "expense"
                ? "bg-rose-100 text-rose-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Зарлага
          </button>
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">
                &quot;{search}&quot; гэсэн ангилал олдсонгүй
              </p>
            </div>
          ) : filtered.map(group => {
            const GroupIcon = group.icon;
            return (
              <section
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <GroupIcon className="w-4 h-4" />
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
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
