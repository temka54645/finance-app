"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction, resendVerificationAction } from "../actions";
import GoogleSignInButton from "@/components/GoogleSignInButton";

// NextAuth алдааны кодыг хэрэглэгчид ойлгомжтой монгол мессеж болгоно.
// Алдаа гарвал auth нь /login?error=<code> руу буцаадаг (pages.error="/login").
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Энэ имэйл хаяг нууц үгээр бүртгэлтэй байна. Эхлээд нууц үгээрээ нэвтэрнэ үү.",
  GoogleNoEmail: "Google бүртгэлээс имэйл хаяг авч чадсангүй. Өөр аргаар нэвтэрнэ үү.",
  AccessDenied: "Нэвтрэх зөвшөөрөл олдсонгүй. Дахин оролдоно уу.",
  Configuration: "Системийн тохиргооны алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
  Verification: "Баталгаажуулах линк хүчингүй болсон байна. Дахин илгээнэ үү.",
};
const AUTH_ERROR_FALLBACK = "Google-ээр нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.";

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resendPending, startResend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  // OAuth (Google) урсгалаас ?error=<code>-оор буцаж ирэх алдааг харуулна.
  // window дээр client-side уншина — useSearchParams-ийн Suspense шаардлагаас зайлсхийнэ.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (!code) return;
    // URL query-г hydration-ы дараа уншиж state-д тавих нь зорилготой (external
    // system-тэй sync) — энэ rule энд false-positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_FALLBACK);
    // URL-аас error-ыг цэвэрлэнэ — refresh хийхэд дахин гарахгүй.
    params.delete("error");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendOk(false);
    const formData = new FormData(e.currentTarget);
    setLastEmail(String(formData.get("email") ?? ""));
    startTransition(async () => {
      const res = await loginAction(formData);
      if (res.ok) {
        router.push("/");
        return;
      }
      setError(res.error);
      if (res.code === "EmailNotVerified") setNeedsVerification(true);
    });
  };

  const onResend = () => {
    if (!lastEmail) return;
    setError(null);
    setResendOk(false);
    startResend(async () => {
      const fd = new FormData();
      fd.set("email", lastEmail);
      const res = await resendVerificationAction(fd);
      if (res.ok) setResendOk(true);
      else setError(res.error);
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl">
      <div className="mb-7 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Тавтай морил</h1>
        <p className="text-sm text-slate-500">Бүртгэлдээ нэвтэрч үргэлжлүүлнэ үү</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
            {needsVerification && (
              <button
                type="button"
                onClick={onResend}
                disabled={resendPending || !lastEmail}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
              >
                {resendPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Баталгаажуулах линк дахин илгээх
              </button>
            )}
          </div>
        )}
        {resendOk && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Шинэ баталгаажуулах линк илгээгдлээ. Имэйлээ шалгана уу.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Нэвтрэх
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-slate-400">эсвэл</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton label="Google-ээр нэвтрэх" />

      <p className="mt-6 text-center text-sm text-slate-500">
        Шинэ хэрэглэгч үү?{" "}
        <Link href="/signup" className="font-medium text-blue-600 transition-colors hover:text-blue-700">
          Бүртгүүлэх
        </Link>
      </p>
    </div>
  );
}
