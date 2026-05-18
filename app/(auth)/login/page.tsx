"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart2, Loader2 } from "lucide-react";
import { loginAction } from "../actions";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(formData);
      if (res.ok) router.push("/");
      else setError(res.error);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Нэвтрэх</h1>
          <p className="text-xs text-gray-500">Санхүүгийн дүн шинжилгээ</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Нууц үг</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Нэвтрэх
        </button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">эсвэл</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <GoogleSignInButton label="Google-ээр нэвтрэх" />

      <p className="text-sm text-center text-gray-500 mt-4">
        Шинэ хэрэглэгч үү?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">Бүртгүүлэх</Link>
      </p>
    </div>
  );
}
