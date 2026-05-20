"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, User, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { signupAction, resendVerificationAction } from "../actions";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15";

export default function SignupPage() {
  const [pending, startTransition] = useTransition();
  const [resendPending, startResend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Нууц үг таарахгүй байна");
      return;
    }
    startTransition(async () => {
      const res = await signupAction(formData);
      if (res.ok) {
        setVerifyEmail(res.email);
      } else {
        setError(res.error);
      }
    });
  };

  const onResend = () => {
    if (!verifyEmail) return;
    setError(null);
    setResendOk(false);
    startResend(async () => {
      const fd = new FormData();
      fd.set("email", verifyEmail);
      const res = await resendVerificationAction(fd);
      if (res.ok) setResendOk(true);
      else setError(res.error);
    });
  };

  // Success screen
  if (verifyEmail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Бүртгэл амжилттай!</h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{verifyEmail}</span> хаягруу баталгаажуулах линк илгээгдсэн.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Имэйлээ шалгаад линк дээр дарж бүртгэлээ баталгаажуулна уу. Линк нь 24 цагийн дотор хүчинтэй.
        </p>

        {resendOk && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Шинэ баталгаажуулах линк илгээгдлээ
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={onResend}
            disabled={resendPending}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {resendPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Линк дахин илгээх
          </button>
          <div>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
              Нэвтрэх хуудас руу буцах
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl">
      <div className="mb-7 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Бүртгэл үүсгэх</h1>
        <p className="text-sm text-slate-500">Хэдхэн секундэд бэлэн болно</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Нэр <span className="text-slate-400 normal-case">(заавал биш)</span>
          </label>
          <div className="group relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
            <input type="text" name="name" maxLength={80} placeholder="Таны нэр" className={inputBase} />
          </div>
        </div>

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
              placeholder="you@example.com"
              className={inputBase}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                minLength={8}
                autoComplete="new-password"
                placeholder="8+ тэмдэгт"
                className={inputBase}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Давтан
            </label>
            <div className="group relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                type="password"
                name="confirm"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Бүртгүүлэх
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-slate-400">эсвэл</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton label="Google-ээр бүртгүүлэх" />

      <p className="mt-6 text-center text-sm text-slate-500">
        Аль хэдийн бүртгэлтэй юу?{" "}
        <Link href="/login" className="font-medium text-blue-600 transition-colors hover:text-blue-700">
          Нэвтрэх
        </Link>
      </p>
    </div>
  );
}
