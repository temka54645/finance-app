import { PDFParse } from "pdf-parse";

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
}

const TX_PATTERNS = [
  /(\d{4}[.\-\/]\d{2}[.\-\/]\d{2})\s+(.+?)\s+([-+]?[\d,]+\.?\d*)\s*$/,
  /(\d{2}[.\-\/]\d{2}[.\-\/]\d{4})\s+(.+?)\s+([-+]?[\d,]+\.?\d*)\s*$/,
  /(\d{2}[.\-\/]\d{2})\s+(.+?)\s+([-+]?[\d,]+\.?\d*)\s*$/,
];

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const lines = result.text.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const transactions: ParsedTransaction[] = [];
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    for (const pattern of TX_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const [, rawDate, description, rawAmount] = match;
        const amount = parseFloat(rawAmount.replace(/,/g, ""));

        let date: Date;
        if (/^\d{2}[.\-\/]\d{2}$/.test(rawDate)) {
          date = new Date(`${currentYear}-${rawDate.replace(/[.\-\/]/, "-")}`);
        } else {
          date = new Date(rawDate.replace(/\./g, "-"));
        }

        if (!isNaN(date.getTime()) && !isNaN(amount)) {
          transactions.push({ date, description: description.trim(), amount });
          break;
        }
      }
    }
  }

  return transactions;
}
