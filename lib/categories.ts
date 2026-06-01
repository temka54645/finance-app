import {
  // Income icons
  Banknote, Briefcase, Building2, Gift, HandCoins, LineChart, PiggyBank,
  Landmark, Coins, Wallet, ReceiptText, Award, TrendingUp,
  // Expense icons
  ShoppingCart, UtensilsCrossed, Car, Home, Zap, Wifi, Phone, HeartPulse,
  GraduationCap, Plane, Film, Shirt, Fuel, Bus, Baby, PawPrint, Dumbbell,
  Sparkles, CreditCard, Receipt, Hammer, BookOpen, Pill, Scissors, Music,
  Gamepad2, Cake, Tv, Megaphone, Truck, Package, Users, FileText, Globe,
  Server, Shield, type LucideIcon,
} from "lucide-react";

export type UserType = "personal" | "business";

export type Category = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;  // text color
  bg: string;     // background color
};

export type CategoryGroup = {
  id: string;
  name: string;
  icon: LucideIcon;
  items: Category[];
};

// ── Хувь хүний орлого ─────────────────────────────────────────────
const PERSONAL_INCOME: CategoryGroup[] = [
  {
    id: "work", name: "Ажил, цалин", icon: Briefcase,
    items: [
      { id: "salary",     name: "Цалин",            icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "bonus",      name: "Урамшуулал",       icon: Award,    color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "freelance",  name: "Гэрээт ажил",      icon: Briefcase, color: "text-blue-600",  bg: "bg-blue-50" },
    ],
  },
  {
    id: "invest", name: "Хөрөнгө оруулалт", icon: LineChart,
    items: [
      { id: "investment", name: "Хөрөнгө оруулалт", icon: LineChart,  color: "text-violet-600", bg: "bg-violet-50" },
      { id: "dividend",   name: "Хувьцааны ногдол",  icon: Coins,      color: "text-amber-600",  bg: "bg-amber-50" },
      { id: "interest",   name: "Хадгаламжийн хүү",  icon: PiggyBank,  color: "text-pink-600",   bg: "bg-pink-50" },
    ],
  },
  {
    id: "other-in", name: "Бусад", icon: Wallet,
    items: [
      { id: "gift-in", name: "Бэлэг / Хандив",   icon: Gift,        color: "text-rose-600",   bg: "bg-rose-50" },
      { id: "refund",  name: "Буцаалт",          icon: ReceiptText, color: "text-teal-600",   bg: "bg-teal-50" },
      { id: "loan-in", name: "Зээл авсан",       icon: HandCoins,   color: "text-orange-600", bg: "bg-orange-50" },
      { id: "other-in",name: "Бусад орлого",     icon: Wallet,      color: "text-slate-600",  bg: "bg-slate-100" },
    ],
  },
];

