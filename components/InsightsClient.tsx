"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import CounterpartyInsights from "@/components/CounterpartyInsights";

export default function InsightsClient() {
  return (
    <AppShell>
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Тойм руу буцах
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Гүйлгээний шинжилгээ
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Бүх харьцагчийн бүрэн жагсаалт — харьцангуй хэмжээгээр эрэмбэлэв
        </p>
      </div>

      {/* Бүрэн (top 8 биш) жагсаалт */}
      <CounterpartyInsights full />
    </AppShell>
  );
}
