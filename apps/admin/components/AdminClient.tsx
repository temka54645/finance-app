"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  Users, Database, Activity, TrendingUp, TrendingDown,
  Search, Filter, ChevronDown, Mail, Crown, RefreshCw,
  Building2, User as UserIcon, FileText, Receipt, DollarSign,
  MessageSquare, Bug, Lightbulb, HelpCircle, Clock, CheckCircle2,
  Loader2, AlertCircle, Tags, LogOut,
  X, Trash2, Save, BadgeCheck, CalendarDays, Hash, ArrowDownLeft, ArrowUpRight,
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

interface UserDetail {
  id: string;
  email: string;
  emailVerified: string | null;
  name: string | null;
  image: string | null;
  userType: string | null;
  role: string;
  plan: string;
  paymentStatus: string;
  planAmount: number;
  paidAt: string | null;
  createdAt: string;
  providers: string[];
  statementCount: number;
  issueCount: number;
  categoryCount: number;
  statements: {
    id: string;
    fileName: string;
    bankName: string | null;
    uploadedAt: string;
    periodStart: string | null;
    periodEnd: string | null;
    txCount: number;
  }[];
  issues: { id: string; type: string; title: string; status: string; createdAt: string }[];
  totalIncome: number;
  totalExpense: number;
  txCount: number;
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
  const router = useRouter();
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

