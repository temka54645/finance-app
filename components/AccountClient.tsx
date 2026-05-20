"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, User as UserIcon, Mail, Calendar, CreditCard,
  CheckCircle2, AlertTriangle, Pencil, Loader2, Sparkles, Crown, Check,
} from "lucide-react";
import { PLAN_TIERS, PLAN_ORDER, normalizePlan, formatMnt, formatLimit, type PlanKey } from "@/lib/plans";
import type { MonthlyUsage } from "@/lib/usage";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  userType: string | null;
  role: string;
  plan: string;
  paymentStatus: string;
  planAmount: number;
  paidAt: string | null;
  emailVerified: string | null;
  createdAt: string;
}

interface Props {
  user: UserData;
  usage: MonthlyUsage;
  betaMode?: boolean;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("mn-MN");
}

function pct(used: number, limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  active:    { label: "Идэвхтэй",    color: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  overdue:   { label: "Хугацаа хэтэрсэн", color: "bg-amber-100 text-amber-700 ring-amber-200" },
  cancelled: { label: "Цуцлагдсан",  color: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export default function AccountClient({ user, usage, betaMode = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = normalizePlan(user.plan);
  const currentTier = PLAN_TIERS[currentPlan];
  const isBusiness = user.userType === "business";

  const saveName = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() || null }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Алдаа");
        setEditingName(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа");
      }
    });
  };

  const switchUserType = (newType: "personal" | "business") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userType: newType }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Алдаа");
        setShowTypeModal(false);
        // Session refresh shаардлагатай — full reload
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа");
      }
    });
  };

  const paymentBadge = PAYMENT_LABEL[user.paymentStatus] ?? PAYMENT_LABEL.active;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Самбар руу буцах
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">Миний профайл</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {betaMode && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex items-start gap-3">
            <Sparkles className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Туршилтын үе шат идэвхтэй</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Та бүх функцийг хязгааргүй ашиглах боломжтой. Багц сонголт, төлбөр болон хязгаарлалт нь зөвхөн харагдах төдий — бодит блоклолт түр зуур идэвхгүй.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Profile section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-slate-400" />
            Профайл
          </h2>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Имэйл</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Баталгаажсан
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Баталгаажаагүй
                </span>
              )}
            </div>

            {/* Name */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Нэр</p>
                  {editingName ? (
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium">{user.name || <span className="text-slate-400">— тохируулаагүй —</span>}</p>
                  )}
                </div>
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveName}
                    disabled={pending}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Хадгалах"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setName(user.name ?? ""); }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Цуцлах
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0"
                >
                  <Pencil className="h-3 w-3" />
                  Засах
                </button>
              )}
            </div>

            {/* User type */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {isBusiness ? <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Хэрэглэгчийн төрөл</p>
                  <p className="text-sm font-medium">
                    {isBusiness ? "Байгууллага" : "Хувь хүн"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTypeModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0"
              >
                <Pencil className="h-3 w-3" />
                Өөрчлөх
              </button>
            </div>

            {/* Member since */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Бүртгэлийн огноо</p>
                <p className="text-sm font-medium">{fmtDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Billing section */}
        <section id="billing" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            Төлбөрийн багц
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg shadow-blue-500/30">
              <p className="text-xs uppercase tracking-wider opacity-80">Одоогийн багц</p>
              <p className="mt-1 text-xl font-bold flex items-center gap-2">
                {currentPlan === "large" && <Crown className="h-4 w-4" />}
                {currentTier.label}
              </p>
              <p className="mt-2 text-sm opacity-90">{formatMnt(currentTier.priceMnt)}/сар</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Төлбөрийн төлөв</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${paymentBadge.color}`}>
                {paymentBadge.label}
              </span>
              <p className="mt-2 text-xs text-slate-500">
                Сүүлд төлсөн: {fmtDate(user.paidAt)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Сар тутмын төлбөр</p>
              <p className="mt-2 text-xl font-bold tabular-nums">{formatMnt(user.planAmount)}</p>
              <p className="mt-1 text-xs text-slate-500">MNT</p>
            </div>
          </div>
        </section>

        {/* Usage section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" />
            Энэ сарын хэрэглээ
          </h2>

          <div className="space-y-4">
            <UsageBar
              label="Statement"
              used={usage.statementCount}
              limit={currentTier.limits.statementsPerMonth}
            />
            <UsageBar
              label="Гүйлгээ"
              used={usage.txCount}
              limit={currentTier.limits.txPerMonth}
            />
            <UsageBar
              label="Банк"
              used={usage.bankCount}
              limit={currentTier.limits.banks}
            />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              AI ангилал: {currentTier.limits.aiCategorization
                ? <span className="font-medium text-emerald-700">Идэвхтэй</span>
                : <span className="font-medium text-amber-700">Хязгаарлагдсан (regex fallback)</span>}
            </div>
          </div>
        </section>

        {/* Tiers grid */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Багц шинэчлэх</h2>
          <p className="text-xs text-slate-500 mb-4">
            Багц өөрчлөхийн тулд админтай холбогдоно уу. Төлбөрийн систем удахгүй автоматжина.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map(key => {
              const tier = PLAN_TIERS[key];
              const isCurrent = key === currentPlan;
              return (
                <div
                  key={key}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50/40 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold">{tier.label}</h3>
                    {isCurrent && (
                      <span className="text-xs font-medium text-blue-600">Одоо</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {tier.priceMnt === 0 ? "Үнэгүй" : formatMnt(tier.priceMnt)}
                  </p>
                  {tier.priceMnt > 0 && (
                    <p className="text-xs text-slate-500">/сар</p>
                  )}
                  <p className="mt-2 text-xs text-slate-600">{tier.description}</p>

                  <ul className="mt-4 space-y-1.5 text-xs">
                    <FeatureRow check>Гүйлгээ {formatLimit(tier.limits.txPerMonth)}/сар</FeatureRow>
                    <FeatureRow check>Statement {formatLimit(tier.limits.statementsPerMonth)}/сар</FeatureRow>
                    <FeatureRow check>{tier.limits.banks === 1 ? "1 банк" : tier.limits.banks >= 99 ? "Бүх банк" : `${tier.limits.banks} банк`}</FeatureRow>
                    <FeatureRow check={tier.limits.aiCategorization}>AI ангилал</FeatureRow>
                    <FeatureRow check={tier.limits.prioritySupport}>Priority дэмжлэг</FeatureRow>
                    <FeatureRow check={tier.limits.multiUser}>Олон хэрэглэгч</FeatureRow>
                  </ul>

                  {!isCurrent && (
                    <a
                      href={`mailto:temka21311@gmail.com?subject=Багц шинэчлэх хүсэлт&body=Сайн байна уу,%0D%0A%0D%0AМиний хэрэглэгчийн нэр: ${user.email}%0D%0AОдоогийн багц: ${currentTier.label}%0D%0AХүссэн багц: ${tier.label}%0D%0A`}
                      className="mt-4 block w-full rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Сонгох
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* User type switch modal */}
      {showTypeModal && (
        <>
          <div onClick={() => setShowTypeModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h3 className="text-lg font-semibold mb-2">Хэрэглэгчийн төрөл өөрчлөх</h3>
            <p className="text-sm text-slate-600 mb-4">
              ⚠️ Анхааруулга: төрөл өөрчлөхөд ангиллын жагсаалт солигдоно (хувь хүн ↔ байгууллага).
              Хуучин гүйлгээний ангилал хэвээр үлдэх боловч edit dropdown-д шинэ ангилал гарна.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchUserType("personal")}
                disabled={pending || !isBusiness}
                className={`rounded-xl border-2 p-4 text-center transition-all disabled:opacity-50 ${
                  !isBusiness
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <UserIcon className="h-6 w-6 mx-auto text-blue-600" />
                <p className="mt-2 text-sm font-semibold">Хувь хүн</p>
                {!isBusiness && <p className="text-xs text-blue-600 mt-1">Одоогийнх</p>}
              </button>
              <button
                onClick={() => switchUserType("business")}
                disabled={pending || isBusiness}
                className={`rounded-xl border-2 p-4 text-center transition-all disabled:opacity-50 ${
                  isBusiness
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Building2 className="h-6 w-6 mx-auto text-indigo-600" />
                <p className="mt-2 text-sm font-semibold">Байгууллага</p>
                {isBusiness && <p className="text-xs text-indigo-600 mt-1">Одоогийнх</p>}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowTypeModal(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Цуцлах
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = pct(used, limit);
  const color = percentage >= 90 ? "bg-rose-500" : percentage >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {used.toLocaleString("mn-MN")} / {formatLimit(limit)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: Number.isFinite(limit) ? `${percentage}%` : "10%" }}
        />
      </div>
    </div>
  );
}

function FeatureRow({ children, check }: { children: React.ReactNode; check: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 ${check ? "text-slate-700" : "text-slate-400 line-through"}`}>
      <Check className={`h-3 w-3 flex-shrink-0 ${check ? "text-emerald-500" : "text-slate-300"}`} />
      {children}
    </li>
  );
}

// Suppress unused PlanKey export warning — used in props inference
export type { PlanKey };
