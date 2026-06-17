import {
  Banknote, Briefcase, Coffee, Car, ShoppingBag, Zap, Heart, GraduationCap,
  Wrench, Receipt, Users, TrendingUp, RotateCcw, Percent, HelpCircle, FileQuestion,
  type LucideIcon,
} from "lucide-react";
import { getCategoryMeta } from "@/lib/categories";

interface CategoryStyle {
  icon: LucideIcon;
  bg: string;      // background-color класс
  text: string;    // icon өнгө класс
  label?: string;  // богино label
}

const STYLES: Record<string, CategoryStyle> = {
  // ── Орлого ────────────────────────────────────────
  "Цалин":                  { icon: Banknote, bg: "bg-green-100", text: "text-green-700" },
  "Шилжүүлэг хүлээн авсан": { icon: TrendingUp, bg: "bg-emerald-100", text: "text-emerald-700" },
  "Буцаалт":                { icon: RotateCcw, bg: "bg-teal-100", text: "text-teal-700" },
  "Хүү":                    { icon: Percent, bg: "bg-cyan-100", text: "text-cyan-700" },
  "Бусад орлого":           { icon: HelpCircle, bg: "bg-lime-100", text: "text-lime-700" },

  // ── Зарлага ───────────────────────────────────────
  "Банкны шимтгэл":         { icon: Receipt, bg: "bg-amber-100", text: "text-amber-700" },
  "Цалин зарлага":          { icon: Users, bg: "bg-purple-100", text: "text-purple-700" },
  "Хоол & Ресторан":        { icon: Coffee, bg: "bg-orange-100", text: "text-orange-700" },
  "Тээвэр":                 { icon: Car, bg: "bg-sky-100", text: "text-sky-700" },
  "Худалдаа":               { icon: ShoppingBag, bg: "bg-pink-100", text: "text-pink-700" },
  "Коммунал":               { icon: Zap, bg: "bg-yellow-100", text: "text-yellow-700" },
  "Эрүүл мэнд":             { icon: Heart, bg: "bg-rose-100", text: "text-rose-700" },
  "Боловсрол":              { icon: GraduationCap, bg: "bg-indigo-100", text: "text-indigo-700" },
  "Цэвэрлэгээ & Засвар":    { icon: Wrench, bg: "bg-slate-100", text: "text-slate-700" },
  "Татвар":                 { icon: Briefcase, bg: "bg-blue-100", text: "text-blue-700" },
  "Бусад зарлага":          { icon: HelpCircle, bg: "bg-gray-100", text: "text-gray-700" },

  // ── Default ───────────────────────────────────────
  "Ангилаагүй":             { icon: FileQuestion, bg: "bg-gray-100", text: "text-gray-500" },
};

const FALLBACK: CategoryStyle = STYLES["Ангилаагүй"];

export function getCategoryStyle(category: string): CategoryStyle {
  // 1) Нэгдсэн каталог (lib/categories.ts) — бүх стандарт ангиллыг хамарна.
  const meta = getCategoryMeta(category);
  if (meta) return { icon: meta.icon, bg: meta.bg, text: meta.color };
  // 2) Хуучин нэрс (каталогт байхгүй боловч хадгалагдсан байж болзошгүй) → 3) fallback.
  return STYLES[category] ?? FALLBACK;
}

// Tailwind text-color class → hex (categories.ts дэх color утгуудтай таарна)
const TAILWIND_TO_HEX: Record<string, string> = {
  "text-emerald-600": "#059669",
  "text-blue-600":    "#2563eb",
  "text-violet-600":  "#7c3aed",
  "text-amber-600":   "#d97706",
  "text-amber-700":   "#b45309",
  "text-pink-600":    "#db2777",
  "text-rose-600":    "#e11d48",
  "text-teal-600":    "#0d9488",
  "text-orange-600":  "#ea580c",
  "text-slate-600":   "#475569",
  "text-slate-700":   "#334155",
  "text-indigo-600":  "#4f46e5",
  "text-cyan-600":    "#0891b2",
  "text-cyan-700":    "#0e7490",
  "text-sky-600":     "#0284c7",
  "text-purple-600":  "#9333ea",
  "text-fuchsia-600": "#c026d3",
  "text-red-600":     "#dc2626",
  "text-stone-600":   "#57534e",
};

