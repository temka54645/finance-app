"use client";

import { useState } from "react";
import { Lock, ChevronDown, ChevronRight } from "lucide-react";

/**
 * C хэсэг — санхүүгийн нэмэлт тайлан (орлогын тайлан, баланс, нэхэмжлэх) шаардах
 * үзүүлэлтүүд. Одоогийн систем зөвхөн банкны хуулга (бэлэн мөнгөний урсгал) хадгалдаг
 * тул эдгээрийг тооцох эх өгөгдөл байхгүй. Тус бүрд нь юу дутагдаж байгааг тайлбарлана.
 */
const METRICS: { title: string; needs: string }[] = [
  { title: "Цэвэр ашиг / ашгийн маржин", needs: "Орлогын тайлан (нийт орлого, нийт зардал) шаардлагатай" },
  { title: "Нийт ашгийн маржин", needs: "Борлуулсан бүтээгдэхүүний өртөг (COGS) шаардлагатай" },
  { title: "Хувьцааны өгөөж (ROE)", needs: "Эзэмшигчдийн өмчийн хэмжээ шаардлагатай" },
  { title: "Активын өгөөж (ROA)", needs: "Нийт активын дүн шаардлагатай" },
  { title: "Эргэлтийн / түргэн харьцаа", needs: "Эргэлтийн актив ба эргэлтийн өр төлбөр шаардлагатай" },
  { title: "Өр / өмчийн харьцаа", needs: "Нийт өр төлбөр ба өмчийн дүн шаардлагатай" },
  { title: "Авлага / өглөгийн насжилт", needs: "Нэхэмжлэхийн өгөгдөл (огноо, төлбөрийн нөхцөл) шаардлагатай" },
  { title: "EBITDA", needs: "Орлогын тайлан (хүү, татвар, элэгдэл) шаардлагатай" },
];

export default function MissingDataSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Lock className="h-4 w-4 text-slate-400" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-700">Нэмэлт өгөгдөл шаардсан үзүүлэлтүүд</span>
          <span className="block text-xs text-slate-400">
            Эдгээр санхүүгийн харьцаа банкны хуулгаас гадуурх тайлан шаарддаг
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
          {METRICS.map((m) => (
            <div key={m.title} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
              <p className="text-sm font-medium text-slate-500">{m.title}</p>
              <p className="mt-1 flex items-start gap-1 text-xs text-slate-400">
                <Lock className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>Өгөгдөл дутуу — {m.needs}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
