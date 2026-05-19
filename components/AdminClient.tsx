"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Shield, Users, Database, Activity, TrendingUp, TrendingDown,
  Search, Filter, ChevronDown, Mail, CheckCircle2, XCircle, Crown,
  ArrowLeft, RefreshCw, Building2, User as UserIcon, FileText, Receipt,
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
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  userType: string | null;
  role: string;
  createdAt: string;
  statementCount: number;
  txCount: number;
  lastActive: string | null;
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

export default function AdminClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "personal" | "business">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (userTypeFilter !== "all") params.set("userType", userTypeFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);

      const [s, u] = await Promise.all([
        fetch("/api/admin/stats").then(r => r.json()),
        fetch(`/api/admin/users?${params}`).then(r => r.json()),
      ]);
      setStats(s);
      setUsers(u.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, userTypeFilter, roleFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = users;
  const balance = stats ? stats.totalIncome - stats.totalExpense : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Хэрэглэгчийн самбар руу буцах"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">Админ удирдлага</h1>
              <p className="text-xs text-slate-500">Бүтээгчдийн хяналтын самбар</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Шинэчлэх"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Title */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Бүтээгчийн самбар</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Системийн{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              амин судас
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Хэрэглэгчдийн идэвхжил, гүйлгээний тойм, ангилалын статистик
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Нийт хэрэглэгч"
            value={stats ? fmtNum(stats.totalUsers) : "—"}
            sub={stats ? `${stats.recentSignups} 7 хоногт` : ""}
            icon={<Users className="h-4 w-4" />}
            accent="indigo"
          />
          <StatCard
            label="Хувь хүн / Байгууллага"
            value={stats ? `${fmtNum(stats.personalUsers)} / ${fmtNum(stats.businessUsers)}` : "—"}
            sub={stats ? `${stats.noTypeUsers} тохиргоогүй` : ""}
            icon={<Building2 className="h-4 w-4" />}
            accent="blue"
          />
          <StatCard
            label="Нийт гүйлгээ"
            value={stats ? fmtNum(stats.totalTransactions) : "—"}
            sub={stats ? `${fmtNum(stats.totalStatements)} хуулга` : ""}
            icon={<Database className="h-4 w-4" />}
            accent="emerald"
          />
          <StatCard
            label="Үлдэгдэл хэмжээ"
            value={stats ? fmt(Math.abs(balance)) : "—"}
            sub={stats
              ? `Орлого ${fmt(stats.totalIncome)} − Зарлага ${fmt(stats.totalExpense)}`
              : ""}
            icon={<Activity className="h-4 w-4" />}
            accent={balance >= 0 ? "purple" : "rose"}
          />
        </div>

        {/* Top categories */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                Бүртгэлийн ангилалын топ
              </h3>
              <p className="mt-1 text-xs text-slate-500">Хамгийн их хэрэглэгдсэн категориуд</p>
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
                      <div
                        className={`h-full rounded-full ${
                          c.type === "income"
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            : "bg-gradient-to-r from-rose-400 to-rose-500"
                        }`}
                        style={{ width: `${Math.min(c.share * 100 * 4, 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Users table */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                Хэрэглэгчдийн жагсаалт
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {filtered.length} хэрэглэгч харагдаж байна
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Нэр, имэйл, ID-аар хайх"
                  className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <SelectChip
                icon={<Users className="h-3.5 w-3.5" />}
                value={userTypeFilter}
                onChange={(v) => setUserTypeFilter(v as typeof userTypeFilter)}
                options={[
                  { v: "all", label: "Бүх ангилал" },
                  { v: "personal", label: "Хувь хүн" },
                  { v: "business", label: "Байгууллага" },
                ]}
              />
              <SelectChip
                icon={<Filter className="h-3.5 w-3.5" />}
                value={roleFilter}
                onChange={(v) => setRoleFilter(v as typeof roleFilter)}
                options={[
                  { v: "all", label: "Бүх эрх" },
                  { v: "user", label: "Хэрэглэгч" },
                  { v: "admin", label: "Админ" },
                ]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-3 py-3 font-medium">Ангилал</th>
                  <th className="px-3 py-3 font-medium">Эрх</th>
                  <th className="px-3 py-3 font-medium text-right">Гүйлгээ</th>
                  <th className="px-3 py-3 font-medium text-right">Хуулга</th>
                  <th className="px-3 py-3 font-medium">Сүүлд</th>
                  <th className="px-6 py-3 font-medium">Бүртгүүлсэн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
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
                      <span className="inline-flex items-center gap-1">
                        <Database className="h-3 w-3 text-slate-400" />
                        {fmtNum(u.txCount)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {u.statementCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{relativeTime(u.lastActive)}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("mn-MN")}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
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

        <p className="pt-2 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Finance Analytics — Admin
        </p>
      </main>
    </div>
  );
}

// ─────────────── Subcomponents ───────────────

type Accent = "emerald" | "rose" | "blue" | "indigo" | "purple" | "amber";

const accentBg: Record<Accent, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-blue-50 text-blue-600",
  indigo: "bg-indigo-50 text-indigo-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
};

function StatCard({
  label, value, sub, icon, accent,
}: {
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
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

// XCircle и CheckCircle2 import-уудыг хэрэглээгүй тул tree-shake болно
void XCircle; void CheckCircle2;
