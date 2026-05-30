"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  Shield, Users, Database, Activity, TrendingUp, TrendingDown,
  Search, Filter, ChevronDown, Mail, Crown, RefreshCw,
  Building2, User as UserIcon, FileText, Receipt, DollarSign,
  MessageSquare, Bug, Lightbulb, HelpCircle, Clock, CheckCircle2,
  Loader2, AlertCircle, Tags, LogOut,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
const fmtNum = (n: number) => n.toLocaleString("mn-MN");

interface Stats {
  totalUsers: number;
  personalUsers: number;
  businessUsers: number;
  adminUsers: number;
  noTypeUsers: number;
  recentSignups: number;
  totalTransactions: number;
  totalStatements: number;
  totalIncome: number;
  totalExpense: number;
  topCategories: { name: string; type: string; count: number; share: number }[];
  plans: Record<string, number>;
  paymentStatuses: Record<string, number>;
  mrr: number;
  openIssues: number;
  issueStatusCounts: Record<string, number>;
  revenueByTier: {
    plan: string;
    label: string;
    priceMnt: number;
    payingUsers: number;
    revenue: number;
  }[];
  topPayingUsers: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    planLabel: string;
    planAmount: number;
    paidAt: string | null;
  }[];
  monthlyRevenue: { month: string; revenue: number; payingUsers: number }[];
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  userType: string | null;
  role: string;
  plan: string;
  paymentStatus: string;
  planAmount: number;
  paidAt: string | null;
  createdAt: string;
  statementCount: number;
  issueCount: number;
  txCount: number;
  lastActive: string | null;
}

interface AdminIssue {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; email: string; name: string | null };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Дөнгөж сая";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин өмнө`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} цаг өмнө`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} өдрийн өмнө`;
  return new Date(iso).toLocaleDateString("mn-MN");
}

