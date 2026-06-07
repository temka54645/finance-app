"use client";

import { Wallet, ArrowDownUp, Hourglass, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import FormulaTip from "@/components/FormulaTip";

export interface PeriodOverPeriod {
  current: { label: string; inflow: number; outflow: number; net: number };
  previous: { label: string; inflow: number; outflow: number; net: number };
  inflowPct: number | null;
  outflowPct: number | null;
  netPct: number | null;
}

interface Props {
  cashBalance: number | null;
  hasClosingBalance: boolean;
  netCashFlow: number;
  runwayMonths: number | null;
  avgMonthlyOutflow: number;
  accountCount: number;
  periodOverPeriod: PeriodOverPeriod | null;
}

function fmt(n: number) {
  return n.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
}

/** Хувийн өөрчлөлтийн сум — өсөлт сайн эсэхээс хамаарч өнгөтэй. */
function TrendBadge({ pct, goodWhenUp }: { pct: number | null; goodWhenUp: boolean }) {
  if (pct === null) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400"><Minus className="h-3 w-3" /> —</span>;
  }
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  const good = flat ? true : up === goodWhenUp;
  const color = flat ? "text-slate-400" : good ? "text-emerald-600" : "text-rose-600";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function BigCard({
  label, value, sub, icon, critical, muted, formula,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  icon: ReactNode;
  critical?: boolean;
  muted?: boolean;
  /** Тухайн дүнгийн тооцооллын томьёо (ⓘ tooltip). */
  formula: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-5 shadow-lg shadow-slate-200/60 ${
        critical ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-medium uppercase tracking-wider ${critical ? "text-rose-600" : "text-slate-500"}`}>
            {label}
          </p>
          <FormulaTip text={formula} />
        </div>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${critical ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${
        muted ? "text-slate-300" : critical ? "text-rose-700" : "text-slate-900"
      }`}>
        {value}
      </p>
      <div className="mt-2 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

export default function DashboardHeadline({
  cashBalance, hasClosingBalance, netCashFlow, runwayMonths, avgMonthlyOutflow,
  accountCount, periodOverPeriod,
}: Props) {
  const balanceCritical = cashBalance !== null && cashBalance < 0;
  const netCritical = netCashFlow < 0;
  // Бэлэн мөнгөний нөөц 3 сараас бага бол анхааруулга (улаан)
  const runwayCritical = runwayMonths !== null && runwayMonths < 3;

  const runwayText = (m: number) => {
    if (m >= 12) return `${(m / 12).toFixed(1)} жил`;
    if (m >= 1) return `${m.toFixed(1)} сар`;
    return `${Math.round(m * 30)} хоног`;
  };

  return (
    <section className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Нийт бэлэн мөнгөний үлдэгдэл */}
        <BigCard
          label="Нийт бэлэн мөнгө"
          icon={<Wallet className="h-4 w-4" />}
          critical={balanceCritical}
          muted={!hasClosingBalance}
          value={hasClosingBalance && cashBalance !== null ? fmtSigned(cashBalance) : "—"}
          sub={
            hasClosingBalance
              ? `${accountCount} дансны эцсийн үлдэгдлийн нийлбэр`
              : "Хуулгын эцсийн үлдэгдэл олдсонгүй — дансны үлдэгдэл шаардлагатай"
          }
          formula={
            hasClosingBalance && cashBalance !== null
              ? `Данс бүрийн хамгийн сүүлийн хуулгын эцсийн үлдэгдлийн нийлбэр.\nΣ ${accountCount} данс = ${fmtSigned(cashBalance)}`
              : "Данс бүрийн хамгийн сүүлийн хуулгын эцсийн үлдэгдлийн нийлбэр.\nХуулгад эцсийн үлдэгдэл олдоогүй тул тооцох боломжгүй."
          }
        />

        {/* Цэвэр мөнгөн урсгал */}
        <BigCard
          label="Цэвэр мөнгөн урсгал"
          icon={<ArrowDownUp className="h-4 w-4" />}
          critical={netCritical}
          value={fmtSigned(netCashFlow)}
          sub={
            periodOverPeriod ? (
              <span className="inline-flex items-center gap-1.5">
                <span>Сүүлийн сар:</span>
                <TrendBadge pct={periodOverPeriod.netPct} goodWhenUp />
              </span>
            ) : netCritical ? "Зарлага орлогоосоо давсан" : "Орлого зарлагын зөрүү"
          }
          formula={`Нийт орлого − Нийт зарлага.\nБүх хугацааны орлого ба зарлагын зөрүү = ${fmtSigned(netCashFlow)}`}
        />

        {/* Бэлэн мөнгөний нөөц (runway) */}
        <BigCard
          label="Мөнгөний нөөц"
          icon={<Hourglass className="h-4 w-4" />}
          critical={runwayCritical}
          muted={runwayMonths === null}
          value={runwayMonths !== null ? runwayText(runwayMonths) : "—"}
          sub={
            runwayMonths !== null
              ? `Сарын дундаж зарлага ${fmt(avgMonthlyOutflow)}`
              : hasClosingBalance
                ? "Зарлага бүртгэгдээгүй"
                : "Дансны үлдэгдэл шаардлагатай"
          }
          formula={
            runwayMonths !== null && cashBalance !== null
              ? `Нийт бэлэн мөнгө ÷ сарын дундаж зарлага.\nСарын дундаж зарлага = нийт зарлага ÷ гүйлгээтэй сарын тоо.\n${fmtSigned(cashBalance)} ÷ ${fmt(avgMonthlyOutflow)} = ${runwayText(runwayMonths)}\nОдоогийн бэлэн мөнгө хэдэн сар хүрэлцэхийг харуулна.`
              : "Нийт бэлэн мөнгө ÷ сарын дундаж зарлага.\nДансны эцсийн үлдэгдэл эсвэл зарлага бүртгэгдээгүй тул тооцох боломжгүй."
          }
        />
      </div>

      {/* Үе-үеийн харьцуулалт */}
      {periodOverPeriod && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Өмнөх үетэй харьцуулалт</h3>
            <p className="text-xs text-slate-400">
              {periodOverPeriod.current.label} · өмнө нь {periodOverPeriod.previous.label}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Орлого</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">{fmt(periodOverPeriod.current.inflow)}</p>
              <TrendBadge pct={periodOverPeriod.inflowPct} goodWhenUp />
            </div>
            <div>
              <p className="text-xs text-slate-500">Зарлага</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-rose-600">{fmt(periodOverPeriod.current.outflow)}</p>
              <TrendBadge pct={periodOverPeriod.outflowPct} goodWhenUp={false} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Цэвэр урсгал</p>
              <p className={`mt-0.5 text-base font-semibold tabular-nums ${periodOverPeriod.current.net >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                {fmtSigned(periodOverPeriod.current.net)}
              </p>
              <TrendBadge pct={periodOverPeriod.netPct} goodWhenUp />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
