"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import FormulaTip from "@/components/FormulaTip";

interface Props {
  total: number;
  categorized: number;
  uncategorizedCount: number;
  uncategorizedAmount: number;
  pct: number;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

export default function CategorizationCoverage({
  total, categorized, uncategorizedCount, uncategorizedAmount, pct,
}: Props) {
  if (total === 0) return null;

  const low = pct < 80;
  const rounded = Math.round(pct);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${low ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Ангиллын хамрах хүрээ
            <FormulaTip text={`Ангилагдсан гүйлгээ ÷ нийт гүйлгээ × 100.\n${categorized} ÷ ${total} × 100 = ${rounded}%`} />
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${low ? "text-amber-700" : "text-emerald-700"}`}>{rounded}%</span>
            <span className="text-xs text-slate-500">{categorized}/{total} гүйлгээ ангилагдсан</span>
          </p>
        </div>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
          {low ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
      </div>

      {/* Прогресс бар */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${low ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>

      {/* Ангилаагүй сан — дүн + тоо */}
      {uncategorizedCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm">
          <span className="text-slate-600">Ангилаагүй</span>
          <span className="text-right">
            <span className="font-semibold tabular-nums text-slate-800">{fmt(uncategorizedAmount)}</span>
            <span className="ml-1 text-xs text-slate-400">· {uncategorizedCount} гүйлгээ</span>
          </span>
        </div>
      )}

      {low && (
        <p className="mt-3 text-xs font-medium text-amber-800">
          Энэ дүгнэлт бүрэн бус байна — {uncategorizedCount} гүйлгээ ангилагдаагүй байна.
        </p>
      )}

      <Link
        href="/breakdown"
        className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${low ? "text-amber-800 hover:text-amber-900" : "text-blue-600 hover:text-blue-700"}`}
      >
        Ангилаагүй гүйлгээг ангилах
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
