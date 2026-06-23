"use client";

import { useState } from "react";
import { Lock, ChevronDown, ChevronRight, FileText, Calculator, Upload, Info } from "lucide-react";

/**
 * C хэсэг — санхүүгийн нэмэлт тайлан шаардах үзүүлэлтүүдийн ГАРЫН АВЛАГА.
 *
 * Одоогийн систем зөвхөн банкны хуулга (бэлэн мөнгөний урсгал) ажилладаг тул эдгээр
 * үзүүлэлтийг тооцох эх өгөгдөл байхгүй. Үзүүлэлт тус бүрийн тодорхойлолт, томьёо,
 * шаардагдах өгөгдөл болон тэр өгөгдлийг хаана оруулах/бүртгэх зааврыг харуулна.
 */

type DocKind = "income" | "balance" | "invoice";

const DOC_META: Record<DocKind, { label: string; tone: string }> = {
  income: { label: "Орлогын тайлан", tone: "bg-violet-100 text-violet-700" },
  balance: { label: "Балансын тайлан", tone: "bg-sky-100 text-sky-700" },
  invoice: { label: "Нэхэмжлэх", tone: "bg-amber-100 text-amber-700" },
};

interface MetricGuide {
  title: string;
  doc: DocKind;
  /** Үзүүлэлт юу хэмждэг вэ */
  what: string;
  /** Тооцох томьёо */
  formula: string;
  /** Шаардлагатай үзүүлэлтүүд (өгөгдөл) */
  inputs: string[];
  /** Тэр өгөгдлийг хаана оруулах / хэрхэн бүртгэх */
  how: string;
}

const METRICS: MetricGuide[] = [
  {
    title: "Цэвэр ашиг / ашгийн маржин",
    doc: "income",
    what: "Бүх зардал (өртөг, үйл ажиллагаа, хүү, татвар)-ыг хассаны дараах эцсийн ашиг ба түүний орлогод эзлэх хувь.",
    formula:
      "Цэвэр ашиг = Нийт орлого − (Борлуулалтын өртөг + Үйл ажиллагааны зардал + Хүү + Татвар)\nАшгийн маржин (%) = Цэвэр ашиг ÷ Нийт орлого × 100",
    inputs: ["Нийт борлуулалт / орлого", "Борлуулалтын өртөг (COGS)", "Үйл ажиллагааны зардал", "Хүүгийн төлбөр", "Татварын зардал"],
    how: "Орлогын тайлангаа (Income Statement / P&L) Excel хэлбэрээр оруулах, эсвэл сар бүрийн нийт орлого/зардлыг гараар бүртгэх.",
  },
  {
    title: "Нийт ашгийн маржин",
    doc: "income",
    what: "Борлуулалтаас зөвхөн бүтээгдэхүүний өртгийг хассаны дараах ашиг — үндсэн үйл ажиллагааны ашигт байдал.",
    formula:
      "Нийт ашиг = Орлого − Борлуулсан бүтээгдэхүүний өртөг (COGS)\nНийт ашгийн маржин (%) = Нийт ашиг ÷ Орлого × 100",
    inputs: ["Нийт борлуулалт / орлого", "Борлуулсан бүтээгдэхүүний өртөг (түүхий эд, материал, шууд хөдөлмөр)"],
    how: "COGS-ийн дүнг гараар бүртгэх эсвэл худалдан авалт / нөөцийн тайлангаа оруулах.",
  },
  {
    title: "Хувьцааны өгөөж (ROE)",
    doc: "balance",
    what: "Эзэмшигчдийн оруулсан өмчид ногдох ашгийн өгөөж — хөрөнгө хэр үр ашигтай ажиллаж байгааг харуулна.",
    formula: "ROE (%) = Цэвэр ашиг ÷ Эзэмшигчдийн өмч × 100",
    inputs: ["Цэвэр ашиг (орлогын тайлангаас)", "Эзэмшигчдийн өмчийн дүн"],
    how: "Балансын тайлангийн өмчийн хэсгийг оруулах, эсвэл хувь нийлүүлсэн хөрөнгө + хуримтлагдсан ашгаа гараар бүртгэх.",
  },
  {
    title: "Активын өгөөж (ROA)",
    doc: "balance",
    what: "Нийт активт ногдох ашгийн өгөөж — компани хөрөнгөө ашиг олоход хэр үр дүнтэй ашигладаг вэ.",
    formula: "ROA (%) = Цэвэр ашиг ÷ Нийт актив × 100",
    inputs: ["Цэвэр ашиг (орлогын тайлангаас)", "Нийт активын дүн"],
    how: "Балансын тайлангийн актив хэсгийг оруулах эсвэл нийт хөрөнгийн дүнгээ бүртгэх.",
  },
  {
    title: "Эргэлтийн / түргэн харьцаа",
    doc: "balance",
    what: "Богино хугацааны өр төлбөрөө барагдуулах төлбөрийн чадвар. 1-ээс дээш бол эерэг.",
    formula:
      "Эргэлтийн харьцаа = Эргэлтийн актив ÷ Эргэлтийн өр төлбөр\nТүргэн харьцаа = (Эргэлтийн актив − Бараа материал) ÷ Эргэлтийн өр төлбөр",
    inputs: ["Эргэлтийн актив (бэлэн мөнгө, авлага, бараа материал)", "Эргэлтийн өр төлбөр (богино хугацаат өглөг, зээл)"],
    how: "Балансын тайлангаа оруулах эсвэл эргэлтийн актив / өр төлбөрийн дүнгээ гараар бүртгэх.",
  },
  {
    title: "Өр / өмчийн харьцаа",
    doc: "balance",
    what: "Компани үйл ажиллагаагаа өрөөр санхүүжүүлж буй түвшин — хэт өндөр бол санхүүгийн эрсдэл өндөр.",
    formula: "Өр / өмчийн харьцаа = Нийт өр төлбөр ÷ Эзэмшигчдийн өмч",
    inputs: ["Нийт өр төлбөр (богино + урт хугацаат)", "Эзэмшигчдийн өмч"],
    how: "Балансын тайлангаа оруулах эсвэл зээл / өрийн үлдэгдэл болон өмчийн дүнгээ бүртгэх.",
  },
  {
    title: "Авлага / өглөгийн насжилт",
    doc: "invoice",
    what: "Нээлттэй нэхэмжлэхүүдийг хугацааны бүлгээр (0–30, 31–60, 61–90, 90+ хоног) ангилж, хэр удаан төлөгдөөгүй байгааг харуулна.",
    formula: "Нэхэмжлэх бүрийг: өнөөдөр − нэхэмжилсэн огноо = хоног → хугацааны бүлэгт хуваарилна",
    inputs: ["Нэхэмжлэх огноо", "Төлбөрийн эцсийн хугацаа", "Нэхэмжлэхийн дүн", "Төлөгдсөн эсэх / үлдэгдэл"],
    how: "Нэхэмжлэх (invoice) бүртгэлээ оруулах эсвэл нэхэмжлэх тус бүрийг огноо, дүн, төлбөрийн төлөвтэй нь гараар бүртгэх.",
  },
  {
    title: "EBITDA",
    doc: "income",
    what: "Хүү, татвар, элэгдэл, хорогдлыг хасахаас өмнөх ашиг — үндсэн үйл ажиллагааны мөнгө бүтээх чадвар.",
    formula:
      "EBITDA = Цэвэр ашиг + Хүү + Татвар + Элэгдэл + Хорогдол\n(эсвэл = Үйл ажиллагааны ашиг + Элэгдэл / хорогдол)",
    inputs: ["Цэвэр ашиг", "Хүүгийн зардал", "Татварын зардал", "Элэгдэл ба хорогдол"],
    how: "Орлогын тайлан болон үндсэн хөрөнгийн элэгдлийн хуваарийг оруулах эсвэл эдгээр дүнгээ гараар бүртгэх.",
  },
];

