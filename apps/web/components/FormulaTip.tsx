"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface Props {
  /** Тухайн дүн хэрхэн тооцоологдсон томьёо / тайлбар. */
  text: string;
}

/**
 * Картын гарчгийн дэргэд гарах жижиг "ⓘ" товч.
 * Хулганаар дээгүүр нь очих, фокус хийх, эсвэл дарахад тухайн дүнгийн
 * тооцооллын томьёог жижиг tooltip-ээр харуулна.
 */
export default function FormulaTip({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Тооцооллын томьёо харах"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-slate-300 transition-colors hover:text-slate-500 focus:outline-none focus-visible:text-slate-500"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-60 whitespace-pre-line rounded-lg border border-slate-200 bg-white p-2.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-600 shadow-xl shadow-slate-300/40"
        >
          {text}
        </span>
      )}
    </span>
  );
}
