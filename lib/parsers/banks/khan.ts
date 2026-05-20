import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";

/**
 * ХААН банкны (Khan Bank) Excel statement parser.
 *
 * Format:
 *   Sheet: "Deposit Account Statement"
 *   Row 0..6: metadata (Printed Date, Хэрэглэгч, Валют, IBAN, г.м)
 *   Row 7: column headers — Гүйлгээний огноо | Салбар | Эхний үлдэгдэл |
 *          Кредит гүйлгээ | Дебит гүйлгээ | Эцсийн үлдэгдэл |
 *          Гүйлгээний утга | Харьцсан данс
 *   Row 8+: data
 *
 *   Date: string "YYYY-MM-DD HH:MM:SS"
 *   Credit (Кредит): positive number string for income, 0 otherwise
 *   Debit (Дебит): negative number string ("-50.00") for expense, 0 otherwise
 */

export const KHAN_BANK = {
  id: "khan",
  name: "ХААН Банк (Khan Bank)",
  detect: (rawRows: unknown[][]): boolean => {
    const text = rawRows
      .slice(0, 10)
      .flat()
      .filter(v => typeof v === "string")
      .join(" ");
    return /депозит дансны.*хуулга/i.test(text) &&
           /кредит гүйлгээ/i.test(text) &&
           /дебит гүйлгээ/i.test(text);
  },
};

const COL = {
  date: 0,         // "2026-03-01 20:44:41"
  branch: 1,
  openingBalance: 2,
  credit: 3,       // income (positive)
  debit: 4,        // expense (already negative)
  closingBalance: 5,
  description: 6,
  counterparty: 7,
};

function parseKhanDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val !== "string") return null;
  // "2026-03-01 20:44:41"
  const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) {
    // огноо зөвхөн өдөртэйгээр ирэх онцгой тохиолдол
    const md = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!md) return null;
    const [, y, mo, d] = md;
    return new Date(Date.UTC(+y, +mo - 1, +d));
  }
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[,\s₮]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseKhanBank(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.find(n => /deposit.*statement|хуулга/i.test(n))
    ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // Гүйлгээний header мөрийг ол (col 0-д "Гүйлгээний огноо")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (row.some(c => typeof c === "string" && /гүйлгээний огноо/i.test(c)) &&
        row.some(c => typeof c === "string" && /кредит гүйлгээ/i.test(c))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const date = parseKhanDate(row[COL.date]);
    if (!date) continue;

    const credit = toNumber(row[COL.credit]);
    const debit  = toNumber(row[COL.debit]);  // negative or 0

    let amount: number;
    if (credit > 0) amount = credit;
    else if (debit < 0) amount = debit;        // already negative
    else if (debit > 0) amount = -debit;       // edge case: positive expense string
    else continue;

    const desc = String(row[COL.description] ?? "").trim();
    const counterparty = String(row[COL.counterparty] ?? "").trim();
    const description = desc || counterparty || "Гүйлгээ";

    results.push({ date, description, amount });
  }

  return results;
}