  // Detail drawer
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

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
        fetch("/api/stats").then(r => r.json()),
        fetch(`/api/users?${userParams}`).then(r => r.json()),
        fetch(`/api/issues?${issueParams}`).then(r => r.json()),
      ]);
      setStats(s);
      setUsers(u.users ?? []);
      setIssues(i.issues ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, userTypeFilter, roleFilter, planFilter, issueStatusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateIssue = async (id: string, status: string) => {
    await fetch("/api/issues", {
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
            <Image
              src="/finmate-mark.png"
              width={40}
              height={40}
              alt="FinMate"
              priority
              className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-500/20"
            />
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
              onClick={async () => {
                // redirect:false → session-г цэвэрлээд, өөрсдөө replace-ээр
                // /login руу шилжинэ. Ингэснээр гарсны дараа back дарахад
                // эрхгүй болсон самбарын хуучин snapshot дахин гарч ирэхгүй.
                await signOut({ redirect: false });
                router.replace("/login");
                router.refresh();
              }}
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
                          <div className="space-y-0.5">
                            <PlanBadge plan={u.plan} />
                            <p className="text-[10px] text-slate-500 tabular-nums">
                              {fmt(u.planAmount)} · <PaymentBadge status={u.paymentStatus} />
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {u.role === "admin" ? (
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
                          <button
                            onClick={() => setDetailUserId(u.id)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            Дэлгэрэнгүй
                          </button>
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

      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onChanged={fetchAll}
          onDeleted={() => {
            setDetailUserId(null);
            fetchAll();
          }}
        />
      )}
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

const PLAN_OPTIONS = [
  { v: "free", label: "Бичил (Free)" },
  { v: "small", label: "Жижиг" },
  { v: "medium", label: "Дунд" },
  { v: "large", label: "Том" },
] as const;

function UserDetailModal({
  userId, onClose, onChanged, onDeleted,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Засварлаж буй талбарууд
  const [form, setForm] = useState({
    name: "",
    userType: "" as "" | "personal" | "business",
    role: "user",
    plan: "free",
    planAmount: 0,
    paymentStatus: "active",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Алдаа гарлаа");
      const u: UserDetail = json.user;
      setData(u);
      setForm({
        name: u.name ?? "",
        userType: (u.userType as "personal" | "business" | null) ?? "",
        role: u.role,
        plan: u.plan,
        planAmount: u.planAmount,
        paymentStatus: u.paymentStatus,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Esc дарж хаах
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (extra?: { markPaid?: boolean }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          name: form.name,
          userType: form.userType === "" ? null : form.userType,
          role: form.role,
          plan: form.plan,
          planAmount: form.planAmount,
          paymentStatus: form.paymentStatus,
          ...extra,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Хадгалах үед алдаа гарлаа");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалах үед алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Устгах үед алдаа гарлаа");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Устгах үед алдаа гарлаа");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
              {(data?.name || data?.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900">
                {data?.name || data?.email?.split("@")[0] || "Хэрэглэгч"}
              </h3>
              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                <Mail className="h-3 w-3" /> {data?.email ?? "…"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Ачаалж байна…
          </div>
        ) : !data ? (
          <div className="py-16 text-center text-sm text-rose-600">{error ?? "Олдсонгүй"}</div>
        ) : (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Meta info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaRow icon={<Hash className="h-3.5 w-3.5" />} label="ID" value={data.id} mono />
              <MetaRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Бүртгүүлсэн" value={fmtDate(data.createdAt)} />
              <MetaRow
                icon={<BadgeCheck className="h-3.5 w-3.5" />}
                label="Имэйл баталгаажсан"
                value={data.emailVerified ? fmtDate(data.emailVerified) : "Үгүй"}
              />
              <MetaRow
                icon={<UserIcon className="h-3.5 w-3.5" />}
                label="Нэвтрэх арга"
                value={data.providers.length ? data.providers.join(", ") : "Имэйл/нууц үг"}
              />
            </div>

            {/* Aggregate stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Гүйлгээ" value={fmtNum(data.txCount)} icon={<Database className="h-4 w-4" />} />
              <MiniStat label="Хуулга" value={fmtNum(data.statementCount)} icon={<FileText className="h-4 w-4" />} />
              <MiniStat label="Орлого" value={fmt(data.totalIncome)} icon={<ArrowDownLeft className="h-4 w-4" />} accent="emerald" />
              <MiniStat label="Зарлага" value={fmt(data.totalExpense)} icon={<ArrowUpRight className="h-4 w-4" />} accent="rose" />
            </div>

            {/* Edit form */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Мэдээлэл засах
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Нэр">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Нэр оруулаагүй"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </Field>
                <Field label="Ангилал">
                  <select
                    value={form.userType}
                    onChange={e => setForm(f => ({ ...f, userType: e.target.value as typeof f.userType }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Тохируулаагүй</option>
                    <option value="personal">Хувь хүн</option>
                    <option value="business">Байгууллага</option>
                  </select>
                </Field>
                <Field label="Багц">
                  <select
                    value={form.plan}
                    onChange={e => {
                      const plan = e.target.value;
                      setForm(f => ({ ...f, plan }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {PLAN_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Сар тутмын төлбөр (₮)">
                  <input
                    type="number"
                    value={form.planAmount}
                    onChange={e => setForm(f => ({ ...f, planAmount: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </Field>
                <Field label="Төлбөрийн төлөв">
                  <select
                    value={form.paymentStatus}
                    onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="active">Идэвхтэй</option>
                    <option value="overdue">Хугацаа хэтэрсэн</option>
                    <option value="cancelled">Цуцалсан</option>
                  </select>
                </Field>
                <Field label="Эрх">
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="user">Хэрэглэгч</option>
                    <option value="admin">Админ</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => save()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Хадгалах
                </button>
                <button
                  onClick={() => save({ markPaid: true })}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" /> Төлбөр хүлээж авлаа
                </button>
                <span className="text-xs text-slate-400">
                  Сүүлд төлсөн: {fmtDate(data.paidAt)}
                </span>
              </div>
            </section>

            {/* Statements */}
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Хуулгууд ({data.statementCount})
              </h4>
              {data.statements.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-400">Хуулга байхгүй</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {data.statements.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{s.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {s.bankName ?? "—"} · {fmtDate(s.uploadedAt)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs tabular-nums text-slate-500">
                        {fmtNum(s.txCount)} гүйлгээ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Issues */}
            {data.issues.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Санал / Алдаа ({data.issueCount})
                </h4>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {data.issues.map(i => (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <p className="truncate text-slate-800">{i.title}</p>
                      <IssueStatusBadge status={i.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Danger zone */}
            <section className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Аюултай бүс
              </h4>
              <p className="mt-1 text-xs text-rose-600/80">
                Хэрэглэгчийг устгахад түүний бүх хуулга, гүйлгээ, ангилал, санал зэрэг
                холбогдох мэдээлэл бүрэн арилна. Энэ үйлдлийг буцаах боломжгүй.
              </p>
              {confirmDelete ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-rose-700">Итгэлтэй байна уу?</span>
                  <button
                    onClick={doDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Тийм, устга
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Болих
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" /> Хэрэглэгчийг устгах
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value, mono }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <span className="text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`truncate text-sm text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, accent }: {
  label: string; value: string; icon: React.ReactNode; accent?: "emerald" | "rose";
}) {
  const tone = accent === "emerald" ? "text-emerald-600"
    : accent === "rose" ? "text-rose-600" : "text-slate-700";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className={`flex items-center gap-1.5 ${tone}`}>{icon}
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className={`mt-1 truncate text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
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
