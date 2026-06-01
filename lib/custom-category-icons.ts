import { createElement } from "react";
import {
  Tag, Banknote, Coins, Wallet, PiggyBank, HandCoins, Landmark, CreditCard,
  Receipt, Gift, Award, TrendingUp, LineChart, Briefcase, Building2,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Cake, Coffee,
  Home, Zap, Lightbulb, Hammer, Sofa,
  Phone, Wifi, Tv, Smartphone,
  Car, Bus, Fuel, Plane, Truck, Bike,
  HeartPulse, Pill, Dumbbell, Stethoscope,
  GraduationCap, BookOpen,
  Film, Music, Gamepad2, Sparkles,
  Shirt, Scissors, Baby, PawPrint,
  Users, Server, Globe, Megaphone, Package, FileText, Shield, Scale,
  Star, Heart, MapPin, Calendar,
  type LucideIcon,
} from "lucide-react";

export interface IconOption {
  key: string;
  Icon: LucideIcon;
  /** AI болон хайлтад туслах түлхүүр үгс (монгол + англи). */
  label: string;
}

/**
 * Хэрэглэгчийн ангилалд сонгож болох лого (icon)-уудын каталог.
 * Энэ жагсаалт нь нэгэн зэрэг: (1) сонгох UI, (2) AI-н зөвшөөрөгдсөн утга,
 * (3) key → компонент хөрвүүлэлтэд хэрэглэгдэнэ.
 */
