import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TransactionInput {
  description: string;
  amount: number;
}

export interface CategorizationResult {
  type: "income" | "expense";
  category: string;
}

export const INCOME_CATEGORIES = ["Цалин", "Шилжүүлэг хүлээн авсан", "Буцаалт", "Хүү", "Бусад орлого"];
export const EXPENSE_CATEGORIES = ["Банкны шимтгэл", "Цалин зарлага", "Хоол & Ресторан", "Тээвэр", "Худалдаа", "Коммунал", "Эрүүл мэнд", "Боловсрол", "Цэвэрлэгээ & Засвар", "Татвар", "Бусад зарлага"];

// Тогтсон keyword-уудаас түрүүлж шууд таних (AI-ас илүү найдвартай)
const KEYWORD_RULES: Array<{ pattern: RegExp; type: "income" | "expense"; category: string }> = [
  { pattern: /шимтгэл|комисс|service\s*fee|bank\s*fee|шил.+гээний\s*шимтгэл/i, type: "expense", category: "Банкны шимтгэл" },
  { pattern: /цалин|tsalin|salary|payroll|tsali?n/i, type: "expense", category: "Цалин зарлага" },
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

function fallback(transactions: TransactionInput[]): CategorizationResult[] {
  const incomeKeywords = /цалин|орлого|хүлээн|буцаалт|хүү|deposit|credit|salary|income|зээл олголт/i;
  const expenseKeywords = /төлөлт|зардал|худалдан|авалт|хоол|тээвэр|коммунал|татвар|шимтгэл|payment|purchase|withdraw|debit/i;

  return transactions.map(t => {
    if (incomeKeywords.test(t.description)) {
      return { type: "income", category: "Бусад орлого" };
    }
    if (expenseKeywords.test(t.description)) {
      return { type: "expense", category: "Бусад зарлага" };
    }
    // amount дохио: хэрэв тодорхой байвал ашигла
    return {
      type: t.amount < 0 ? "income" : "expense",  // bank statement: credit=орлого(+), debit=зарлага(-)
      category: t.amount < 0 ? "Бусад орлого" : "Бусад зарлага",
    };
  });
}

async function categorizeBatch(batch: TransactionInput[]): Promise<CategorizationResult[]> {
  const prompt = `Монгол банкны гүйлгээний категори тодорхойл. Эерэг дүн = орлого, сөрөг дүн = зарлага (энэ нь parser-аас тогтоогдсон, өөрчилж болохгүй).

Орлогын категори: ${INCOME_CATEGORIES.join(", ")}
Зарлагын категори: ${EXPENSE_CATEGORIES.join(", ")}

Гүйлгээнүүд:
${JSON.stringify(batch.map((t, i) => ({ i, desc: t.description, amount: t.amount })))}

Дүрэм:
- Хэрэв amount >= 0 → type заавал "income", категори орлогын жагсаалтаас
- Хэрэв amount < 0 → type заавал "expense", категори зарлагын жагсаалтаас
- Тайлбараас хамгийн тохиромжтой категори сонг

Зөвхөн JSON массив буцаа:
[{"type":"income","category":"Цалин"},{"type":"expense","category":"Хоол & Ресторан"}]`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("JSON parse failed");

  const parsed = JSON.parse(jsonMatch[0]) as CategorizationResult[];
  if (parsed.length !== batch.length) throw new Error("Length mismatch");
  return parsed;
}

export async function categorizeTransactions(
  transactions: TransactionInput[]
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) return [];

  // Эхлээд keyword-аар таних — танигдсаныг AI-руу явуулахгүй
  const results: (CategorizationResult | null)[] = transactions.map(t => {
    const type: "income" | "expense" = t.amount >= 0 ? "income" : "expense";
    const matched = matchKeyword(t.description, type);
    return matched ? { type, category: matched } : null;
  });

  // AI-руу зөвхөн танигдаагүйг илгээх
  const aiNeededIdx: number[] = results
    .map((r, i) => r === null ? i : -1)
    .filter(i => i >= 0);

  if (aiNeededIdx.length === 0) {
    return results as CategorizationResult[];
  }

  const BATCH_SIZE = 30;
  const aiInputs = aiNeededIdx.map(i => transactions[i]);
  const aiResults: CategorizationResult[] = [];

  for (let i = 0; i < aiInputs.length; i += BATCH_SIZE) {
    const batch = aiInputs.slice(i, i + BATCH_SIZE);
    try {
      aiResults.push(...await categorizeBatch(batch));
    } catch (err) {
      console.error(`AI batch ${i}-${i + BATCH_SIZE} failed:`, err);
      aiResults.push(...fallback(batch));
    }
  }

  // Үр дүнг нэгтгэх
  aiNeededIdx.forEach((origIdx, i) => {
    results[origIdx] = aiResults[i] ?? fallback([transactions[origIdx]])[0];
  });

  return results as CategorizationResult[];
}
