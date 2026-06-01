import {
  getIncomeCategoryNames,
  getExpenseCategoryNames,
  UNCATEGORIZED_CATEGORY,
  type UserType,
} from "@/lib/categories";

export interface TransactionInput {
  description: string;
  amount: number;
}

export interface CategorizationResult {
  type: "income" | "expense";
  category: string;
}

// Backward-compat экспорт (хуучин компонентууд import хийсэн байж болзошгүй)
export const INCOME_CATEGORIES = getIncomeCategoryNames("personal");
export const EXPENSE_CATEGORIES = getExpenseCategoryNames("personal");

// Тогтсон keyword-уудаас түрүүлж шууд таних.
// Эдгээр нь хоёулангаас (personal болон business) -д хамаатай universal rules.
const KEYWORD_RULES: Array<{ pattern: RegExp; type: "income" | "expense"; category: string }> = [
  { pattern: /шимтгэл|комисс|service\s*fee|bank\s*fee|шил.+гээний\s*шимтгэл/i, type: "expense", category: "Банкны шимтгэл" },
  { pattern: /цалин|tsalin|salary|payroll/i, type: "expense", category: "Цалин зарлага" },
  { pattern: /татвар|tatvar|tax|нийгмийн.*даатгал/i, type: "expense", category: "Татвар" },
];

function matchKeyword(description: string, type: "income" | "expense"): string | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.type === type && rule.pattern.test(description)) {
      return rule.category;
    }
  }
  return null;
}

function fallback(
  transactions: TransactionInput[],
  fallbackIncomeCategory: string,
  fallbackExpenseCategory: string
): CategorizationResult[] {
  const incomeKeywords = /цалин|орлого|хүлээн|буцаалт|хүү|deposit|credit|salary|income|зээл олголт/i;
  const expenseKeywords = /төлөлт|зардал|худалдан|авалт|хоол|тээвэр|коммунал|татвар|шимтгэл|payment|purchase|withdraw|debit/i;

  return transactions.map(t => {
    if (incomeKeywords.test(t.description)) {
      return { type: "income", category: fallbackIncomeCategory };
    }
    if (expenseKeywords.test(t.description)) {
      return { type: "expense", category: fallbackExpenseCategory };
    }
    return {
      type: t.amount < 0 ? "income" : "expense",
      category: t.amount < 0 ? fallbackIncomeCategory : fallbackExpenseCategory,
    };
  });
}

// Гүйлгээнүүдийг ангилна. Huulga oruulah үед AI ашиглахгүй — зөвхөн keyword
// дүрэм + regex fallback. Хурдан, гадаад API-аас хамааралгүй, тогтвортой.
// Хэрэглэгч дараа нь dashboard дээр гараар ангилал засаж болно.
export function categorizeTransactions(
  transactions: TransactionInput[],
  userType: UserType = "personal"
): CategorizationResult[] {
  if (transactions.length === 0) return [];

  // Таньж чадаагүй гүйлгээг "Ангилаагүй" болгож тэмдэглэнэ — review queue-д орно.
  // ("Бусад орлого/зарлага" нь хэрэглэгчийн зориуд сонгох ангилал тул энд хэрэглэхгүй.)
  const fallbackIncome = UNCATEGORIZED_CATEGORY;
  const fallbackExpense = UNCATEGORIZED_CATEGORY;

  // Keyword дүрмээр түрүүлж шалгана, тааруулж чадаагүйг regex fallback-аар ангилна.
  const unmatched: TransactionInput[] = [];
  const unmatchedIdx: number[] = [];
  const results: (CategorizationResult | null)[] = transactions.map((t, i) => {
    const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
    const matched = matchKeyword(t.description, type);
    if (matched) return { type, category: matched };
    unmatched.push(t);
    unmatchedIdx.push(i);
    return null;
  });

  if (unmatched.length > 0) {
    const fb = fallback(unmatched, fallbackIncome, fallbackExpense);
    unmatchedIdx.forEach((origIdx, i) => {
      results[origIdx] = fb[i];
    });
  }

  return results as CategorizationResult[];
}
