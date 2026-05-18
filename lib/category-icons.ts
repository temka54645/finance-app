import {
  Banknote, Briefcase, Coffee, Car, ShoppingBag, Zap, Heart, GraduationCap,
  Wrench, Receipt, Users, TrendingUp, RotateCcw, Percent, HelpCircle, FileQuestion,
  type LucideIcon,
} from "lucide-react";

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
  return STYLES[category] ?? FALLBACK;
}

// Chart-д ашиглах өнгөнүүд (Tailwind class биш, hex)
export const CATEGORY_COLORS: Record<string, string> = {
  "Цалин": "#16a34a",
  "Шилжүүлэг хүлээн авсан": "#10b981",
  "Буцаалт": "#14b8a6",
  "Хүү": "#06b6d4",
  "Бусад орлого": "#84cc16",
  "Банкны шимтгэл": "#f59e0b",
  "Цалин зарлага": "#a855f7",
  "Хоол & Ресторан": "#f97316",
  "Тээвэр": "#0ea5e9",
  "Худалдаа": "#ec4899",
  "Коммунал": "#eab308",
  "Эрүүл мэнд": "#f43f5e",
  "Боловсрол": "#6366f1",
  "Цэвэрлэгээ & Засвар": "#64748b",
  "Татвар": "#3b82f6",
  "Бусад зарлага": "#6b7280",
  "Ангилаагүй": "#9ca3af",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#9ca3af";
}
