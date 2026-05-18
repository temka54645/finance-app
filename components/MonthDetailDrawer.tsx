"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import MonthDetailContent from "./MonthDetailContent";

const MONTH_NAMES = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

interface Props {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onChange: () => void;
}

export default function MonthDetailDrawer({ open, year, month, onClose, onChange }: Props) {
  // ESC дарж хаах
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[720px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 uppercase">Дэлгэрэнгүй</p>
            <h2 className="text-lg font-bold text-gray-900">
              {year} он · {MONTH_NAMES[month - 1]}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={`/y/${year}/${month}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Шинэ цонхонд бүтэн дэлгэцээр нээх"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Шинэ цонх</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Хаах"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {open && (
            <MonthDetailContent
              year={year}
              month={month}
              onExternalChange={onChange}
            />
          )}
        </div>
      </aside>
    </>
  );
}