export function colorClassToHex(colorClass: string): string {
  return TAILWIND_TO_HEX[colorClass] ?? "#9ca3af";
}

// Chart-д ашиглах өнгөнүүд (Tailwind class биш, hex) — categories.ts-тай синхрончлогдсон
export const CATEGORY_COLORS: Record<string, string> = {
  // ── Хувь хүний орлого ─────────────────────────
  "Цалин":                        "#059669",
  "Урамшуулал":                   "#059669",
  "Гэрээт ажил":                  "#2563eb",
  "Хөрөнгө оруулалт":             "#7c3aed",
  "Хувьцааны ногдол":             "#d97706",
  "Хадгаламжийн хүү":             "#db2777",
  "Бэлэг / Хандив":               "#e11d48",
  "Буцаалт":                      "#0d9488",
  "Зээл авсан":                   "#ea580c",
  "Бусад орлого":                 "#475569",
  // ── Байгууллагын орлого ───────────────────────
  "Бүтээгдэхүүний борлуулалт":    "#059669",
  "Үйлчилгээний орлого":          "#2563eb",
  "Захиалга / Subscription":      "#4f46e5",
  "Түрээсийн орлого":             "#0284c7",
  "Банкны хүү":                   "#db2777",
  // ── Хувь хүний зарлага ───────────────────────
  "Хүнс":                         "#059669",
  "Хоол, ресторан":               "#ea580c",
  "Кафе, амттан":                 "#e11d48",
  "Орон сууцны түрээс":           "#4f46e5",
  "Ус, дулаан, цахилгаан":        "#d97706",
  "Засвар, тохижилт":             "#475569",
  "Утас":                         "#7c3aed",
  "Интернэт":                     "#0891b2",
  "Стрийминг үйлчилгээ":          "#4f46e5",
  "Тээвэр":                       "#2563eb",
  "Шатахуун":                     "#e11d48",
  "Нийтийн тээвэр":               "#0284c7",
  "Эрүүл мэнд":                   "#e11d48",
  "Эм, эмнэлэг":                  "#db2777",
  "Биеийн тамир":                 "#059669",
  "Сургалт":                      "#2563eb",
  "Ном, сэтгүүл":                 "#b45309",
  "Кино, шоу":                    "#9333ea",
  "Хөгжим, подкаст":              "#7c3aed",
  "Тоглоом":                      "#c026d3",
  "Аялал":                        "#0284c7",
  "Хувцас":                       "#db2777",
  "Гоо сайхан":                   "#e11d48",
  "Үсчин":                        "#0d9488",
  "Хүүхдийн зардал":              "#ea580c",
  "Гэрийн тэжээвэр амьтан":       "#b45309",
  "Банкны шимтгэл":               "#d97706",
  "Зээлийн төлбөр":               "#dc2626",
  "Татвар":                       "#2563eb",
  // ── Байгууллагын зарлага ─────────────────────
  "Цалин зарлага":                "#9333ea",
  "Урамшуулал, шагнал":           "#9333ea",
  "Нийгмийн даатгал":             "#2563eb",
  "Оффис түрээс":                 "#4f46e5",
  "Бичиг хэргийн зардал":         "#475569",
  "Засвар, үйлчилгээ":            "#57534e",
  "Техник хангамж":               "#0e7490",
  "Программ хангамж":             "#2563eb",
  "Интернэт, утас":               "#0891b2",
  "Хүргэлт":                      "#ea580c",
  "Тээврийн зардал":              "#2563eb",
  "Зар сурталчилгаа":             "#c026d3",
  "Үйл явдал, уулзалт":           "#db2777",
  "Зөвлөх үйлчилгээ":             "#7c3aed",
  "Гэрээт гүйцэтгэгч":            "#9333ea",
  "Хууль, нягтлан":               "#334155",
  "Бусад зарлага":                "#6b7280",
  // ── Default ───────────────────────────────────
  "Ангилаагүй":                   "#9ca3af",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#9ca3af";
}
