"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { BarChart2, LayoutDashboard, ListTree, RefreshCw, Upload, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import UserMenu from "@/components/UserMenu";
import FeedbackButton from "@/components/FeedbackButton";
import { emitDataChanged } from "@/lib/use-data-refresh";

const NAV = [
  { href: "/", label: "Хяналтын самбар", icon: LayoutDashboard },
  { href: "/breakdown", label: "Задаргаа", icon: ListTree },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!uploadModalOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUploadModalOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [uploadModalOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navLinks = (variant: "side" | "top") =>
    NAV.map(item => {
      const active = isActive(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={
            variant === "side"
              ? `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              : `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
          }
        >
          <Icon className={variant === "side" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900">
      {/* Зүүн sidebar (md+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/" className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-slate-900">FinMate</h1>
            <p className="truncate text-xs text-slate-500">Санхүүгийн зөвлөх</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">{navLinks("side")}</nav>
      </aside>

      {/* Контентын хэсэг */}
      <div className="md:pl-60">
        {/* Дээд header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            {/* Mobile: лого + хэвтээ nav */}
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <BarChart2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="hidden items-center gap-1 md:flex" />
            <div className="flex items-center gap-1 overflow-x-auto md:hidden">{navLinks("top")}</div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => emitDataChanged()}
                className="rounded-lg p-2 text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-700"
                title="Шинэчлэх"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Файл оруулах</span>
              </button>
              {session?.user && (
                <UserMenu email={session.user.email ?? ""} name={session.user.name} />
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">{children}</main>
      </div>

      {/* Upload modal */}
      {uploadModalOpen && (
        <>
          <div
            onClick={() => setUploadModalOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40 animate-pop-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Файл оруулах</h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              PDF, Excel (.xlsx) эсвэл CSV формат дэмжигдэнэ. Файл доторх гүйлгээ нь огнооны дагуу зөв сард байршина.
            </p>
            <FileUpload
              onSuccess={() => emitDataChanged()}
              onRequestClose={() => setUploadModalOpen(false)}
            />
          </div>
        </>
      )}

      <FeedbackButton />
    </div>
  );
}
