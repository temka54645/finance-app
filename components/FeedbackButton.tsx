"use client";

import { useState, useEffect, useTransition } from "react";
import { MessageSquarePlus, X, Bug, Lightbulb, HelpCircle, Send, Loader2, CheckCircle2 } from "lucide-react";

type IssueType = "bug" | "feature" | "question" | "other";

const TYPES: { value: IssueType; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { value: "bug",      label: "Алдаа мэдээлэх",     icon: Bug,         accent: "rose"   },
  { value: "feature",  label: "Шинэ санал",         icon: Lightbulb,   accent: "amber"  },
  { value: "question", label: "Асуулт",             icon: HelpCircle,  accent: "blue"   },
  { value: "other",    label: "Бусад",              icon: MessageSquarePlus, accent: "slate" },
];

const TYPE_CLASS: Record<string, string> = {
  rose:   "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  amber:  "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  blue:   "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  slate:  "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
};

const TYPE_ACTIVE: Record<string, string> = {
  rose:   "border-rose-500 bg-rose-100 text-rose-800 ring-2 ring-rose-300",
  amber:  "border-amber-500 bg-amber-100 text-amber-800 ring-2 ring-amber-300",
  blue:   "border-blue-500 bg-blue-100 text-blue-800 ring-2 ring-blue-300",
  slate:  "border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-300",
};

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<IssueType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setType("bug");
        setTitle("");
        setDescription("");
        setError(null);
        setSuccess(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, title: title.trim(), description: description.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Илгээж чадсангүй");
        setSuccess(true);
        setTimeout(() => setOpen(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/30 transition-all hover:brightness-110 hover:scale-105"
        title="Санал илгээх / Алдаа мэдээлэх"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Санал илгээх</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-300/40 z-50 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Санал илгээх</h2>
                <p className="text-xs text-slate-500 mt-0.5">Бид таны санал бүрд хариу өгнө</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Илгээлээ! Баярлалаа</h3>
                <p className="mt-1 text-sm text-slate-500">Шилдэг шийдэхээр шалгана.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Type chips */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                    Төрөл
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TYPES.map(t => {
                      const Icon = t.icon;
                      const active = type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setType(t.value)}
                          className={`inline-flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                            active ? TYPE_ACTIVE[t.accent] : TYPE_CLASS[t.accent]
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Гарчиг
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Богино тайлбар"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Дэлгэрэнгүй
                  </label>
                  <textarea
                    required
                    maxLength={5000}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Юу болсон, юу хүсэж байна, ямар алхамтай нөхцлүүлсэн г.м"
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-400 text-right">{description.length}/5000</p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Цуцлах
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !title.trim() || !description.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Илгээх
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