function MetricRow({ m }: { m: MetricGuide }) {
  const [open, setOpen] = useState(false);
  const doc = DOC_META[m.doc];

  return (
    <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span className="flex-1 text-sm font-medium text-slate-600">{m.title}</span>
        <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block ${doc.tone}`}>
          {doc.label}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3 py-3 text-xs">
          <p className="text-slate-600">{m.what}</p>

          {/* Томьёо */}
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
              <Calculator className="h-3.5 w-3.5" /> Томьёо
            </p>
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-100">
              {m.formula}
            </pre>
          </div>

          {/* Шаардлагатай өгөгдөл */}
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
              <FileText className="h-3.5 w-3.5" /> Шаардлагатай өгөгдөл
            </p>
            <ul className="ml-1 space-y-0.5">
              {m.inputs.map((inp) => (
                <li key={inp} className="flex items-start gap-1.5 text-slate-600">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                  <span>{inp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Хаана оруулах / бүртгэх */}
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
              <Upload className="h-3.5 w-3.5" /> Хаана оруулах / бүртгэх
            </p>
            <p className="text-slate-600">{m.how}</p>
          </div>
        </div>
      )}
    </li>
  );
}

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
          <span className="block text-sm font-semibold text-slate-700">Нэмэлт өгөгдөл шаардсан үзүүлэлтүүд — гарын авлага</span>
          <span className="block text-xs text-slate-400">
            Үзүүлэлт бүрийн тодорхойлолт, томьёо, шаардагдах өгөгдөл, хаана оруулах зааврыг харна уу
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {/* Ерөнхий тайлбар */}
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Энэ систем одоогоор зөвхөн <strong>банкны хуулга</strong> (бэлэн мөнгөний урсгал) дээр ажилладаг.
              Доорх харьцаанууд нь <strong>орлогын тайлан</strong>, <strong>баланс</strong> эсвэл{" "}
              <strong>нэхэмжлэхийн</strong> өгөгдөл шаарддаг. Үзүүлэлт бүр дээр дарж дэлгэрэнгүйг үзнэ үү.
            </p>
          </div>

          <ul className="space-y-2">
            {METRICS.map((m) => (
              <MetricRow key={m.title} m={m} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
