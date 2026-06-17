"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "ok" | "error";

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
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token байхгүй байна");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setStatus("ok");
          setMessage(data.email ?? "");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Баталгаажуулж чадсангүй");
        }
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Сүлжээний алдаа");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-blue-200/30 backdrop-blur-xl text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Баталгаажуулж байна...</h1>
            <p className="mt-2 text-sm text-slate-500">Хэдэн секунд хүлээнэ үү</p>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Имэйл баталгаажлаа!</h1>
            {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
            <p className="mt-1 text-xs text-slate-500">Одоо нэвтэрч системийг ашиглаж эхлэх боломжтой.</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:brightness-110"
            >
              Нэвтрэх
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Баталгаажуулж чадсангүй</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <div className="mt-6 space-y-2">
              <Link
                href="/signup"
                className="block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Шинээр бүртгүүлэх
              </Link>
              <Link
                href="/login"
                className="block text-sm text-slate-500 hover:text-slate-700"
              >
                Нэвтрэх
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
