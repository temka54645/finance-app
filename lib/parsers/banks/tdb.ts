import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";
import { findLabeledValue, parseDateRange } from "./metaHelpers";

interface StatementMeta {
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

export const TDB_BANK = {
  id: "tdb",
  name: "Худалдаа Хөгжлийн Банк (TDB)",
  detect: (rawRows: unknown[][]): boolean => {
    const text = rawRows
      .slice(0, 12)
      .flat()
      .filter(v => typeof v === "string")
      .join(" ");
    return /депозит дансны хуулга|tdb pay|хамрах хугацаа/i.test(text) &&
           /харьцсан данс/i.test(text) &&
           /гүйлгээний утга/i.test(text);
  },
};

// TDB-ийн өгөгдлийн багана нь header-ээс 1 баганаар хазайсан байдаг
// (merged cells-ийн улмаас)
const COL = {
  date: 0,
  income: 7,
  expense: 11,
  counterparty: 23,
  description: 28,
};

function parseExcelDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number" && val > 25569 && val < 100000) {
    // Excel serial → UTC milliseconds (1900 epoch → 1970 epoch = 25569 өдөр)
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  }
  return null;
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[,\s₮]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseTdbBank(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    // Хүчин төгөлдөр гүйлгээний мөр: col 0-д огнооны serial number байх ёстой
    const date = parseExcelDate(row[COL.date]);
    if (!date) continue;

    const income = toNumber(row[COL.income]);
    const expense = toNumber(row[COL.expense]);

    let amount: number;
    if (income > 0) amount = income;
    else if (expense > 0) amount = -expense;
    else continue;

    const desc = String(row[COL.description] ?? "").trim();
    const counterpartyRaw = String(row[COL.counterparty] ?? "").trim();
    const description = desc || counterpartyRaw || "Гүйлгээ";

    results.push({ date, description, counterparty: counterpartyRaw || undefined, amount });
  }

  return results;
}

/**
 * TDB хуулгын metadata.
 *  - "Хамрах хугацаа" label-тай cell-аас period
 *  - "Эхний үлдэгдэл" / "Эцсийн үлдэгдэл" гэсэн label-аас balance
 *    (TDB-д label-аас баруунхи cell-д утга байдаг)
 *  - Илрэхгүй бол period-ийг хамгийн эхэн/сүүлчийн tx-ийн огноогоор тооцно
 */
export function extractTdbMeta(buffer: Buffer): StatementMeta {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const meta: StatementMeta = {};

  // Period
  const periodStr = findLabeledValue(rows, /хамрах\s*хугацаа|хугацаа\s*:/i, 20);
  if (periodStr) {
    const { start, end } = parseDateRange(periodStr);
    if (start) meta.periodStart = start;
    if (end) meta.periodEnd = end;
  }

  // Opening / Closing balance — label-тай cell-ийн ойролцоо тоон утга хайна
  const openStr = findLabeledValue(rows, /эхний\s*үлдэгдэл|opening\s*balance/i, 30);
  if (openStr) {
    const n = parseFloat(String(openStr).replace(/[,\s₮]/g, ""));
    if (!isNaN(n)) meta.openingBalance = n;
  }
  const closeStr = findLabeledValue(rows, /эцсийн\s*үлдэгдэл|closing\s*balance/i, 200);
  if (closeStr) {
    const n = parseFloat(String(closeStr).replace(/[,\s₮]/g, ""));
    if (!isNaN(n)) meta.closingBalance = n;
  }

  // Period дутуу бол data row-ийн огнооноос үндэслэх (fallback)
  if (!meta.periodStart || !meta.periodEnd) {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const row of rows) {
      const d = parseExcelDate(row[COL.date]);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
    if (minDate) meta.periodStart = meta.periodStart ?? minDate;
    if (maxDate) meta.periodEnd = meta.periodEnd ?? maxDate;
  }

  return meta;
}
