import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";
import { splitCounterparty } from "@/lib/counterparty";
import { findLabeledValue, parseDateRange } from "./metaHelpers";

interface StatementMeta {
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

/**
 * TDB хоёр өөр export форматтай:
 *
 *  - "wide"    : жинхэнэ header мөртэй ("Харьцсан данс" / "Гүйлгээний утга"),
 *                merged cell-үүдийн улмаас багана нь сарних.
 *  - "compact" : "Депозит дансны хуулга - Байгууллага" export. Header мөр огт
 *                БАЙХГҮЙ — 0-р мөр нь зөвхөн metadata (хэвлэсэн огноо,
 *                харилцагч, дансны дугаар, эхний/эцсийн үлдэгдэл...) бөгөөд
 *                гүйлгээ шууд 1-р мөрөөс эхэлж A:I 9 багана эзэлнэ.
 */
type TdbLayout = "wide" | "compact";

const RE_STATEMENT = /дансны хуулга|tdb pay|хамрах хугацаа/i;
const RE_WIDE_HEADER = /харьцсан данс/i;
const RE_WIDE_DESC = /гүйлгээний утга/i;
const RE_COMPACT_META = /дансны дугаар|эхний үлдэгдэл/i;

function headText(rawRows: unknown[][], rows = 12): string {
  return rawRows
    .slice(0, rows)
    .flat()
    .filter(v => typeof v === "string")
    .join(" ");
}

function detectLayout(rawRows: unknown[][]): TdbLayout | null {
  const text = headText(rawRows);
  if (!RE_STATEMENT.test(text)) return null;
  if (RE_WIDE_HEADER.test(text) && RE_WIDE_DESC.test(text)) return "wide";
  if (RE_COMPACT_META.test(text)) return "compact";
  return null;
}

export const TDB_BANK = {
  id: "tdb",
  name: "Худалдаа Хөгжлийн Банк (TDB)",
  detect: (rawRows: unknown[][]): boolean => detectLayout(rawRows) !== null,
};

// Wide layout: багана нь header-ээс хазайсан (merged cells)
const COL_WIDE = {
  date: 0,
  income: 7,
  expense: 11,
  counterparty: 23,
  description: 28,
};

// Compact layout: A:I тогтмол байрлалтай, header мөргүй
const COL_COMPACT = {
  date: 0,
  income: 2,
  expense: 3,
  counterparty: 5,
  description: 7,
};

/** Хуулгын layout-аас хамааран багануудын байрлалыг сонгоно. */
function columnsFor(rows: unknown[][]) {
  return (detectLayout(rows) ?? "compact") === "wide" ? COL_WIDE : COL_COMPACT;
}

/**
 * Excel serial → Date.
 *
 * Serial доторх цаг нь банкны ОРОН НУТГИЙН цаг (Улаанбаатар) тул шууд UTC
 * epoch болгон хөрвүүлбэл гүйлгээ бүр 8 цагаар ухарч, 00:00-08:00 цагийнх
 * нь өмнөх өдөр рүү шилждэг байв. Иймд өдөр/цагийг тусад нь задалж UTC дээр
 * угсарна — ингэснээр хуанлийн огноо server-ийн timezone-оос үл хамаарна.
 */
function parseExcelDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number" && val > 25569 && val < 100000) {
    // serial 25569 = 1970-01-01. Бүхэл хэсэг = хуанлийн өдөр, бутархай = цаг.
    const days = Math.floor(val);
    const msOfDay = Math.round((val - days) * 86400) * 1000;
    const d = new Date((days - 25569) * 86400000 + msOfDay);
    if (!isNaN(d.getTime()) && d.getUTCFullYear() > 2000) return d;
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

  const COL = columnsFor(rows);
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    // Хүчин төгөлдөр гүйлгээний мөр: огнооны баганад serial number байх ёстой.
    // Ингэснээр metadata мөр, "Нийт:" дүн, "Хуудас: 1 - 1" footer нь өөрөө
    // шүүгдэн хасагдана.
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
    // TDB нэг "Харьцсан данс" баганатай (ихэвчлэн нэр) — ангилж салгана.
    const { name: cpName, account: cpAccount } = splitCounterparty(counterpartyRaw);

    results.push({
      date,
      description,
      counterparty: counterpartyRaw || undefined,
      counterpartyName: cpName,
      counterpartyAccount: cpAccount,
      amount,
    });
  }

  return results;
}

/** "Шошго:  1,234.56" хэлбэрийн нүднээс тоон утгыг салгаж авна. */
function inlineNumber(rows: unknown[][], label: RegExp): number | undefined {
  for (const row of rows.slice(0, 5)) {
    for (const cell of row) {
      if (typeof cell !== "string" || !label.test(cell)) continue;
      const rhs = cell.split(/[:：]/).slice(1).join(":");
      const n = parseFloat(rhs.replace(/[,\s₮]/g, ""));
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

/**
 * Compact хуулгын 0-р мөрөөс metadata уншина. Хугацаа нь "2026.01.01 -
 * 2026.07.16" буюу YYYY.MM.DD хэлбэртэй бөгөөд metaHelpers.parseDateRange
 * үүнийг дэмждэггүй (тэнд DD.MM.YYYY) тул энд тусад нь задална.
 */
function extractCompactMeta(rows: unknown[][]): StatementMeta {
  const meta: StatementMeta = {};

  for (const row of rows.slice(0, 5)) {
    for (const cell of row) {
      if (typeof cell !== "string" || !/хамрах\s*хугацаа/i.test(cell)) continue;
      const m = cell.match(
        /(\d{4})\.(\d{1,2})\.(\d{1,2})\s*[-–—]\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/
      );
      if (m) {
        const [, y1, mo1, d1, y2, mo2, d2] = m;
        meta.periodStart = new Date(Date.UTC(+y1, +mo1 - 1, +d1));
        meta.periodEnd = new Date(Date.UTC(+y2, +mo2 - 1, +d2, 23, 59, 59));
      }
    }
  }

  const opening = inlineNumber(rows, /эхний\s*үлдэгдэл/i);
  if (opening !== undefined) meta.openingBalance = opening;
  // "Боломжит үлдэгдэл"-ийг андуурахгүйн тулд "эцсийн"-г тодорхой заана.
  const closing = inlineNumber(rows, /эцсийн\s*үлдэгдэл/i);
  if (closing !== undefined) meta.closingBalance = closing;

  return meta;
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

  // Compact хуулгад бүх metadata нэг мөрөнд зэрэгцээ "Шошго: утга" хэлбэрээр
  // байрладаг тул findLabeledValue-ийн "дараагийн нүд" салаа нь хөрш шошгыг
  // (ж: "Эхний үлдэгдэл"-ийн дараа "Битүүмж") буруу авдаг. Иймд compact үед
  // нүдэн дотроосоо шууд уншина.
  if (detectLayout(rows) === "compact") {
    const compact = extractCompactMeta(rows);
    Object.assign(meta, compact);
    if (meta.periodStart && meta.periodEnd &&
        meta.openingBalance !== undefined && meta.closingBalance !== undefined) {
      return meta;
    }
  }

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
    const dateCol = columnsFor(rows).date;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const row of rows) {
      const d = parseExcelDate(row[dateCol]);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
    if (minDate) meta.periodStart = meta.periodStart ?? minDate;
    if (maxDate) meta.periodEnd = meta.periodEnd ?? maxDate;
  }

  return meta;
}
