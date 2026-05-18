"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Building2, Loader2, ArrowRight, BarChart2, Check } from "lucide-react";

type UserType = "personal" | "business";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userType: selected }),
        });
        if (!res.ok) throw new Error("Хадгалж чадсангүй");
        // JWT-ийг шинэчлэх — jwt callback trigger="update"-ыг ажиллуулна
        await updateSession();
        router.push("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа");
      }
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* Brand */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Finance Analytics
          </span>
        </div>

        {/* Title */}
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-400">Эхний тохиргоо</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Та өөрийг хэрхэн{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              ашиглах
            </span>{" "}
            гэж байна вэ?
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Сонголтоосоо хамаарч ангиллын жагсаалт өөрчлөгдөнө. Дараа өөрчлөх боломжтой.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <OptionCard
            value="personal"
            selected={selected === "personal"}
            onClick={() => setSelected("personal")}
            icon={<User className="h-6 w-6" />}
            title="Хувь хүн"
            subtitle="Өөрийн хувийн санхүү"
            bullets={[
              "Хүнс, хоол, гэр бүл",
              "Цалин, бэлэг, буцаалт",
              "Зугаа цэнгэл, аялал",
            ]}
            accent="blue"
          />
          <OptionCard
            value="business"
            selected={selected === "business"}
            onClick={() => setSelected("business")}
            icon={<Building2 className="h-6 w-6" />}
            title="Байгууллага"
            subtitle="Компани / ХХК / Бизнес"
            bullets={[
              "Цалин, татвар, нийгмийн даатгал",
              "Оффис, тоног төхөөрөмж",
              "Борлуулалт, маркетинг",
            ]}
            accent="indigo"
          />
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!selected || pending}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Үргэлжлүүлэх
        </button>
      </div>
    </div>
  );
}

function OptionCard({
  value, selected, onClick, icon, title, subtitle, bullets, accent,
}: {
  value: UserType;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: "blue" | "indigo";
}) {
  const palette = accent === "blue"
    ? { iconBg: "bg-blue-100 text-blue-600", ring: "ring-blue-500" }
    : { iconBg: "bg-indigo-100 text-indigo-600", ring: "ring-indigo-500" };

  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected}
      className={`group relative rounded-2xl border bg-white p-6 text-left shadow-lg shadow-slate-200/60 transition-all hover:border-slate-300 ${
        selected
          ? `border-transparent ring-2 ${palette.ring} ring-offset-2`
          : "border-slate-200"
      }`}
    >
      {selected && (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${palette.iconBg}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <ul className="mt-4 space-y-1.5">
        {bullets.map(b => (
          <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
            <span className="mt-1 h-1 w-1 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
