"use client";

import { useState, useMemo, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Pencil, Check, X, Trash2, TrendingUp, TrendingDown, Search, Filter, Landmark,
  ChevronDown, ChevronUp, RotateCcw, ArrowUp, ArrowDown,
  CheckSquare, Square, Tag, Loader2,
} from "lucide-react";
import { getCategoryStyle } from "@/lib/category-icons";
import { resolveCustomCategoryIcon } from "@/lib/custom-category-icons";
import { useCustomCategories } from "@/lib/use-custom-categories";
import { getIncomeGroups, getExpenseGroups, type UserType } from "@/lib/categories";
import { getBankMeta } from "@/lib/bankMeta";
import BankBadge from "./BankBadge";
import {
  parseQuery, applyAll,
  type ExtraFilters, type SortKey, type SortDir,
} from "@/lib/transaction-filter";

interface Transaction {
  id: string;
  date: string;
  description: string;
  counterparty?: string | null;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName: string; bankName?: string | null };
}

type TypeFilter = "all" | "income" | "expense";

interface Props {
  transactions: Transaction[];
  onUpdate: () => void;
  /** Эхний төрлийн шүүлт (жишээ нь хяналтын самбарын картаас орж ирэхэд). */
  initialType?: TypeFilter;
  /** Дэвшилтэт шүүлтийн самбарыг анхдагчаар нээлттэй харуулах (задаргааны хуудас). */
  defaultAdvancedOpen?: boolean;
  /**
   * Lazy горим ("Бүгд" жил): гүйлгээ хараахан ачаалаагүй. Шүүлтийн хэрэгслүүд
   * харагдах боловч жагсаалт хоосон; хэрэглэгч шүүлт хийж эхлэхэд `onRequestLoad`
   * дуудагдаж бүх гүйлгээ ачаална.
   */
  lazy?: boolean;
  /** Lazy үед хэрэглэгч шүүлт хийж эхлэхэд гүйлгээг ачаалуулах callback. */
  onRequestLoad?: () => void;
  /** Гүйлгээ ачаалж буй эсэх — хүснэгтийн биед spinner харуулна. */
  loading?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function TransactionTable({ transactions, onUpdate, initialType = "all", defaultAdvancedOpen = false, lazy = false, onRequestLoad, loading = false }: Props) {
  const { data: session } = useSession();
  const userType: UserType = ((session?.user as { userType?: string | null } | undefined)?.userType === "business")
    ? "business"
    : "personal";
  const { income: customIncome, expense: customExpense } = useCustomCategories(userType);

  // Хэрэглэгчийн нэмсэн ангиллын нэр → сонгосон лого (icon key) хайлт.
  const customIconByName = useMemo(() => {
    const m = new Map<string, string | null | undefined>();
    for (const c of [...customIncome, ...customExpense]) m.set(c.name, c.icon);
    return m;
  }, [customIncome, customExpense]);

  // Editing state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ type: string; category: string; note: string }>({ type: "", category: "", note: "" });

  // Filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [categorySet, setCategorySet] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMinStr, setAmountMinStr] = useState("");
  const [amountMaxStr, setAmountMaxStr] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard: '/' хайлтад focus, Esc хайлт цэвэрлэх
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Банк / категори жагсаалт
  const bankOptions = useMemo(() => {
    const map = new Map<string, { key: string; meta: ReturnType<typeof getBankMeta>; count: number }>();
    for (const t of transactions) {
      const bn = t.statement?.bankName ?? null;
      const meta = getBankMeta(bn);
      const key = bn?.toLowerCase() ?? "unknown";
      const ex = map.get(key);
      if (ex) ex.count++;
      else map.set(key, { key, meta, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [transactions]);
  const showBankFilter = bankOptions.length > 1;

  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  // Parser-аар query
  const parsedQuery = useMemo(() => parseQuery(search), [search]);

  const extra: ExtraFilters = useMemo(() => ({
    typeFilter,
    bankFilter,
    categories: categorySet,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    amountMin: amountMinStr ? Number(amountMinStr.replace(/[, _]/g, "")) : undefined,
    amountMax: amountMaxStr ? Number(amountMaxStr.replace(/[, _]/g, "")) : undefined,
  }), [typeFilter, bankFilter, categorySet, dateFrom, dateTo, amountMinStr, amountMaxStr]);

  const filtered = useMemo(
    () => applyAll(transactions, parsedQuery, extra, sortKey, sortDir),
    [transactions, parsedQuery, extra, sortKey, sortDir]
  );

  // Шүүгдсэн нийт
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const hasAnyFilter =
    !!search.trim() ||
    typeFilter !== "all" ||
    bankFilter !== "all" ||
    categorySet.size > 0 ||
    !!dateFrom || !!dateTo ||
    !!amountMinStr || !!amountMaxStr;

  // Lazy ("Бүгд") горим: хэрэглэгч ямар нэг шүүлт хийж эхэлмэгц бүх гүйлгээг
  // ачаалуулна. Шүүлт идэвхжмэгц parent loadAll=true болгож, lazy унтарна.
  useEffect(() => {
    if (lazy && hasAnyFilter) onRequestLoad?.();
  }, [lazy, hasAnyFilter, onRequestLoad]);

  const resetAll = () => {
    setSearch("");
    setTypeFilter("all");
    setBankFilter("all");
    setCategorySet(new Set());
    setDateFrom("");
    setDateTo("");
    setAmountMinStr("");
    setAmountMaxStr("");
  };

  const toggleCategory = (c: string) => {
    setCategorySet(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

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

  // Ангилал хийх явцыг хурдасгана: Enter → хадгалах, Esc → болих.
  // Ингэснээр хол байрлах ✓ товч руу зайлшгүй очих/scroll хийх шаардлагагүй.
  const onEditKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditId(null);
    }
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

  const categoryGroups = useMemo(
    () => editData.type === "income" ? getIncomeGroups(userType) : getExpenseGroups(userType),
    [editData.type, userType]
  );

  // Bulk selection helpers
  const visibleIds = useMemo(() => filtered.map(t => t.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someVisibleSelected = visibleIds.some(id => selected.has(id));
  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  // Сонгогдсон гүйлгээнүүдийн төрөл — bulk-assign-д зөв категори санал болгох
  const selectedTxs = useMemo(
    () => transactions.filter(t => selected.has(t.id)),
    [transactions, selected]
  );
  const selectedType: "income" | "expense" | "mixed" | null = useMemo(() => {
    if (selectedTxs.length === 0) return null;
    const types = new Set(selectedTxs.map(t => t.type));
    if (types.size === 1) return (types.values().next().value as "income" | "expense");
    return "mixed";
  }, [selectedTxs]);

  // Bulk select dropdown-д харуулах группүүд: бүх төрөл ижил бол тухайн төрлийнхөө,
  // холимог бол хоёуланг (label-аар тэмдэглэнэ)
  const bulkGroups = useMemo(() => {
    if (selectedType === "income") {
      return getIncomeGroups(userType).map(g => ({ ...g, prefix: "" }));
    }
    if (selectedType === "expense") {
      return getExpenseGroups(userType).map(g => ({ ...g, prefix: "" }));
    }
    // mixed
    return [
      ...getIncomeGroups(userType).map(g => ({ ...g, prefix: "Орлого · " })),
      ...getExpenseGroups(userType).map(g => ({ ...g, prefix: "Зарлага · " })),
    ];
  }, [selectedType, userType]);

  const applyBulkCategory = async () => {
    if (!bulkCategory || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), category: bulkCategory }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error ?? "Шинэчлэх амжилтгүй боллоо");
        return;
      }
      setBulkCategory("");
      clearSelection();
      onUpdate();
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setBulkBusy(false);
    }
  };

  const applyBulkType = async (newType: "income" | "expense") => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} гүйлгээний төрлийг "${newType === "income" ? "Орлого" : "Зарлага"}" болгох уу?\n(Категорийг та дараа нь шинэчилнэ үү — одоогийн категори тохирохгүй байж магадгүй)`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), type: newType }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error ?? "Шинэчлэх амжилтгүй боллоо");
        return;
      }
      onUpdate();
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setBulkBusy(false);
    }
  };

  const sortHeader = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sortKey === key;
    return (
      <button
        onClick={() => {
          if (active) setSortDir(d => d === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
        }}
        className={`inline-flex items-center gap-1 ${align === "right" ? "ml-auto" : ""} ${active ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
      >
        {label}
        {active && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: search + quick filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Хайх — энгийн үг эсвэл "-хас" / cat:хоол / >50000 / 2024-03 ...'
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-20 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button
                onClick={() => setSearch("")}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                title="Цэвэрлэх (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowSyntaxHelp(s => !s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${showSyntaxHelp ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              title="Syntax заавар"
            >
              ?
            </button>
          </div>
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
        <button
          onClick={() => setAdvancedOpen(o => !o)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            advancedOpen ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Дэвшилтэт
          {advancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Syntax help */}
      {showSyntaxHelp && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 space-y-1">
          <p className="font-semibold mb-1">Хайлтын syntax</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <div><span className="bg-white px-1 rounded">такси</span> — текст агуулна</div>
            <div><span className="bg-white px-1 rounded">-хас</span> — энэ үгийг агуулсныг хасна</div>
            <div><span className="bg-white px-1 rounded">&quot;яг тэр&quot;</span> — яг хэллэг</div>
            <div><span className="bg-white px-1 rounded">cat:хоол</span> — категори</div>
            <div><span className="bg-white px-1 rounded">bank:хас</span> — банк</div>
            <div><span className="bg-white px-1 rounded">note:такси</span> — тэмдэглэлд</div>
            <div><span className="bg-white px-1 rounded">desc:atm</span> — тайлбар/харьцагч</div>
            <div><span className="bg-white px-1 rounded">t:income</span> / <span className="bg-white px-1 rounded">t:expense</span></div>
            <div><span className="bg-white px-1 rounded">&gt;50000</span> / <span className="bg-white px-1 rounded">&lt;10000</span></div>
            <div><span className="bg-white px-1 rounded">&gt;=2024-03-01</span> / <span className="bg-white px-1 rounded">&lt;=2024-06</span></div>
            <div><span className="bg-white px-1 rounded">2024-03-15</span> — яг тэр өдөр</div>
            <div className="text-blue-700">олон шүүлт хоорондоо AND-аар нэгдэнэ</div>
          </div>
        </div>
      )}

      {/* Advanced panel */}
      {advancedOpen && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
          {/* Категори multi-select */}
          {categoryOptions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Категори</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {categoryOptions.map(({ category, count }) => {
                  const active = categorySet.has(category);
                  const style = getCategoryStyle(category);
                  return (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 transition-all ${
                        active
                          ? `${style.bg} ${style.text} ring-2 ring-blue-400`
                          : `bg-white text-slate-600 ring-slate-200 hover:bg-slate-100`
                      }`}
                    >
                      {category} · {count}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Огноо */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Огноо</p>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Дүн */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Дүн (₮)</p>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountMinStr}
                  onChange={e => setAmountMinStr(e.target.value)}
                  placeholder="Min"
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountMaxStr}
                  onChange={e => setAmountMaxStr(e.target.value)}
                  placeholder="Max"
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Эрэмбэлэх</p>
              <div className="flex items-center gap-1">
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="date">Огноо</option>
                  <option value="amount">Дүн</option>
                  <option value="description">Тайлбар</option>
                  <option value="category">Категори</option>
                </select>
                <button
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                  title={sortDir === "asc" ? "Өсөх" : "Буурах"}
                >
                  {sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank filter chips */}
      {showBankFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Landmark className="h-3 w-3" /> Банк:
          </span>
          <button
            onClick={() => setBankFilter("all")}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ring-1 ${
              bankFilter === "all"
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Бүгд · {transactions.length}
          </button>
          {bankOptions.map(b => {
            const active = bankFilter === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setBankFilter(b.key)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? `${b.meta.className} ring-2`
                    : `${b.meta.className} opacity-60 hover:opacity-100`
                }`}
                title={b.meta.fullName}
              >
                <Landmark className="h-3 w-3" />
                {b.meta.shortName} · {b.count}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter chips */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {typeFilter !== "all" && (
            <FilterChip onClear={() => setTypeFilter("all")} label={typeFilter === "income" ? "Орлого" : "Зарлага"} />
          )}
          {bankFilter !== "all" && (
            <FilterChip onClear={() => setBankFilter("all")} label={`Банк: ${bankFilter}`} />
          )}
          {Array.from(categorySet).map(c => (
            <FilterChip key={c} onClear={() => toggleCategory(c)} label={`cat: ${c}`} />
          ))}
          {dateFrom && <FilterChip onClear={() => setDateFrom("")} label={`≥ ${dateFrom}`} />}
          {dateTo && <FilterChip onClear={() => setDateTo("")} label={`≤ ${dateTo}`} />}
          {amountMinStr && <FilterChip onClear={() => setAmountMinStr("")} label={`≥ ${fmt(Number(amountMinStr))}`} />}
          {amountMaxStr && <FilterChip onClear={() => setAmountMaxStr("")} label={`≤ ${fmt(Number(amountMaxStr))}`} />}
          {search.trim() && <FilterChip onClear={() => setSearch("")} label={`"${search.trim()}"`} />}
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-0.5 ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            Бүгдийг арилгах
          </button>
        </div>
      )}

      {/* Invalid hint */}
      {parsedQuery.invalid.length > 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Танигдаагүй хайлтын хэсэг: {parsedQuery.invalid.map(s => <code key={s} className="mx-1">{s}</code>)}
        </p>
      )}

      {/* Status row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <div className="text-slate-500">
          {lazy && !hasAnyFilter ? (
            <span className="text-slate-400">Шүүлт хийж эхэлснээр гүйлгээ ачаална</span>
          ) : (
            <><span className="font-semibold text-slate-700">{filtered.length}</span> / {transactions.length} гүйлгээ</>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 font-medium">
            <span className="text-green-600">+ {fmt(totals.income)}</span>
            <span className="text-red-600">− {fmt(totals.expense)}</span>
            <span className={totals.balance >= 0 ? "text-slate-700" : "text-rose-700"}>
              = {fmt(totals.balance)}
            </span>
          </div>
        )}
      </div>

      {/* Bulk action bar — selection байх үед */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 rounded-xl border border-blue-300 bg-blue-50/95 backdrop-blur px-3 py-2 shadow-md shadow-blue-500/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-900">
              <CheckSquare className="w-4 h-4" />
              {selected.size} сонгосон
              {selectedType === "mixed" && (
                <span className="ml-2 text-[11px] font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  ⚠ холимог төрөл
                </span>
              )}
            </span>

            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-700" />
              <select
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}
                disabled={bulkBusy}
                className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50 min-w-[12rem]"
              >
                <option value="">— Категори сонгох —</option>
                {bulkGroups.map(g => (
                  <optgroup key={g.id} label={`${g.prefix}${g.name}`}>
                    {g.items.map(i => (
                      <option key={i.id} value={i.name}>{i.name}</option>
                    ))}
                  </optgroup>
                ))}
                {(() => {
                  const custom =
                    selectedType === "income" ? customIncome :
                    selectedType === "expense" ? customExpense :
                    [...customIncome, ...customExpense];
                  return custom.length > 0 ? (
                    <optgroup label="Миний ангилал">
                      {custom.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  ) : null;
                })()}
              </select>
              <button
                onClick={applyBulkCategory}
                disabled={!bulkCategory || bulkBusy}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Хэрэглэх
              </button>
            </div>

            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => applyBulkType("income")}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-green-700 hover:bg-green-50 disabled:opacity-40"
                title="Сонгосон гүйлгээг бүгдийг Орлого болгох"
              >
                <TrendingUp className="w-3 h-3" /> Орлого
              </button>
              <button
                onClick={() => applyBulkType("expense")}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-40"
                title="Сонгосон гүйлгээг бүгдийг Зарлага болгох"
              >
                <TrendingDown className="w-3 h-3" /> Зарлага
              </button>
            </div>

            <button
              onClick={clearSelection}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
              title="Сонголтыг арилгах"
            >
              <X className="w-3 h-3" />
              Цэвэрлэх
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">
          {lazy && !hasAnyFilter
            ? "Шүүлт хийж эхэлснээр гүйлгээ энд ачаалагдана"
            : transactions.length === 0
              ? "Гүйлгээ байхгүй байна"
              : "Шүүлтэд тохирох гүйлгээ олдсонгүй"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-3 w-8">
                  <button
                    onClick={toggleAllVisible}
                    className="inline-flex items-center justify-center text-slate-500 hover:text-blue-600"
                    title={allVisibleSelected ? "Бүгдийн сонголтыг хасах" : "Харагдаж буй бүгдийг сонгох"}
                    aria-label="Бүгдийг сонгох"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : someVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 opacity-60" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">{sortHeader("date", "Огноо")}</th>
                <th className="px-4 py-3 text-left">{sortHeader("description", "Тайлбар")}</th>
                <th className="px-4 py-3 text-left">Харьцсан данс</th>
                <th className="px-4 py-3 text-left">Төрөл</th>
                <th className="px-4 py-3 text-left">{sortHeader("category", "Категори")}</th>
                <th className="px-4 py-3 text-right">{sortHeader("amount", "Дүн", "right")}</th>
                <th className="px-4 py-3 text-left">Тэмдэглэл</th>
                <th className="px-4 py-3 text-center sticky right-0 z-20 bg-gray-50">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => {
                const isSelected = selected.has(t.id);
                return (
                <tr
                  key={t.id}
                  className={`transition-colors ${isSelected ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-3 py-3 w-8">
                    <button
                      onClick={() => toggleRow(t.id)}
                      className="inline-flex items-center justify-center text-slate-400 hover:text-blue-600"
                      aria-label={isSelected ? "Сонголтоос хасах" : "Сонгох"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString("mn-MN")}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-800" title={t.description}>{t.description}</p>
                    {showBankFilter && (
                      <div className="mt-1">
                        <BankBadge bankName={t.statement?.bankName ?? null} size="sm" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[12rem]">
                    {t.counterparty ? (
                      <span className="block truncate text-xs text-slate-600" title={t.counterparty}>
                        {t.counterparty}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editId === t.id ? (
                      <select
                        value={editData.type}
                        onChange={e => setEditData(prev => ({ ...prev, type: e.target.value, category: "" }))}
                        onKeyDown={onEditKeyDown}
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
                        onKeyDown={onEditKeyDown}
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
                        {(editData.type === "income" ? customIncome : customExpense).length > 0 && (
                          <optgroup label="Миний ангилал">
                            {(editData.type === "income" ? customIncome : customExpense).map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    ) : (() => {
                      const style = getCategoryStyle(t.category);
                      // Хэрэглэгчийн өөрийн ангилал бол түүний сонгосон логог эрхэмлэнэ.
                      const isCustom = customIconByName.has(t.category);
                      const Icon = isCustom
                        ? resolveCustomCategoryIcon(customIconByName.get(t.category))
                        : style.icon;
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
                        onKeyDown={onEditKeyDown}
                        placeholder="Тэмдэглэл..."
                        className="border rounded px-2 py-1 text-xs w-32"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">{t.note || "—"}</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 sticky right-0 z-10 ${isSelected ? "bg-blue-50" : "bg-white"} shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]`}>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px]">
      {label}
      <button onClick={onClear} className="hover:text-blue-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
