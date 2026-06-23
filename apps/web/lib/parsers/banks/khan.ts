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

/**
 * ХААН Банкны PDF хуулгыг текстээр нь таних.
 * "Депозит дансны дэлгэрэнгүй хуулга" + Кредит/Дебит гүйлгээ багана.
 */
export const KHAN_BANK_PDF = {
  id: "khan-pdf",
  name: "ХААН Банк (Khan Bank)",
  detect: (text: string): boolean =>
    /депозит дансны[\s\S]*хуулга/i.test(text) &&
    /кредит гүйлгээ/i.test(text) &&
    /дебит гүйлгээ/i.test(text),
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

type KhanCol = typeof COL;

/**
 * Header мөрнөөс баганы байрлалыг ДИНАМИКААР тогтооно.
 *
 * Учир: хувь хүний хуулгад "Кредит гүйлгээ" нь 3-р, "Дебит гүйлгээ" нь 4-р баганад
 * байдаг бол БАЙГУУЛЛАГЫН хуулгад эдгээр нь СОЛИГДСОН ("Дебит" 3-р, "Кредит" 4-р)
 * байна. Хатуу индекс ашиглавал орлого/зарлага хольцолдоно. Тиймээс header текстээс
 * байрлалыг олж, олдоогүй баганад л анхдагч `COL`-ийг ашиглана.
 */
function resolveKhanColumns(headerRow: unknown[]): KhanCol {
  const find = (re: RegExp, fallback: number): number => {
    const idx = headerRow.findIndex(c => typeof c === "string" && re.test(c));
    return idx >= 0 ? idx : fallback;
  };
  return {
    date: find(/гүйлгээний огноо/i, COL.date),
    branch: find(/салбар/i, COL.branch),
    openingBalance: find(/эхний\s+үлдэгдэл/i, COL.openingBalance),
    credit: find(/кредит\s+гүйлгээ/i, COL.credit),
    debit: find(/дебит\s+гүйлгээ/i, COL.debit),
    closingBalance: find(/эцсийн\s+үлдэгдэл/i, COL.closingBalance),
    description: find(/гүйлгээний утга/i, COL.description),
    counterparty: find(/харьцсан данс/i, COL.counterparty),
  };
}

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

// ХААН-ы орлогын гүйлгээний "Гүйлгээний утга" дотор харьцагчийн НЭР
// шигтгэгдсэн байдаг (тусдаа нэрийн багана байдаггүй):
//   "ХААНААС: <дүн> <НЭР...> [<дансны дугаар>]"
//   ж: "ХААНААС: 150000 БЯМБАДОРЖ ГАНЗОРИГ 2105171114" → "БЯМБАДОРЖ ГАНЗОРИГ"
//   Зөвхөн дүнтэй ("ХААНААС: 150000") бол нэр буцаахгүй.
// Дансны дугаар нь "Харьцсан данс" баганад тусдаа байдаг тул эндээс зөвхөн
// нэрийг л авна.
function extractKhanCounterpartyName(desc: string): string | undefined {
  const m = desc.match(/ХААНААС[:：]\s*(.+)/i);
  if (!m) return undefined;
  let rest = m[1].replace(/\s+/g, " ").trim();
  rest = rest.replace(/^[\d.,]+\s+/, "");       // эхний дүнг хасах
  rest = rest.replace(/\s+\d{6,}$/, "").trim(); // төгсгөлийн дансны дугаарыг хасах
  // Үлдсэн нь хоосон эсвэл зөвхөн тоо бол нэр биш (зөвхөн дүн байсан тохиолдол).
  if (!rest || /^[\d.,]+$/.test(rest)) return undefined;
  return rest;
}

// ── ХААН Банкны PDF хуулга ────────────────────────────────────────
//
// PDF хэлбэр ("Депозит дансны дэлгэрэнгүй хуулга"):
//   Багана: № | Гүйлгээний огноо | Цаг | Салбар | Эхний үлдэгдэл |
//           Кредит гүйлгээ | Дебит гүйлгээ | Эцсийн үлдэгдэл |
//           Гүйлгээний утга | Харьцсан данс
//
//   pdf-parse-ийн гаргасан текст дэх нэг гүйлгээний мөр:
//     1 2026/03/02 10:11 5000 17,632.47 -54.80 17,577.67 qpay ... 5111793587
//   Кредит/Дебит хоёрын зөвхөн нэг нь дүүрсэн тул хоосон багана нурж,
//   "Эхний үлдэгдэл | Дүн(±) | Эцсийн үлдэгдэл" гэсэн 3 тоо үлдэнэ.
//   Дүн нь тэмдэгтэй: сөрөг = зарлага (дебит), эерэг = орлого (кредит).
//   Урт утга нь дараагийн мөр(үүд) рүү таслагдаж болно (multi-line).

// Гүйлгээний эхлэл мөр. groups:
//  1=№ 2=year 3=month 4=day 5=hour 6=min 7=салбар
//  8=эхний үлдэгдэл 9=дүн(тэмдэгтэй) 10=эцсийн үлдэгдэл 11=утга+харьцсан данс
const KHAN_PDF_ROW =
  /^(\d{1,6})\s+(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})\s+(\d+)\s+([\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*(.*)$/;

// Хуудас бүрд давтагддаг толгой / хуудасны тэмдэглэгээ — алгасна.
const KHAN_PDF_SKIP = /^Банк энэхүү хуулгыг|^-- \d+ of \d+ --$|^Хуудас \d/;

/** "2026/03/02" → Date (UTC) */
function parseKhanSlashDate(s: string): Date | null {
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

interface KhanPdfRow {
  date: Date;
  amount: number; // тэмдэгтэй: эерэг=орлого, сөрөг=зарлага
  descParts: string[];
}

function flushKhanPdfRow(row: KhanPdfRow | null, out: ParsedTransaction[]): void {
  if (!row) return;
  let desc = row.descParts.join(" ").replace(/\s+/g, " ").trim();
  let counterparty: string | undefined;
  // Мөрийн төгсгөлийн урт тоо = Харьцсан данс (заримд байхгүй — хураамжийн мөр)
  const cp = desc.match(/(?:^|\s)(\d{8,})$/);
  if (cp) {
    counterparty = cp[1];
    desc = desc.slice(0, desc.length - cp[1].length).trim();
  }
  // "ХААНААС: <дүн> <НЭР>"-ээс нэр; нэр байхгүй бол гүйлгээний утгыг өөрийг нь
  // харьцагчийн нэрэнд тооцно (дугаар нь counterparty талбарт тусдаа орсон).
  const cpName = extractKhanCounterpartyName(desc) ?? (desc || undefined);
  if (!desc) desc = counterparty ?? "Гүйлгээ";
  out.push({
    date: row.date,
    description: desc,
    counterparty,
    counterpartyName: cpName,
    counterpartyAccount: counterparty,
    amount: row.amount,
  });
}

/** ХААН Банкны PDF хуулгын текстээс гүйлгээ задлах. */
export function parseKhanPdfText(text: string): ParsedTransaction[] {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const out: ParsedTransaction[] = [];
  let current: KhanPdfRow | null = null;

  for (const line of lines) {
    if (/^Нийт дүн:/.test(line)) break; // хуулгын төгсгөлийн нийлбэр
    if (KHAN_PDF_SKIP.test(line)) continue;

    const m = line.match(KHAN_PDF_ROW);
    if (m) {
      flushKhanPdfRow(current, out);
      const date = new Date(Date.UTC(+m[2], +m[3] - 1, +m[4], +m[5], +m[6]));
      const amount = toNumber(m[9]); // тэмдгийг хадгална
      if (isNaN(date.getTime()) || amount === 0) { current = null; continue; }
      current = { date, amount, descParts: m[11] ? [m[11]] : [] };
    } else if (current) {
      // Өмнөх гүйлгээний утгын үргэлжлэл (multi-line)
      current.descParts.push(line);
    }
    // current === null үед толгойн metadata мөрүүдийг үл хэрэгснэ
  }
  flushKhanPdfRow(current, out);
  return out;
}

/** ХААН Банкны PDF текстээс period + balance metadata. */
export function extractKhanPdfMeta(text: string): StatementMeta {
  const meta: StatementMeta = {};

  const im = text.match(/Интервал:\s*(\d{4}\/\d{2}\/\d{2})\s*[-–—]\s*(\d{4}\/\d{2}\/\d{2})/);
  if (im) {
    const start = parseKhanSlashDate(im[1]);
    const end = parseKhanSlashDate(im[2]);
    if (start) meta.periodStart = start;
    if (end) meta.periodEnd = new Date(Date.UTC(
      end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59));
  }

  // Эхний гүйлгээний "Эхний үлдэгдэл", сүүлчийн гүйлгээний "Эцсийн үлдэгдэл"
  const lines = text.split("\n").map(l => l.trim());
  let first: RegExpMatchArray | null = null;
  let last: RegExpMatchArray | null = null;
  for (const line of lines) {
    if (/^Нийт дүн:/.test(line)) break;
    const m = line.match(KHAN_PDF_ROW);
    if (m) { if (!first) first = m; last = m; }
  }
  if (first) meta.openingBalance = toNumber(first[8]);
  if (last) meta.closingBalance = toNumber(last[10]);

  return meta;
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

  // Хувь хүн ба байгууллагын хуулгад Дебит/Кредит баганы дараалал өөр тул
  // header мөрнөөс байрлалыг динамикаар тогтооно.
  const col = resolveKhanColumns(rows[headerIdx]);

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const date = parseKhanDate(row[col.date]);
    if (!date) continue;

    const credit = toNumber(row[col.credit]);
    const debit  = toNumber(row[col.debit]);  // negative or 0

    let amount: number;
    if (credit > 0) amount = credit;
    else if (debit < 0) amount = debit;        // already negative
    else if (debit > 0) amount = -debit;       // edge case: positive expense string
    else continue;

    const desc = String(row[col.description] ?? "").trim();
    const counterpartyRaw = String(row[col.counterparty] ?? "").trim();
    const description = desc || counterpartyRaw || "Гүйлгээ";
    // ХААН-ы "Харьцсан данс" нь дугаар (нэр баганагүй). Найдвартай байхын тулд ангилна.
    const { name: cpName, account: cpAccount } = splitCounterparty(counterpartyRaw);
    // Нэрийн багана байхгүй тул "Гүйлгээний утга" доторх "ХААНААС: ..."-аас нэрийг авна;
    // нэр олдохгүй бол гүйлгээний утгыг өөрийг нь харьцагчийн нэрэнд тооцно.
    const cpNameFinal = cpName ?? extractKhanCounterpartyName(desc) ?? (desc || undefined);

    results.push({
      date,
      description,
      counterparty: counterpartyRaw || undefined,
      counterpartyName: cpNameFinal,
      counterpartyAccount: cpAccount,
      amount,
    });
  }

  return results;
}

/**
 * Khan хуулгын metadata.
 *  - "Интервал: YYYY-MM-DD-YYYY-MM-DD" cell-аас period
 *  - Эхний (data row) col 2 "Эхний үлдэгдэл" → openingBalance
 *  - Сүүлчийн (data row) col 5 "Эцсийн үлдэгдэл" → closingBalance
 */
export function extractKhanMeta(buffer: Buffer): StatementMeta {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.find(n => /deposit.*statement|хуулга/i.test(n))
    ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const meta: StatementMeta = {};

  // Period — "Интервал: ..." cell-аас
  const periodStr = findLabeledValue(rows, /интервал/i, 10);
  if (periodStr) {
    const { start, end } = parseDateRange(periodStr);
    if (start) meta.periodStart = start;
    if (end) meta.periodEnd = end;
  }

  // Header мөрийг ол
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (
      row.some(c => typeof c === "string" && /гүйлгээний огноо/i.test(c)) &&
      row.some(c => typeof c === "string" && /кредит гүйлгээ/i.test(c))
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return meta;

  const col = resolveKhanColumns(rows[headerIdx]);

  // First data row → openingBalance (Эхний үлдэгдэл)
  // Last data row → closingBalance (Эцсийн үлдэгдэл)
  let firstDataIdx = -1;
  let lastDataIdx = -1;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    // Огноо нь "2026-03-01 ..." форматтай үед л data row
    if (typeof row[col.date] === "string" && /^\d{4}-\d{1,2}-\d{1,2}/.test(row[col.date] as string)) {
      if (firstDataIdx < 0) firstDataIdx = i;
      lastDataIdx = i;
    }
  }
  if (firstDataIdx >= 0) {
    const open = Number(rows[firstDataIdx][col.openingBalance]);
    if (!isNaN(open)) meta.openingBalance = open;
  }
  if (lastDataIdx >= 0) {
    const close = Number(rows[lastDataIdx][col.closingBalance]);
    if (!isNaN(close)) meta.closingBalance = close;
  }

  return meta;
}
