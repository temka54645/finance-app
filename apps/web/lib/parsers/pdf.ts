import { PDFParse } from "pdf-parse";
import type { ParsedTransaction } from "./excel";
import type { StatementMeta } from "./banks";
import { KHAN_BANK_PDF, parseKhanPdfText, extractKhanPdfMeta } from "./banks/khan";

export type { ParsedTransaction };

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string | null;
  meta?: StatementMeta;
}

// Огноо + тайлбар + дүн агуулсан мөрийн pattern-үүд
const LINE_PATTERNS = [
  // 2024.01.15  Тайлбар  15,000.00
  /(\d{4}[.\-\/]\d{2}[.\-\/]\d{2})\s{1,10}(.{3,60}?)\s{1,10}([-+]?[\d,]+(?:\.\d{1,2})?)\s*$/,
  // 15.01.2024  Тайлбар  15,000
  /(\d{2}[.\-\/]\d{2}[.\-\/]\d{4})\s{1,10}(.{3,60}?)\s{1,10}([-+]?[\d,]+(?:\.\d{1,2})?)\s*$/,
  // 01.15  Тайлбар  15,000.00
  /(\d{2}[.\-\/]\d{2})\s{1,10}(.{3,60}?)\s{1,10}([-+]?[\d,]+(?:\.\d{1,2})?)\s*$/,
];

// Зөвхөн дүн + тайлбар агуулсан мөр (огноо нь өмнөх мөрт байна)
const AMOUNT_LINE = /^(.{3,60}?)\s{2,}([-+]?[\d,]+(?:\.\d{1,2})?)\s*$/;

function parseDate(raw: string): Date | null {
  const currentYear = new Date().getFullYear();
  let s = raw.trim();

  if (/^\d{2}[.\-\/]\d{2}$/.test(s)) {
    const [m, d] = s.split(/[.\-\/]/);
    s = `${currentYear}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  } else {
    s = s.replace(/(\d{4})[./](\d{1,2})[./](\d{1,2})/, "$1-$2-$3")
         .replace(/(\d{1,2})[./](\d{1,2})[./](\d{4})/, "$3-$2-$1");
  }

  const d = new Date(s);
  return !isNaN(d.getTime()) && d.getFullYear() > 2000 ? d : null;
}

function parseAmount(raw: string): number {
  const neg = raw.startsWith("-") || (raw.includes("(") && raw.includes(")"));
  const n = parseFloat(raw.replace(/[,\s()]/g, ""));
  return neg ? -Math.abs(n) : n;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

/**
 * PDF хуулгыг банк автомат илрүүлэлттэйгээр задлах.
 * - Эхлээд бүртгэгдсэн банк (ХААН г.м)-ны template-ыг туршина
 * - Танигдвал тухайн банкны parser + meta-г буцаана
 * - Танигдахгүй бол ерөнхий (generic) PDF parser ашиглана
 */
export async function parsePdfWithBankDetection(buffer: Buffer): Promise<PdfParseResult> {
  const text = await extractPdfText(buffer);

  if (KHAN_BANK_PDF.detect(text)) {
    const transactions = parseKhanPdfText(text);
    if (transactions.length > 0) {
      return { transactions, detectedBank: KHAN_BANK_PDF.name, meta: extractKhanPdfMeta(text) };
    }
  }

  return { transactions: parseGenericPdfText(text), detectedBank: null };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  return (await parsePdfWithBankDetection(buffer)).transactions;
}

function parseGenericPdfText(text: string): ParsedTransaction[] {
  const lines = text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const transactions: ParsedTransaction[] = [];
  let lastDate: Date | null = null;

  for (const line of lines) {
    // 1. Огноо + тайлбар + дүн бүгд нэг мөрт
    let matched = false;
    for (const pattern of LINE_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        const date = parseDate(m[1]);
        const amount = parseAmount(m[3]);
        if (date && !isNaN(amount)) {
          lastDate = date;
          transactions.push({ date, description: m[2].trim(), amount });
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // 2. Мөр зөвхөн огноо агуулна → дараагийн мөрд ашиглах
    const dateOnly = line.match(/^(\d{2,4}[.\-\/]\d{2}(?:[.\-\/]\d{2,4})?)\s*$/);
    if (dateOnly) {
      lastDate = parseDate(dateOnly[1]);
      continue;
    }

    // 3. Огноо нь өмнөх мөрт байсан, энэ мөрт тайлбар + дүн
    if (lastDate) {
      const m = line.match(AMOUNT_LINE);
      if (m) {
        const amount = parseAmount(m[2]);
        if (!isNaN(amount) && amount !== 0) {
          transactions.push({ date: lastDate, description: m[1].trim(), amount });
        }
      }
    }
  }

  return transactions;
}
