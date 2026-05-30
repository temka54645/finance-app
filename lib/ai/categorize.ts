import Anthropic from "@anthropic-ai/sdk";
import {
  getIncomeCategoryNames,
  getExpenseCategoryNames,
  type UserType,
} from "@/lib/categories";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Тогтсон keyword-уудаас түрүүлж шууд таних (AI-ас илүү найдвартай).
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

async function categorizeBatch(
  batch: TransactionInput[],
  incomeCats: string[],
  expenseCats: string[]
): Promise<CategorizationResult[]> {
  // ── Хурдны оновчлол ──
  // LLM-ийн latency гол төлөв ГАРАЛТЫН token-ы тоогоор тодорхойлогдоно.
  // Тиймээс AI-аар урт категорийн нэр + "type"-ийг бүтнээр буцаалгахын оронд
  // зөвхөн нэг ДУГААР (катологийн индекс) буцаалгана — гаралт 3-4 дахин багасч,
  // ai алхам ихээхэн хурдасна. `type` нь amount-ийн тэмдгээр аль хэдийн тогтсон
  // тул AI-аас огт асуухгүй; зөвхөн индексийг каталог + type-аар баталгаажуулна.
  const catalog: Array<{ category: string; type: "income" | "expense" }> = [
    ...incomeCats.map(c => ({ category: c, type: "income" as const })),
    ...expenseCats.map(c => ({ category: c, type: "expense" as const })),
  ];
  const catalogText = catalog.map((c, i) => `${i}:${c.category}`).join("\n");
  const incomeRange = `0-${incomeCats.length - 1}`;
  const expenseRange = `${incomeCats.length}-${catalog.length - 1}`;

  const prompt = `Монгол банкны гүйлгээ бүрт хамгийн тохирох категорийн ДУГААРыг сонго.

Категориуд (дугаар:нэр):
${catalogText}

Орлогын категори = дугаар ${incomeRange}. Зарлагын категори = дугаар ${expenseRange}.
Гүйлгээ бүрт t="i" (орлого) бол ${incomeRange} мужаас, t="e" (зарлага) бол ${expenseRange} мужаас сонгоно.

Гүйлгээнүүд:
${JSON.stringify(batch.map((t, i) => ({ i, t: t.amount >= 0 ? "i" : "e", desc: t.description })))}

Зөвхөн дугааруудын JSON массивыг гүйлгээний дарааллаар буцаа, өөр юу ч бичихгүй.
Жишээ: [3,17,2,9]`;

  const response = await Promise.race([
    client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI timeout (30s)")), 30000)
    ),
  ]);

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("JSON parse failed");

  const indices = JSON.parse(jsonMatch[0]) as unknown[];
  if (indices.length !== batch.length) throw new Error("Length mismatch");

  return batch.map((t, i) => {
    const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
    const raw = indices[i];
    const n = typeof raw === "number" ? raw : Number(raw);
    const picked = Number.isInteger(n) ? catalog[n] : undefined;
    // Индекс хүчинтэй ба type таарвал AI-н сонголтыг авна, эс бөгөөс fallback.
    if (picked && picked.type === type) {
      return { type, category: picked.category };
    }
    return { type, category: type === "income" ? "Бусад орлого" : "Бусад зарлага" };
  });
}

export interface CategorizeOptions {
  /** AI ашиглах эрх (plan-аас хамаарна). false бол зөвхөн keyword + regex fallback. */
  useAi?: boolean;
}

export async function categorizeTransactions(
  transactions: TransactionInput[],
  userType: UserType = "personal",
  options: CategorizeOptions = { useAi: true }
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) return [];

  const incomeCats = getIncomeCategoryNames(userType);
  const expenseCats = getExpenseCategoryNames(userType);

  const fallbackIncome = "Бусад орлого";
  const fallbackExpense = "Бусад зарлага";

  // Keyword дүрмээр түрүүлж шалгана
  const results: (CategorizationResult | null)[] = transactions.map(t => {
    const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
    const matched = matchKeyword(t.description, type);
    return matched ? { type, category: matched } : null;
  });

  const aiNeededIdx: number[] = results
    .map((r, i) => r === null ? i : -1)
    .filter(i => i >= 0);

  if (aiNeededIdx.length === 0) {
    return results as CategorizationResult[];
  }

  const aiInputs = aiNeededIdx.map(i => transactions[i]);

  // Plan-аас AI хориглосон бол шууд regex fallback хэрэглэнэ
  if (!options.useAi) {
    const fallbackResults = fallback(aiInputs, fallbackIncome, fallbackExpense);
    aiNeededIdx.forEach((origIdx, i) => {
      results[origIdx] = fallbackResults[i];
    });
    return results as CategorizationResult[];
  }

  // Нэг файлын дотор хэд хэдэн batch гарвал параллел гүйцэтгэнэ.
  // Anthropic API нь нэг файлын дотор 2-3 зэрэг дуудлагыг харьцангуй амар даадаг.
  const BATCH_SIZE = 30;
  const batches: TransactionInput[][] = [];
  for (let i = 0; i < aiInputs.length; i += BATCH_SIZE) {
    batches.push(aiInputs.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch, idx) => {
      try {
        return await categorizeBatch(batch, incomeCats, expenseCats);
      } catch (err) {
        console.error(`AI batch #${idx} (${batch.length} tx) failed:`, err);
        return fallback(batch, fallbackIncome, fallbackExpense);
      }
    })
  );
  const aiResults: CategorizationResult[] = batchResults.flat();

  aiNeededIdx.forEach((origIdx, i) => {
    results[origIdx] = aiResults[i] ?? fallback([transactions[origIdx]], fallbackIncome, fallbackExpense)[0];
  });

  return results as CategorizationResult[];
}