export const CATEGORY_ICON_OPTIONS: IconOption[] = [
  // Мөнгө / санхүү
  { key: "banknote", Icon: Banknote, label: "мөнгө, цалин, бэлэн мөнгө, money, cash, salary" },
  { key: "coins", Icon: Coins, label: "зоос, ногдол ашиг, coins, dividend" },
  { key: "wallet", Icon: Wallet, label: "хэтэвч, түрийвч, wallet" },
  { key: "piggy-bank", Icon: PiggyBank, label: "хадгаламж, хуримтлал, savings, deposit" },
  { key: "hand-coins", Icon: HandCoins, label: "зээл, өгөөж, loan, payout" },
  { key: "landmark", Icon: Landmark, label: "банк, түрээс, bank, rent" },
  { key: "credit-card", Icon: CreditCard, label: "карт, зээлийн төлбөр, card, loan payment" },
  { key: "receipt", Icon: Receipt, label: "баримт, шимтгэл, receipt, fee, subscription" },
  { key: "gift", Icon: Gift, label: "бэлэг, хандив, gift, donation" },
  { key: "award", Icon: Award, label: "урамшуулал, шагнал, bonus, award" },
  { key: "trending-up", Icon: TrendingUp, label: "өсөлт, борлуулалт, growth, sales" },
  { key: "line-chart", Icon: LineChart, label: "хөрөнгө оруулалт, investment, chart" },
  { key: "briefcase", Icon: Briefcase, label: "ажил, гэрээт, work, freelance, business" },
  { key: "building", Icon: Building2, label: "байгууллага, оффис, company, office" },
  // Хүнс / хоол
  { key: "shopping-cart", Icon: ShoppingCart, label: "хүнс, дэлгүүр, groceries, shopping" },
  { key: "shopping-bag", Icon: ShoppingBag, label: "худалдан авалт, бараа, shopping bag, purchase" },
  { key: "utensils", Icon: UtensilsCrossed, label: "хоол, ресторан, food, restaurant" },
  { key: "cake", Icon: Cake, label: "амттан, бялуу, dessert, cake, birthday" },
  { key: "coffee", Icon: Coffee, label: "кафе, кофе, coffee, cafe" },
  // Орон сууц / ахуй
  { key: "home", Icon: Home, label: "гэр, орон сууц, түрээс, home, rent, house" },
  { key: "zap", Icon: Zap, label: "цахилгаан, эрчим хүч, electricity, power" },
  { key: "lightbulb", Icon: Lightbulb, label: "гэрэл, коммунал, utilities, light" },
  { key: "hammer", Icon: Hammer, label: "засвар, тохижилт, repair, renovation" },
  { key: "sofa", Icon: Sofa, label: "тавилга, гэр ахуй, furniture, household" },
  // Холбоо / технологи
  { key: "phone", Icon: Phone, label: "утас, дуудлага, phone, call" },
  { key: "wifi", Icon: Wifi, label: "интернэт, сүлжээ, internet, wifi" },
  { key: "tv", Icon: Tv, label: "телевиз, стрийминг, tv, streaming" },
  { key: "smartphone", Icon: Smartphone, label: "ухаалаг утас, апп, smartphone, app" },
  // Тээвэр
  { key: "car", Icon: Car, label: "машин, тээвэр, car, transport" },
  { key: "bus", Icon: Bus, label: "нийтийн тээвэр, автобус, bus, public transport" },
  { key: "fuel", Icon: Fuel, label: "шатахуун, бензин, fuel, gas" },
  { key: "plane", Icon: Plane, label: "аялал, нислэг, travel, flight" },
  { key: "truck", Icon: Truck, label: "хүргэлт, ачаа, delivery, logistics" },
  { key: "bike", Icon: Bike, label: "дугуй, унадаг дугуй, bike, bicycle" },
  // Эрүүл мэнд
  { key: "heart-pulse", Icon: HeartPulse, label: "эрүүл мэнд, health" },
  { key: "pill", Icon: Pill, label: "эм, эмнэлэг, medicine, pharmacy" },
  { key: "dumbbell", Icon: Dumbbell, label: "биеийн тамир, фитнес, fitness, gym" },
  { key: "stethoscope", Icon: Stethoscope, label: "эмч, эмнэлэг, doctor, clinic" },
  // Боловсрол
  { key: "graduation-cap", Icon: GraduationCap, label: "боловсрол, сургалт, education, school" },
  { key: "book-open", Icon: BookOpen, label: "ном, сэтгүүл, book, reading" },
  // Зугаа цэнгэл
  { key: "film", Icon: Film, label: "кино, шоу, movie, cinema" },
  { key: "music", Icon: Music, label: "хөгжим, подкаст, music, podcast" },
  { key: "gamepad", Icon: Gamepad2, label: "тоглоом, гэйм, game, gaming" },
  { key: "sparkles", Icon: Sparkles, label: "гоо сайхан, арга хэмжээ, beauty, event" },
  // Хувийн
  { key: "shirt", Icon: Shirt, label: "хувцас, clothes, fashion" },
  { key: "scissors", Icon: Scissors, label: "үсчин, засал, haircut, salon" },
  { key: "baby", Icon: Baby, label: "хүүхэд, гэр бүл, kids, baby, family" },
  { key: "paw-print", Icon: PawPrint, label: "тэжээвэр амьтан, pet, animal" },
  // Бизнес / үйлчилгээ
  { key: "users", Icon: Users, label: "цалин, хүний нөөц, payroll, staff, team" },
  { key: "server", Icon: Server, label: "техник, сервер, hardware, server" },
  { key: "globe", Icon: Globe, label: "программ, вэб, software, web" },
  { key: "megaphone", Icon: Megaphone, label: "маркетинг, зар сурталчилгаа, marketing, ads" },
  { key: "package", Icon: Package, label: "бараа, бүтээгдэхүүн, product, package" },
  { key: "file-text", Icon: FileText, label: "бичиг хэрэг, гэрээ, document, contract" },
  { key: "shield", Icon: Shield, label: "даатгал, хамгаалалт, insurance, security" },
  { key: "scale", Icon: Scale, label: "хууль, татвар, legal, tax" },
  // Бусад
  { key: "tag", Icon: Tag, label: "ангилал, бусад, general, other, misc" },
  { key: "star", Icon: Star, label: "онцлох, дуртай, favorite, star" },
  { key: "heart", Icon: Heart, label: "дуртай, хайр, love, like" },
  { key: "map-pin", Icon: MapPin, label: "байршил, газар, location, place" },
  { key: "calendar", Icon: Calendar, label: "хуваарь, огноо, schedule, calendar" },
];

export const DEFAULT_ICON_KEY = "tag";

const ICON_MAP = new Map(CATEGORY_ICON_OPTIONS.map(o => [o.key, o.Icon]));
const KEY_SET = new Set(CATEGORY_ICON_OPTIONS.map(o => o.key));

/** Icon key-г Lucide компонент болгож хөрвүүлнэ. Танигдахгүй бол Tag буцаана. */
export function resolveCustomCategoryIcon(key?: string | null): LucideIcon {
  return (key && ICON_MAP.get(key)) || Tag;
}

/**
 * Icon key-г шууд зурдаг тогтмол компонент.
 * (render дотор компонент үүсгэхээс зайлсхийхийн тулд энэ wrapper-г ашиглана.)
 */
export function CategoryIcon({ iconKey, className }: { iconKey?: string | null; className?: string }) {
  return createElement(resolveCustomCategoryIcon(iconKey), { className });
}

/** Key зөвшөөрөгдсөн каталогт байгаа эсэх (API validation). */
export function isValidIconKey(key: unknown): key is string {
  return typeof key === "string" && KEY_SET.has(key);
}

/** AI prompt-д өгөх "key — тайлбар" жагсаалт. */
export const ICON_CATALOG_FOR_AI = CATEGORY_ICON_OPTIONS.map(o => `${o.key}: ${o.label}`).join("\n");