// ── Хувь хүний зарлага ────────────────────────────────────────────
const PERSONAL_EXPENSE: CategoryGroup[] = [
  {
    id: "food", name: "Хүнс, хоол", icon: ShoppingCart,
    items: [
      { id: "food",       name: "Хүнс",             icon: ShoppingCart,    color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "restaurant", name: "Хоол, ресторан",   icon: UtensilsCrossed, color: "text-orange-600",  bg: "bg-orange-50" },
      { id: "cafe",       name: "Кафе, амттан",     icon: Cake,            color: "text-rose-600",    bg: "bg-rose-50" },
    ],
  },
  {
    id: "housing", name: "Орон сууц, ахуй", icon: Home,
    items: [
      { id: "rent",       name: "Орон сууцны түрээс", icon: Home,  color: "text-indigo-600", bg: "bg-indigo-50" },
      { id: "utilities",  name: "Ус, дулаан, цахилгаан", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
      { id: "home-repair",name: "Засвар, тохижилт",  icon: Hammer, color: "text-slate-600", bg: "bg-slate-100" },
    ],
  },
  {
    id: "comm", name: "Харилцаа холбоо", icon: Phone,
    items: [
      { id: "phone",     name: "Утас",               icon: Phone, color: "text-violet-600", bg: "bg-violet-50" },
      { id: "internet",  name: "Интернэт",           icon: Wifi,  color: "text-cyan-600",   bg: "bg-cyan-50" },
      { id: "streaming", name: "Стрийминг үйлчилгээ",icon: Tv,    color: "text-indigo-600", bg: "bg-indigo-50" },
    ],
  },
  {
    id: "transport", name: "Тээвэр", icon: Car,
    items: [
      { id: "transport",        name: "Тээвэр",       icon: Car,  color: "text-blue-600", bg: "bg-blue-50" },
      { id: "fuel",             name: "Шатахуун",     icon: Fuel, color: "text-rose-600", bg: "bg-rose-50" },
      { id: "publictransport",  name: "Нийтийн тээвэр",icon: Bus, color: "text-sky-600",  bg: "bg-sky-50" },
    ],
  },
  {
    id: "health", name: "Эрүүл мэнд", icon: HeartPulse,
    items: [
      { id: "health",   name: "Эрүүл мэнд",     icon: HeartPulse, color: "text-rose-600",    bg: "bg-rose-50" },
      { id: "pharmacy", name: "Эм, эмнэлэг",    icon: Pill,       color: "text-pink-600",    bg: "bg-pink-50" },
      { id: "fitness",  name: "Биеийн тамир",   icon: Dumbbell,   color: "text-emerald-600", bg: "bg-emerald-50" },
    ],
  },
  {
    id: "edu", name: "Боловсрол", icon: GraduationCap,
    items: [
      { id: "education", name: "Сургалт",       icon: GraduationCap, color: "text-blue-600",  bg: "bg-blue-50" },
      { id: "books",     name: "Ном, сэтгүүл",  icon: BookOpen,      color: "text-amber-700", bg: "bg-amber-50" },
    ],
  },
  {
    id: "entertainment", name: "Зугаа цэнгэл", icon: Film,
    items: [
      { id: "entertainment", name: "Кино, шоу",         icon: Film,     color: "text-purple-600",  bg: "bg-purple-50" },
      { id: "music",         name: "Хөгжим, подкаст",   icon: Music,    color: "text-violet-600",  bg: "bg-violet-50" },
      { id: "games",         name: "Тоглоом",           icon: Gamepad2, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
      { id: "travel",        name: "Аялал",             icon: Plane,    color: "text-sky-600",     bg: "bg-sky-50" },
    ],
  },
  {
    id: "personal", name: "Хувийн хэрэглээ", icon: Shirt,
    items: [
      { id: "clothes", name: "Хувцас",     icon: Shirt,    color: "text-pink-600", bg: "bg-pink-50" },
      { id: "beauty",  name: "Гоо сайхан", icon: Sparkles, color: "text-rose-600", bg: "bg-rose-50" },
      { id: "haircut", name: "Үсчин",      icon: Scissors, color: "text-teal-600", bg: "bg-teal-50" },
    ],
  },
  {
    id: "family", name: "Гэр бүл", icon: Baby,
    items: [
      { id: "kids", name: "Хүүхдийн зардал", icon: Baby,     color: "text-orange-600", bg: "bg-orange-50" },
      { id: "pet",  name: "Гэрийн тэжээвэр амьтан", icon: PawPrint, color: "text-amber-700", bg: "bg-amber-50" },
    ],
  },
  {
    id: "fees", name: "Шимтгэл, төлбөр", icon: Receipt,
    items: [
      { id: "bank-fee",  name: "Банкны шимтгэл", icon: Receipt,    color: "text-amber-600", bg: "bg-amber-50" },
      { id: "loan-pay",  name: "Зээлийн төлбөр", icon: CreditCard, color: "text-red-600",   bg: "bg-red-50" },
      { id: "tax",       name: "Татвар",         icon: Briefcase,  color: "text-blue-600",  bg: "bg-blue-50" },
    ],
  },
];

// ── Байгууллагын орлого ───────────────────────────────────────────
const BUSINESS_INCOME: CategoryGroup[] = [
  {
    id: "sales", name: "Борлуулалт", icon: TrendingUp,
    items: [
      { id: "product-sale",  name: "Бүтээгдэхүүний борлуулалт", icon: Package,    color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "service-sale",  name: "Үйлчилгээний орлого",       icon: Briefcase,  color: "text-blue-600",    bg: "bg-blue-50" },
      { id: "subscription",  name: "Захиалга / Subscription",   icon: Receipt,    color: "text-indigo-600",  bg: "bg-indigo-50" },
    ],
  },
  {
    id: "biz-other", name: "Бусад үйл ажиллагаа", icon: Building2,
    items: [
      { id: "rent-in",   name: "Түрээсийн орлого",   icon: Landmark,  color: "text-sky-600",   bg: "bg-sky-50" },
      { id: "interest",  name: "Банкны хүү",         icon: PiggyBank, color: "text-pink-600",  bg: "bg-pink-50" },
      { id: "dividend",  name: "Хөрөнгө оруулалт",   icon: LineChart, color: "text-violet-600",bg: "bg-violet-50" },
      { id: "refund",    name: "Буцаалт",            icon: ReceiptText, color: "text-teal-600",bg: "bg-teal-50" },
      { id: "other-in",  name: "Бусад орлого",       icon: Wallet,    color: "text-slate-600", bg: "bg-slate-100" },
    ],
  },
];

// ── Байгууллагын зарлага ──────────────────────────────────────────
const BUSINESS_EXPENSE: CategoryGroup[] = [
  {
    id: "payroll", name: "Цалин, хүний нөөц", icon: Users,
    items: [
      { id: "salary-out",  name: "Цалин зарлага",        icon: Users,     color: "text-purple-600", bg: "bg-purple-50" },
      { id: "bonus-out",   name: "Урамшуулал, шагнал",   icon: Award,     color: "text-purple-600", bg: "bg-purple-50" },
      { id: "social-ins",  name: "Нийгмийн даатгал",     icon: Shield,    color: "text-blue-600",   bg: "bg-blue-50" },
    ],
  },
  {
    id: "office", name: "Оффис, ажлын байр", icon: Building2,
    items: [
      { id: "office-rent",  name: "Оффис түрээс",          icon: Home,    color: "text-indigo-600", bg: "bg-indigo-50" },
      { id: "utilities",    name: "Ус, дулаан, цахилгаан", icon: Zap,     color: "text-amber-600",  bg: "bg-amber-50" },
      { id: "office-supply",name: "Бичиг хэргийн зардал",   icon: FileText,color: "text-slate-600", bg: "bg-slate-100" },
      { id: "office-repair",name: "Засвар, үйлчилгээ",     icon: Hammer,  color: "text-stone-600",  bg: "bg-stone-100" },
    ],
  },
  {
    id: "equipment", name: "Тоног төхөөрөмж", icon: Package,
    items: [
      { id: "hardware",  name: "Техник хангамж",        icon: Server,  color: "text-cyan-700",  bg: "bg-cyan-50" },
      { id: "software",  name: "Программ хангамж",      icon: Globe,   color: "text-blue-600",  bg: "bg-blue-50" },
      { id: "internet",  name: "Интернэт, утас",         icon: Wifi,    color: "text-cyan-600",  bg: "bg-cyan-50" },
    ],
  },
  {
    id: "logistics", name: "Тээвэр, лоистик", icon: Truck,
    items: [
      { id: "delivery",  name: "Хүргэлт",      icon: Truck, color: "text-orange-600", bg: "bg-orange-50" },
      { id: "fuel",      name: "Шатахуун",     icon: Fuel,  color: "text-rose-600",   bg: "bg-rose-50" },
      { id: "transport", name: "Тээврийн зардал", icon: Car, color: "text-blue-600",  bg: "bg-blue-50" },
    ],
  },
  {
    id: "marketing", name: "Маркетинг, борлуулалт", icon: Megaphone,
    items: [
      { id: "ads",       name: "Зар сурталчилгаа",      icon: Megaphone, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
      { id: "events",    name: "Үйл явдал, уулзалт",    icon: Sparkles,  color: "text-pink-600",    bg: "bg-pink-50" },
    ],
  },
  {
    id: "services", name: "Үйлчилгээ", icon: Briefcase,
    items: [
      { id: "consulting", name: "Зөвлөх үйлчилгээ",      icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
      { id: "outsource",  name: "Гэрээт гүйцэтгэгч",     icon: Users,     color: "text-purple-600", bg: "bg-purple-50" },
      { id: "legal",      name: "Хууль, нягтлан",        icon: FileText,  color: "text-slate-700",  bg: "bg-slate-100" },
    ],
  },
  {
    id: "biz-fees", name: "Татвар, шимтгэл", icon: Receipt,
    items: [
      { id: "tax",       name: "Татвар",          icon: Briefcase,  color: "text-blue-600",  bg: "bg-blue-50" },
      { id: "bank-fee",  name: "Банкны шимтгэл",  icon: Receipt,    color: "text-amber-600", bg: "bg-amber-50" },
      { id: "loan-pay",  name: "Зээлийн төлбөр",  icon: CreditCard, color: "text-red-600",   bg: "bg-red-50" },
      { id: "other-out", name: "Бусад зарлага",   icon: Wallet,     color: "text-slate-600", bg: "bg-slate-100" },
    ],
  },
];

// ── Бүх каталогийн нэр → меta хайлт ───────────────────────────────
// (getCategoryStyle нь энэ нэгдсэн каталогаас лого/өнгийг олно — тус бүрийг
//  тусад нь давхардуулж бичихгүй.)
const ALL_CATEGORY_GROUPS: CategoryGroup[][] = [
  PERSONAL_INCOME, PERSONAL_EXPENSE, BUSINESS_INCOME, BUSINESS_EXPENSE,
];

export type CategoryMeta = { icon: LucideIcon; color: string; bg: string };

const CATEGORY_META = new Map<string, CategoryMeta>();
for (const groups of ALL_CATEGORY_GROUPS) {
  for (const g of groups) {
    for (const it of g.items) {
      if (!CATEGORY_META.has(it.name)) {
        CATEGORY_META.set(it.name, { icon: it.icon, color: it.color, bg: it.bg });
      }
    }
  }
}

/** Каталогт байгаа ангиллын лого/өнгийг нэрээр нь буцаана. Олдохгүй бол null. */
export function getCategoryMeta(name: string): CategoryMeta | null {
  return CATEGORY_META.get(name) ?? null;
}

// ── Uncategorized sentinel ───────────────────────────────────────
// "Ангилаагүй" — AI/regex автоматаар таньж чадаагүй, ХАРААХАН ангилагдаагүй
// гүйлгээний цорын ганц тэмдэглэгээ (review queue-д орно).
//
// ⚠ "Бусад орлого"/"Бусад зарлага" нь хэрэглэгчийн ЗОРИУД сонгож болох жинхэнэ
// каталог ангилал тул "ангилаагүй" гэж тооцохгүй — сонгоход review-оос хасагдана.
export const UNCATEGORIZED_CATEGORY = "Ангилаагүй";
export const UNCATEGORIZED_CATEGORIES: string[] = [UNCATEGORIZED_CATEGORY];

// ── Public exports ───────────────────────────────────────────────

export function getIncomeGroups(userType: UserType): CategoryGroup[] {
  return userType === "business" ? BUSINESS_INCOME : PERSONAL_INCOME;
}

export function getExpenseGroups(userType: UserType): CategoryGroup[] {
  return userType === "business" ? BUSINESS_EXPENSE : PERSONAL_EXPENSE;
}

export function getIncomeCategoryNames(userType: UserType): string[] {
  return getIncomeGroups(userType).flatMap(g => g.items.map(i => i.name));
}

export function getExpenseCategoryNames(userType: UserType): string[] {
  return getExpenseGroups(userType).flatMap(g => g.items.map(i => i.name));
}

// ── Backward-compat for components that still use the old flat lists ──
// (Хэрэв userType мэдэгдэхгүй бол `personal` бол default-аар авна)
export const DEFAULT_INCOME_CATEGORIES = getIncomeCategoryNames("personal");
export const DEFAULT_EXPENSE_CATEGORIES = getExpenseCategoryNames("personal");
