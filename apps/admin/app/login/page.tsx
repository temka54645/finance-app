"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { adminLoginAction } from "./actions";

export default function AdminLoginPage() {
  const router = useRouter();

  const [pwPending, startPwTransition] = useTransition();
  const [pwError, setPwError] = useState<string | null>(null);

  const onCredentialsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError(null);
    const formData = new FormData(e.currentTarget);
    startPwTransition(async () => {
      const res = await adminLoginAction(formData);
      if (res.ok) router.push("/");
      else setPwError(res.error);
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Decorative background — blur circles + dotted pattern */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-indigo-300/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-blue-300/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                FinMate <span className="text-blue-600">Админ</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl">
            <div className="mb-7 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Удирдлагын самбар
              </h1>
              <p className="text-sm text-slate-500">
                Зөвхөн зөвшөөрөгдсөн админ хэрэглэгчдэд нээлттэй
              </p>
            </div>

            <form onSubmit={onCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Имэйл
                </label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Нууц үг
                </label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              {pwError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pwPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60"
              >
                {pwPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Хандах
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Энэ хуудас public хэрэглэгчдэд нээлттэй биш
          </p>
        </div>
      </div>
    </div>
  );
}
