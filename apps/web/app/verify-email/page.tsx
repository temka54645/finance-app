"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { resendVerificationAction } from "@/app/(auth)/actions";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl text-center">
          <Loader2 className="h-7 w-7 text-blue-500 animate-spin mx-auto" />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const email = (params.get("email") ?? "").toLowerCase();

  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendPending, startResend] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (code.length !== 6) {
      setError("6 оронтой кодоо бүрэн оруулна уу");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const data = await res.json();
        if (res.ok) {
          setVerified(true);
        } else {
          setError(data.error ?? "Баталгаажуулж чадсангүй");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Сүлжээний алдаа");
      }
    });
  };

  const onResend = () => {
    if (!email) return;
    setError(null);
    setInfo(null);
    startResend(async () => {
      const fd = new FormData();
      fd.set("email", email);
      const res = await resendVerificationAction(fd);
      if (res.ok) {
        setInfo("Шинэ код илгээгдлээ. Имэйлээ шалгана уу.");
        setCode("");
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl text-center">
        {verified ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Имэйл баталгаажлаа!</h1>
            {email && <p className="mt-2 text-sm text-slate-600">{email}</p>}
            <p className="mt-1 text-xs text-slate-500">Одоо нэвтэрч системийг ашиглаж эхлэх боломжтой.</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:brightness-110"
            >
              Нэвтрэх
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Имэйл баталгаажуулах</h1>
            <p className="mt-2 text-sm text-slate-500">
              {email ? (
                <>
                  <span className="font-medium text-slate-700">{email}</span> хаягруу илгээсэн
                  <br />6 оронтой кодоо оруулна уу.
                </>
              ) : (
                "Имэйлдээ ирсэн 6 оронтой кодоо оруулна уу."
              )}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-slate-900 placeholder:tracking-[0.5em] placeholder:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
              />

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Баталгаажуулах
              </button>
            </form>

            <div className="mt-6 space-y-2">
              <button
                onClick={onResend}
                disabled={resendPending || !email}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {resendPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Код дахин илгээх
              </button>
              <div>
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
                  Нэвтрэх хуудас руу буцах
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
