import type { ReactNode } from "react";
import Image from "next/image";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Аль хэдийн нэвтэрсэн бол /login, /signup руу буцаж орохгүй — role-ийн нүүр рүү.
  await redirectIfAuthenticated();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Decorative background — blur circles + dotted pattern */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-blue-300/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-300/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row">
        {/* Brand panel (desktop only) */}
        <aside className="hidden flex-1 flex-col justify-between p-12 lg:flex">
          <div className="flex items-center">
            <Image
              src="/finmate-logo.png"
              width={1618}
              height={512}
              alt="FinMate"
              priority
              className="h-9 w-auto"
            />
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight text-slate-900">
                Санхүүгээ <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  ухаалгаар удирд
                </span>
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
                Таны цахим санхүүгийн зөвлөх — орлого, зарлагаа нэг дороос хянаж, сар бүрийн чиг хандлагаа ил тод харна уу.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                { icon: TrendingUp, text: "Сар, жилийн динамик дүн шинжилгээ" },
                { icon: Sparkles, text: "Автомат ангилал, ухаалаг тайлан" },
                { icon: ShieldCheck, text: "Найдвартай хамгаалалт, нууцлал" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} FinMate
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center justify-center lg:hidden">
              <Image
                src="/finmate-logo.png"
                width={1618}
                height={512}
                alt="FinMate"
                priority
                className="h-9 w-auto"
              />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
