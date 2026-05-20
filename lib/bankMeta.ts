/**
 * Банк бүрийн өнгө, товч нэр, лого
 * UI дахь visual identity-д ашиглана (badge, breakdown card г.м)
 */

export interface BankMeta {
  id: string;            // дотоод slug
  shortName: string;     // 4-6 тэмдэгт товчлол ("XAC", "TDB", "ХААН")
  fullName: string;      // дүрсэлсэн нэр
  /** Tailwind utility classes (background + text + ring) */
  className: string;
  /** Bar/chart-д ашиглах HEX өнгө */
  hex: string;
  /** Тоормогцлох keyword-ууд (statement.bankName руу regex test хийнэ) */
  match: RegExp;
}

export const BANKS: BankMeta[] = [
  {
    id: "khan",
    shortName: "ХААН",
    fullName: "ХААН Банк",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    hex: "#10b981",
    match: /хаан|khan/i,
  },
  {
    id: "tdb",
    shortName: "TDB",
    fullName: "Худалдаа Хөгжлийн Банк",
    className: "bg-teal-50 text-teal-700 ring-teal-200",
    hex: "#14b8a6",
    match: /tdb|худалдаа\s*хөгжлийн/i,
  },
  {
    id: "xac",
    shortName: "XAC",
    fullName: "Хас Банк",
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    hex: "#8b5cf6",
    match: /хас|xac/i,
  },
  {
    id: "statebank",
    shortName: "ТӨРИЙН",
    fullName: "Төрийн Банк",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    hex: "#f43f5e",
    match: /төрийн|state\s*bank/i,
  },
  {
    id: "golomt",
    shortName: "GOLOMT",
    fullName: "Голомт Банк",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    hex: "#f59e0b",
    match: /голомт|golomt/i,
  },
  {
    id: "capitron",
    shortName: "CAPITRON",
    fullName: "Capitron Банк",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    hex: "#0ea5e9",
    match: /capitron|капитрон/i,
  },
  {
    id: "mbank",
    shortName: "M-BANK",
    fullName: "М банк",
    className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    hex: "#d946ef",
    match: /\bm\s*bank|м\s*банк/i,
  },
];

/** Тодорхойгүй / танигдаагүй банкны fallback */
export const UNKNOWN_BANK: BankMeta = {
  id: "unknown",
  shortName: "БУСАД",
  fullName: "Тодорхойгүй банк",
  className: "bg-slate-100 text-slate-700 ring-slate-200",
  hex: "#64748b",
  match: /./,
};

/**
 * statement.bankName-ээс тохирох банкны мета буцаана.
 * Аль ч банкид таарахгүй бол UNKNOWN_BANK буцаана.
 */
export function getBankMeta(bankName: string | null | undefined): BankMeta {
  if (!bankName) return UNKNOWN_BANK;
  for (const bank of BANKS) {
    if (bank.match.test(bankName)) return bank;
  }
  return { ...UNKNOWN_BANK, fullName: bankName }; // unknown-д тулд бичээгүй нэрийг харуулна
}
