"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, User, Building2, Tags, Tag, Plus, X, Loader2, Sparkles } from "lucide-react";
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
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_ICON_KEY,
  CategoryIcon,
} from "@/lib/custom-category-icons";

export default function CategoriesPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"income" | "expense">("expense");
  const [search, setSearch] = useState("");

  // Хэрэглэгчийн төрлөөр цоожилно — хувь хүн зөвхөн хувь хүний, байгууллага
  // зөвхөн байгууллагын ангиллыг харна. Энд солих боломжгүй.
  const sessionUserType = (session?.user as { userType?: string | null } | undefined)?.userType;
  const userType: UserType = sessionUserType === "business" ? "business" : "personal";

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
  // Сонгосон лого + хэрэглэгч өөрөө гар аргаар сонгосон эсэх + сонгогчийн нээлттэй байдал
  const [selectedIcon, setSelectedIcon] = useState<string>(DEFAULT_ICON_KEY);
  const [iconManual, setIconManual] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const resetIcon = () => {
    setSelectedIcon(DEFAULT_ICON_KEY);
    setIconManual(false);
    setPickerOpen(false);
  };

  // AI-аар нэрэнд тохирох лого тооцоолно. Амжилттай бол key-г буцаана.
  const suggestIcon = async (name: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/categories/suggest-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: tab }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.icon === "string" ? data.icon : null;
    } catch {
      return null;
    }
  };

  const handleSuggest = async () => {
    const name = newName.trim();
    if (!name || suggesting) return;
    setSuggesting(true);
    try {
      const icon = await suggestIcon(name);
      if (icon) {
        setSelectedIcon(icon);
        setIconManual(true); // AI-н санал болгосныг хүндэтгэж, нэмэх үед дахин дуудахгүй
      }
    } finally {
      setSuggesting(false);
    }
  };

  const pickIcon = (key: string) => {
    setSelectedIcon(key);
    setIconManual(true);
    setPickerOpen(false);
  };

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
      // Хэрэглэгч лого сонгоогүй бол нэрэнд нь тохирох логог AI-аар тооцоолно.
      let icon = selectedIcon;
      if (!iconManual && selectedIcon === DEFAULT_ICON_KEY) {
        const ai = await suggestIcon(name);
        if (ai) icon = ai;
      }
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: tab, userType, icon }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Нэмэхэд алдаа гарлаа");
        return;
      }
      setNewName("");
      resetIcon();
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

      {/* Горимын тэмдэг (зөвхөн харах) + хайлт */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold ${
            userType === "business"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-indigo-200 bg-indigo-50 text-indigo-700"
          }`}
        >
          {userType === "business" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {userType === "business" ? "Байгууллагын ангилал" : "Хувь хүний ангилал"}
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
          onClick={() => { setTab("income"); setError(""); resetIcon(); }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "income" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Орлого
        </button>
        <button
          onClick={() => { setTab("expense"); setError(""); resetIcon(); }}
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

        {/* Нэмэх форм — лого сонгогч + нэр + AI санал + нэмэх */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          {/* Лого сонгогч */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(o => !o)}
              title="Лого сонгох"
              className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border bg-white text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 ${
                pickerOpen ? "border-blue-500 ring-4 ring-blue-500/15" : "border-slate-200"
              }`}
            >
              <CategoryIcon iconKey={selectedIcon} className="h-5 w-5" />
            </button>

            {pickerOpen && (
              <>
                {/* Гадна талд дарвал хаах backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute left-0 top-[48px] z-20 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 px-1 text-xs font-semibold text-slate-500">Лого сонгох</p>
                  <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto">
                    {CATEGORY_ICON_OPTIONS.map(opt => {
                      const Icon = opt.Icon;
                      const active = opt.key === selectedIcon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => pickIcon(opt.key)}
                          title={opt.label}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                            active
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
            maxLength={40}
            placeholder={`Шинэ ${tab === "income" ? "орлогын" : "зарлагын"} ангиллын нэр...`}
            className="h-[42px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none"
          />

          {/* AI-аар лого санал болгох */}
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting || !newName.trim()}
            title="Нэрэнд тохирох логог AI-аар санал болгох"
            className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI лого
          </button>

          <button
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Нэмэх
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Лого сонгох эсвэл «AI лого» дарж нэрэнд тохирох логог автоматаар сонгуул. Сонгоогүй бол нэмэх үед AI өөрөө тааруулна.
        </p>
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
                  <CategoryIcon iconKey={cat.icon} className="h-4 w-4" />
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
