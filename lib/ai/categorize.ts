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
export const EXPENSE_CATEGORIES = ["Хоол & Ресторан", "Тээвэр", "Худалдаа", "Коммунал", "Эрүүл мэнд", "Боловсрол", "Цэвэрлэгээ & Засвар", "Бусад зарлага"];

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

  const BATCH_SIZE = 30;
  const results: CategorizationResult[] = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    try {
      const batchResult = await categorizeBatch(batch);
      results.push(...batchResult);
    } catch (err) {
      console.error(`Batch ${i}-${i + BATCH_SIZE} categorization failed:`, err);
      results.push(...fallback(batch));
    }
  }

  return results;
}
