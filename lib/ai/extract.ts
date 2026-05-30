import Anthropic from "@anthropic-ai/sdk";
import type { ParsedTransaction } from "../parsers/excel";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AIExtracted {
  date: string;        // YYYY-MM-DD
  description: string;
  counterparty?: string; // харьцсан данс (нэр эсвэл дансны дугаар), optional
  amount: number;      // эерэг = орлого, сөрөг = зарлага
}

export async function aiExtractTransactions(rawRows: unknown[][]): Promise<ParsedTransaction[]> {
  if (rawRows.length === 0) return [];

  // Эхний 80 мөрийг л харуулна (token хэмнэх)
  const sample = rawRows.slice(0, 80).map(row =>
    row.map(cell => {
      if (cell instanceof Date) return cell.toISOString().slice(0, 10);
      return cell;
    })
  );

  const prompt = `Та банкны хуулгаас гүйлгээ задлах туслах байна. Өгөгдсөн raw мөрүүдээс зөвхөн жинхэнэ гүйлгээний мөрүүдийг ялгаж, JSON массив болгон буцаа.

Дүрэм:
- Огноо тогтсон форматтай: YYYY-MM-DD
- amount: орлого → эерэг, зарлага → сөрөг
- description: гүйлгээний утга/тайлбар
- counterparty: харьцсан данс (харьцагчийн нэр эсвэл дансны дугаар). Багана байвал авна, байхгүй бол орхи.
- Толгойн мөр, нийт дүн, үлдэгдлийн мөр зэргийг ОРХИ
- Хэрэв credit/debit тусдаа баганаар бичигдсэн бол credit→эерэг, debit→сөрөг

Raw өгөгдөл (мөр бүр массив):
${JSON.stringify(sample)}

Зөвхөн JSON массив буцаа, өөр текст бүү бичсэн. Жишээ:
[{"date":"2024-01-15","description":"Цалин","counterparty":"Болд ХХК","amount":1500000},{"date":"2024-01-16","description":"Хоол","amount":-15000}]`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const extracted = JSON.parse(match[0]) as AIExtracted[];
    return extracted
      .map(e => ({
        date: new Date(e.date),
        description: String(e.description ?? "").trim() || "Гүйлгээ",
        counterparty: String(e.counterparty ?? "").trim() || undefined,
        amount: Number(e.amount),
      }))
      .filter(t => !isNaN(t.date.getTime()) && !isNaN(t.amount) && t.amount !== 0);
  } catch (err) {
    console.error("AI extract failed:", err);
    return [];
  }
}