type Tab = "overview" | "users" | "issues";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Users filters
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "personal" | "business">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "small" | "medium" | "large">("all");

  // Issues filters
  const [issueStatusFilter, setIssueStatusFilter] = useState<"all" | "new" | "in_progress" | "resolved" | "wont_fix">("all");

  // Inline edit
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const userParams = new URLSearchParams();
      if (search) userParams.set("search", search);
      if (userTypeFilter !== "all") userParams.set("userType", userTypeFilter);
      if (roleFilter !== "all") userParams.set("role", roleFilter);
      if (planFilter !== "all") userParams.set("plan", planFilter);

      const issueParams = new URLSearchParams();
      if (issueStatusFilter !== "all") issueParams.set("status", issueStatusFilter);

      const [s, u, i] = await Promise.all([
        fetch("/api/sys/stats").then(r => r.json()),
        fetch(`/api/sys/users?${userParams}`).then(r => r.json()),
        fetch(`/api/sys/issues?${issueParams}`).then(r => r.json()),
      ]);
      setStats(s);
      setUsers(u.users ?? []);
      setIssues(i.issues ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, userTypeFilter, roleFilter, planFilter, issueStatusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateUser = async (id: string, patch: Partial<AdminUser> & { markPaid?: boolean }) => {
    setSavingUser(id);
    try {
      const res = await fetch("/api/sys/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error("update failed");
      await fetchAll();
    } finally {
      setSavingUser(null);
      setEditingUser(null);
    }
  };

  const updateIssue = async (id: string, status: string) => {
    await fetch("/api/sys/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchAll();
  };

  const balance = stats ? stats.totalIncome - stats.totalExpense : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <header className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">Бүтээгчийн самбар</h1>
              <p className="text-xs text-slate-500">Системийн удирдлага · нууцлал</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/sys/login" })}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Админаас гарах"
            >
              <LogOut className="h-4 w-4" />
              Гарах
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {([
            { v: "overview", label: "Тойм", icon: Activity },
            { v: "users", label: `Хэрэглэгчид (${stats?.totalUsers ?? "—"})`, icon: Users },
            { v: "issues", label: `Санал/Алдаа (${stats?.openIssues ?? 0})`, icon: MessageSquare },
          ] as const).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === v
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {tab === "overview" && (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Бүтээгчийн самбар</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Системийн{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
                  амин судас
                </span>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Хэрэглэгч, орлого, санал/асуудлын нэгдсэн харагдац
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Нийт хэрэглэгч" value={stats ? fmtNum(stats.totalUsers) : "—"}
                sub={stats ? `${stats.recentSignups} · 7 хоног` : ""}
                icon={<Users className="h-4 w-4" />} accent="indigo" />
              <StatCard label="MRR (сар тутмын орлого)" value={stats ? fmt(stats.mrr) : "—"}
                sub={stats ? `${stats.paymentStatuses?.active ?? 0} төлж буй` : ""}
                icon={<DollarSign className="h-4 w-4" />} accent="emerald" />
              <StatCard label="Шийдвэрлээгүй санал" value={stats ? fmtNum(stats.openIssues) : "—"}
                sub={stats ? `${stats.issueStatusCounts?.resolved ?? 0} шийдсэн` : ""}
                icon={<MessageSquare className="h-4 w-4" />} accent="amber" />
              <StatCard label="Гүйлгээ / Хуулга" value={stats ? `${fmtNum(stats.totalTransactions)} / ${fmtNum(stats.totalStatements)}` : "—"}
                sub={stats ? `Үлдэгдэл: ${fmt(Math.abs(balance))}` : ""}
                icon={<Database className="h-4 w-4" />} accent="blue" />
            </div>

            {/* Plan distribution + Top categories */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Багц задаргаа
                </h3>
                <p className="mt-1 text-xs text-slate-500">Хэрэглэгчдийн plan</p>
                <div className="mt-5 space-y-3">
                  {(["free", "small", "medium", "large"] as const).map(p => {
                    const count = stats?.plans?.[p] ?? 0;
                    const total = stats?.totalUsers ?? 1;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const color = p === "large" ? "from-indigo-500 to-purple-500"
                      : p === "medium" ? "from-blue-400 to-blue-500"
                      : p === "small" ? "from-sky-300 to-sky-400"
                      : "from-slate-300 to-slate-400";
                    const label = { free: "Бичил", small: "Жижиг", medium: "Дунд", large: "Том" }[p];
                    return (
                      <div key={p}>
                        <div className="flex items-baseline justify-between">
                          <p className="text-sm font-medium text-slate-900">{label}</p>
                          <p className="text-xs tabular-nums text-slate-500">
                            {fmtNum(count)} · {pct.toFixed(0)}%
                          </p>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full bg-gradient-to-r ${color}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                      Бүртгэлийн ангилалын топ
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">Хамгийн их хэрэглэгдсэн</p>
                  </div>
                  <Receipt className="h-4 w-4 text-slate-400" />
                </div>
                {!stats || stats.topCategories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Мэдээлэл байхгүй</p>
                ) : (
                  <ul className="space-y-3">
                    {stats.topCategories.map(c => (
                      <li key={`${c.name}-${c.type}`} className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          c.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}>
                          {c.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between">
                            <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                            <p className="text-xs tabular-nums text-slate-500">
                              {fmtNum(c.count)} · {(c.share * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${
                              c.type === "income"
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                : "bg-gradient-to-r from-rose-400 to-rose-500"
                            }`}
                              style={{ width: `${Math.min(c.share * 100 * 4, 100)}%` }} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* ─── ОРЛОГЫН ЗАДАРГАА (Revenue breakdown) ─── */}
            <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                    Системийн орлогын задаргаа
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Багц тус бүрийн төлбөртэй хэрэглэгчид, MRR хувь нэмэр
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>

              {/* Revenue by tier grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {(stats?.revenueByTier ?? []).map(t => (
                  <div key={t.plan} className="rounded-xl border border-slate-200 p-4 bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.label}</span>
                      <span className="text-xs text-slate-400">{fmt(t.priceMnt)}/сар</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">{fmt(t.revenue)}</p>
                    <p className="mt-1 text-xs text-slate-500">{fmtNum(t.payingUsers)} төлбөртэй</p>
                  </div>
                ))}
              </div>

              {/* Monthly trend */}
              <div className="rounded-xl bg-slate-50 p-4 mb-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Сүүлийн 6 сарын орлогын чиглэл
                </p>
                {!stats || stats.monthlyRevenue.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Мэдээлэл байхгүй</p>
                ) : (
                  <RevenueBars data={stats.monthlyRevenue} />
                )}
              </div>

              {/* Top paying users */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Шилдэг 10 төлбөртэй хэрэглэгч
                </p>
                {!stats || stats.topPayingUsers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Мэдээлэл байхгүй</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-400">
                        <tr className="border-b border-slate-100">
                          <th className="py-2 text-left font-medium">Хэрэглэгч</th>
                          <th className="py-2 text-left font-medium">Багц</th>
                          <th className="py-2 text-right font-medium">Сар тутмын</th>
                          <th className="py-2 text-right font-medium">Сүүлд төлсөн</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.topPayingUsers.map(u => (
                          <tr key={u.id}>
                            <td className="py-2 pr-2">
                              <p className="font-medium text-slate-900 truncate max-w-[200px]">
                                {u.name || u.email.split("@")[0]}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{u.email}</p>
                            </td>
                            <td className="py-2 pr-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                                {u.planLabel}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums font-medium text-slate-900">
                              {fmt(u.planAmount)}
                            </td>
                            <td className="py-2 text-right text-xs text-slate-500">
                              {u.paidAt ? new Date(u.paidAt).toLocaleDateString("mn-MN") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ─── USERS TAB ─── */}
        {tab === "users" && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Хэрэглэгчдийн жагсаалт
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {users.length} хэрэглэгч харагдаж байна
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Нэр, имэйл, ID-аар хайх"
                    className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <SelectChip icon={<Users className="h-3.5 w-3.5" />} value={userTypeFilter}
                  onChange={(v) => setUserTypeFilter(v as typeof userTypeFilter)}
                  options={[
                    { v: "all", label: "Бүх ангилал" },
                    { v: "personal", label: "Хувь хүн" },
                    { v: "business", label: "Байгууллага" },
                  ]} />
                <SelectChip icon={<Tags className="h-3.5 w-3.5" />} value={planFilter}
                  onChange={(v) => setPlanFilter(v as typeof planFilter)}
                  options={[
                    { v: "all", label: "Бүх багц" },
                    { v: "free", label: "Бичил" },
                    { v: "small", label: "Жижиг" },
                    { v: "medium", label: "Дунд" },
                    { v: "large", label: "Том" },
                  ]} />
                <SelectChip icon={<Filter className="h-3.5 w-3.5" />} value={roleFilter}
                  onChange={(v) => setRoleFilter(v as typeof roleFilter)}
                  options={[
                    { v: "all", label: "Бүх эрх" },
                    { v: "user", label: "Хэрэглэгч" },
                    { v: "admin", label: "Админ" },
                  ]} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                    <th className="px-3 py-3 font-medium">Ангилал</th>
                    <th className="px-3 py-3 font-medium">Багц / Төлбөр</th>
                    <th className="px-3 py-3 font-medium">Эрх</th>
                    <th className="px-3 py-3 font-medium text-right">Гүйлгээ</th>
                    <th className="px-3 py-3 font-medium">Сүүлд</th>
                    <th className="px-6 py-3 font-medium text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isEditing = editingUser === u.id;
                    const isSaving = savingUser === u.id;
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {u.name || u.email.split("@")[0]}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                                <Mail className="h-3 w-3" />
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {u.userType === "business" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                              <Building2 className="h-3 w-3" /> Байгууллага
                            </span>
                          ) : u.userType === "personal" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              <UserIcon className="h-3 w-3" /> Хувь хүн
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Тохируулаагүй
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <select
                                defaultValue={u.plan}
                                onChange={e => updateUser(u.id, { plan: e.target.value })}
                                className="text-xs border rounded px-1 py-0.5 w-full"
                                disabled={isSaving}
                              >
                                <option value="free">Бичил (Free)</option>
                                <option value="small">Жижиг</option>
                                <option value="medium">Дунд</option>
                                <option value="large">Том</option>
                              </select>
                              <input
                                type="number"
                                defaultValue={u.planAmount}
                                onBlur={e => updateUser(u.id, { planAmount: Number(e.target.value) })}
                                placeholder="MNT/сар"
                                className="text-xs border rounded px-1 py-0.5 w-full"
                                disabled={isSaving}
                              />
                              <button
                                onClick={() => updateUser(u.id, { markPaid: true })}
                                disabled={isSaving}
                                className="text-[10px] text-emerald-600 hover:underline"
                              >
                                ✓ Төлбөр хүлээж авлаа
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <PlanBadge plan={u.plan} />
                              <p className="text-[10px] text-slate-500 tabular-nums">
                                {fmt(u.planAmount)} · <PaymentBadge status={u.paymentStatus} />
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <select
                              defaultValue={u.role}
                              onChange={e => updateUser(u.id, { role: e.target.value })}
                              className="text-xs border rounded px-1 py-0.5"
                              disabled={isSaving}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : u.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
                              <Crown className="h-3 w-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-sm text-slate-900">
                          <div className="inline-flex items-center gap-1">
                            <Database className="h-3 w-3 text-slate-400" />
                            {fmtNum(u.txCount)}
                          </div>
                          <p className="text-[10px] text-slate-500 inline-flex items-center gap-1 ml-2">
                            <FileText className="h-3 w-3" />
                            {u.statementCount}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{relativeTime(u.lastActive)}</td>
                        <td className="px-6 py-3 text-right">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500 inline-block" />
                          ) : (
                            <button
                              onClick={() => setEditingUser(isEditing ? null : u.id)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                              {isEditing ? "Дуусах" : "Засах"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                        {loading ? "Ачаалж байна..." : "Илэрц олдсонгүй"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ─── ISSUES TAB ─── */}
        {tab === "issues" && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Хэрэглэгчийн санал / алдааны мэдээлэл
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {issues.length} илгээгдсэн ·{" "}
                  {stats?.openIssues ?? 0} шийдвэрлээгүй
                </p>
              </div>
              <SelectChip
                icon={<Filter className="h-3.5 w-3.5" />}
                value={issueStatusFilter}
                onChange={(v) => setIssueStatusFilter(v as typeof issueStatusFilter)}
                options={[
                  { v: "all", label: "Бүгд" },
                  { v: "new", label: "Шинэ" },
                  { v: "in_progress", label: "Хийгдэж буй" },
                  { v: "resolved", label: "Шийдсэн" },
                  { v: "wont_fix", label: "Хаасан" },
                ]}
              />
            </div>

            <div className="divide-y divide-slate-100">
              {issues.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-400">
                  {loading ? "Ачаалж байна..." : "Илгээсэн санал алга"}
                </p>
              ) : issues.map(i => (
                <div key={i.id} className="p-6 flex gap-4">
                  <IssueTypeIcon type={i.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900">{i.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {i.user.email}
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          {relativeTime(i.createdAt)}
                        </p>
                      </div>
                      <IssueStatusBadge status={i.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {i.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {i.status === "new" && (
                        <button
                          onClick={() => updateIssue(i.id, "in_progress")}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Clock className="h-3 w-3" /> Хийж эхлэх
                        </button>
                      )}
                      {(i.status === "new" || i.status === "in_progress") && (
                        <>
                          <button
                            onClick={() => updateIssue(i.id, "resolved")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Шийдсэн
                          </button>
                          <button
                            onClick={() => updateIssue(i.id, "wont_fix")}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Хаах
                          </button>
                        </>
                      )}
                      {(i.status === "resolved" || i.status === "wont_fix") && (
                        <button
                          onClick={() => updateIssue(i.id, "new")}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          Дахин нээх
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} FinMate — Admin · /sys/control
        </p>
      </main>
    </div>
  );
}

// ─────────────── Subcomponents ───────────────

type Accent = "emerald" | "rose" | "blue" | "indigo" | "purple" | "amber";

const accentBg: Record<Accent, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose:    "bg-rose-50 text-rose-600",
  blue:    "bg-blue-50 text-blue-600",
  indigo:  "bg-indigo-50 text-indigo-600",
  purple:  "bg-purple-50 text-purple-600",
  amber:   "bg-amber-50 text-amber-600",
};

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; accent: Accent;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentBg[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function RevenueBars({ data }: { data: { month: string; revenue: number; payingUsers: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(d => {
        const h = Math.max((d.revenue / max) * 100, 2);
        const monthLabel = d.month.slice(5); // "YYYY-MM" -> "MM"
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.month}: ${fmt(d.revenue)} (${d.payingUsers} хэрэглэгч)`}>
            <div className="text-xs tabular-nums text-slate-600 font-medium truncate">{fmt(d.revenue)}</div>
            <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" style={{ height: `${h}%` }} />
            <div className="text-xs text-slate-500">{monthLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  // 4-tier шинэ: free/small/medium/large + legacy pro/business
  const labels: Record<string, string> = {
    free: "Бичил",
    small: "Жижиг",
    medium: "Дунд",
    large: "Том",
    pro: "Pro (legacy)",
    business: "Business (legacy)",
  };
  const label = labels[plan] ?? plan;

  if (plan === "large" || plan === "business") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
      <Crown className="h-3 w-3" /> {label}
    </span>
  );
  if (plan === "medium" || plan === "pro") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
      {label}
    </span>
  );
  if (plan === "small") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
      {label}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
      {label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  if (status === "active") return <span className="text-emerald-600 font-medium">Идэвхтэй</span>;
  if (status === "overdue") return <span className="text-rose-600 font-medium">Хугацаа хэтэрсэн</span>;
  if (status === "cancelled") return <span className="text-slate-500">Цуцалсан</span>;
  return <span className="text-slate-500">—</span>;
}

function IssueTypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
    bug:      { icon: Bug,                cls: "bg-rose-100 text-rose-600" },
    feature:  { icon: Lightbulb,          cls: "bg-amber-100 text-amber-600" },
    question: { icon: HelpCircle,         cls: "bg-blue-100 text-blue-600" },
    other:    { icon: MessageSquare,      cls: "bg-slate-100 text-slate-600" },
  };
  const conf = map[type] ?? map.other;
  const Icon = conf.icon;
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${conf.cls}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function IssueStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    new:         { label: "Шинэ",         cls: "bg-rose-50 text-rose-700",       icon: AlertCircle  },
    in_progress: { label: "Хийгдэж буй",  cls: "bg-blue-50 text-blue-700",       icon: Clock        },
    resolved:    { label: "Шийдсэн",      cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
    wont_fix:    { label: "Хаасан",       cls: "bg-slate-100 text-slate-600",    icon: HelpCircle   },
  };
  const conf = map[status] ?? map.new;
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${conf.cls} flex-shrink-0`}>
      <Icon className="h-3 w-3" />
      {conf.label}
    </span>
  );
}

function SelectChip<T extends string>({
  icon, value, onChange, options,
}: {
  icon: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-sm text-slate-700 hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
