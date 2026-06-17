import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";

interface StatementMeta {
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

/**
 * Төрийн банкны (State Bank) statement parser.
 *
 * Format:
 *   Sheet: "Statements"
 *   Row 0: header — Тайлант огноо | Цаг | Журнал | Байршил | Утга | Орлого | Зарлага | Үлдэгдэл | Харьцсан данс | Дансны нэр | Банкны нэр | Ханш
 *   Row 1+: data
 *   Огноо: string "YYYY.MM.DD"
 *   Орлого/Зарлага: numbers (one is 0)
 */

export const STATE_BANK = {
  id: "statebank",
  name: "Төрийн Банк (State Bank)",
  detect: (rawRows: unknown[][]): boolean => {
    // Headers нь яг 0-р мөрөнд байна
    const header = rawRows[0];
    if (!header || !Array.isArray(header)) return false;
    const text = header
      .filter(v => typeof v === "string")
      .join(" ")
      .toLowerCase();
    // Төрийн банкны өвөрмөц header signature
    return /тайлант огноо/.test(text) &&
           /журнал/.test(text) &&
           /орлого/.test(text) &&
           /зарлага/.test(text) &&
           /харьцсан данс/.test(text);
  },
};

const COL = {
  date: 0,         // "2026.02.25"
  time: 1,         // "09:57"
  journal: 2,      // "955290496073"
  location: 3,     // "БАНКНЫ ТӨВ"
  description: 4,  // "EB -Номинсувд-с ipotek..."
  income: 5,       // 4000000
  expense: 6,      // 0
  balance: 7,
  counterparty: 8, // "MN240004000456077813" or "FEE"
  accountName: 9,  // "НОМИНСУВД ХҮРЭЛЦООЖ"
  bankName: 10,    // "ХУДАЛДАА ХӨГЖЛИЙН БАНК"
};

/**
 * "YYYY.MM.DD" string + "HH:MM" optional → Date
 * Bank statement uses Ulaanbaatar local time but we store UTC.
 */
function parseStateBankDate(dateVal: unknown, timeVal: unknown): Date | null {
  if (typeof dateVal !== "string") return null;
  const m = dateVal.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  const [, ys, ms, ds] = m;
  let hours = 0, minutes = 0;
  if (typeof timeVal === "string") {
    const tm = timeVal.match(/^(\d{1,2}):(\d{2})/);
    if (tm) {
      hours = parseInt(tm[1], 10);
      minutes = parseInt(tm[2], 10);
    }
  }
  // UTC: store as local Mongolia time stripped of TZ (parser's existing convention)
  const d = new Date(Date.UTC(parseInt(ys, 10), parseInt(ms, 10) - 1, parseInt(ds, 10), hours, minutes));
  return isNaN(d.getTime()) ? null : d;
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[,\s₮]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseStateBank(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  // "Statements" sheet байх ёстой, эс бөгөөс анхныг авна
  const sheetName = workbook.SheetNames.find(n => n === "Statements") ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const results: ParsedTransaction[] = [];
  // Data row 1-ээс эхэлнэ (row 0 нь header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = parseStateBankDate(row[COL.date], row[COL.time]);
    if (!date) continue;

    const income = toNumber(row[COL.income]);
    const expense = toNumber(row[COL.expense]);

    let amount: number;
    if (income > 0) amount = income;
    else if (expense > 0) amount = -expense;
    else continue; // 0/0 мөрийг алгасна

    const desc = String(row[COL.description] ?? "").trim();
    const accName = String(row[COL.accountName] ?? "").trim();
    const accNumber = String(row[COL.counterparty] ?? "").trim();
    const description = desc || accName || "Гүйлгээ";
    // Counterparty preferr account name + number combo if available
    const counterparty = [accName, accNumber].filter(s => s && s !== "FEE").join(" · ") || undefined;

    results.push({ date, description, counterparty, amount });
  }

  return results;
}

/**
 * Төрийн банкны хуулгын metadata.
 *  - Тус тусын row-д "Үлдэгдэл" running balance байгаа учир хуулгын
 *    closingBalance = сүүлчийн tx-ийн үлдэгдэл
 *  - Opening balance-ийг тооцох: эхний tx-ийн үлдэгдэл − (income − expense)
 *  - Period = огнооны min/max
 */
export function extractStateBankMeta(buffer: Buffer): StatementMeta {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.find(n => n === "Statements") ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const meta: StatementMeta = {};

  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let firstDataRow: unknown[] | null = null;
  let lastDataRow: unknown[] | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = parseStateBankDate(row[COL.date], row[COL.time]);
    if (!date) continue;
    if (!minDate || date < minDate) {
      minDate = date;
      firstDataRow = row;
    }
    if (!maxDate || date > maxDate) {
      maxDate = date;
      lastDataRow = row;
    }
  }

  if (minDate) meta.periodStart = minDate;
  if (maxDate) meta.periodEnd = maxDate;

  if (lastDataRow) {
    const bal = toNumber(lastDataRow[COL.balance]);
    if (!isNaN(bal)) meta.closingBalance = bal;
  }
  if (firstDataRow) {
    const bal = toNumber(firstDataRow[COL.balance]);
    const income = toNumber(firstDataRow[COL.income]);
    const expense = toNumber(firstDataRow[COL.expense]);
    // running balance нь tx-ийн ДАРАА бүртгэгддэг → opening = balance − (income − expense)
    const opening = bal - (income - expense);
    if (!isNaN(opening)) meta.openingBalance = opening;
  }

  return meta;
}
