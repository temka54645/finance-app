import * as XLSX from "xlsx";

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // эерэг = орлого, сөрөг = зарлага
}

// ── Туслах функцүүд ──────────────────────────────────────────────

function parseAmount(val: unknown): number | null {
  if (typeof val === "number" && isFinite(val)) return val;
  if (typeof val === "string") {
    // "(1,000)" → -1000 хэлбэр хүлээн авна
    const neg = val.includes("(") && val.includes(")");
    const cleaned = val.replace(/[,\s₮$€¥£]/g, "").replace(/[()]/g, "");
    const n = parseFloat(cleaned);
    if (!isNaN(n)) return neg ? -Math.abs(n) : n;
  }
  return null;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return new Date(d.y, d.m - 1, d.d);
    } catch { /* ignore */ }
  }
  if (typeof val === "string" && val.trim().length >= 6) {
    // Олон хэлбэрийн огноо: 2024.01.15 / 2024-01-15 / 15/01/2024 / 2024/01/15
    const s = val.trim()
      .replace(/(\d{4})[./](\d{1,2})[./](\d{1,2})/, "$1-$2-$3")
      .replace(/(\d{1,2})[./](\d{1,2})[./](\d{4})/, "$3-$2-$1");
    const d = new Date(s);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  }
  return null;
}

function isDateLike(val: unknown): boolean {
  return parseDate(val) !== null;
}

function isAmountLike(val: unknown): boolean {
  const n = parseAmount(val);
  return n !== null && n !== 0;
}

function isTextLike(val: unknown): boolean {
  return typeof val === "string" && val.trim().length > 2 && !isDateLike(val) && isNaN(Number(val));
}

// ── Багануудыг нэрээр тодорхойлох ─────────────────────────────────

interface ColMap {
  dateCol: string | null;
  descCol: string | null;
  amountCol: string | null;
  creditCol: string | null;
  debitCol: string | null;
}

function detectByHeaders(headers: string[]): ColMap {
  const h = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const find = (...terms: string[]) => {
    const idx = headers.findIndex(col => terms.some(t => h(col).includes(t)));
    return idx >= 0 ? headers[idx] : null;
  };

  return {
    dateCol:   find("огноо","date","дата","өдөр","гүйлгээнийогноо","valuedate","txdate"),
    descCol:   find("утга","тайлбар","нэр","desc","memo","нарийвч","гүйлгээний","particulars","narration","remarks","reference","ref"),
    amountCol: find("дүн","amount","мөнгө","sum","нийт","үлдэгдэл","balance","нэтдүн"),
    creditCol: find("орлого","credit","зарим","incoming","хүлээн","deposit","кредит","incoming","гарсандүн","creditamount"),
    debitCol:  find("зарлага","debit","гарсан","outgoing","төлсөн","withdrawal","дебит","debitamount"),
  };
}

// ── Агуулгаар автомат багана илрүүлэх (header-гүй/буруу header) ───

function detectByContent(rows: Record<string, unknown>[]): ColMap {
  if (rows.length === 0) return { dateCol: null, descCol: null, amountCol: null, creditCol: null, debitCol: null };

  const headers = Object.keys(rows[0]);
  const sample = rows.slice(0, Math.min(10, rows.length));

  const dateScore: Record<string, number> = {};
  const textScore: Record<string, number> = {};
  const numScore: Record<string, number> = {};

  for (const row of sample) {
    for (const h of headers) {
      const v = row[h];
      if (isDateLike(v)) dateScore[h] = (dateScore[h] ?? 0) + 1;
      if (isTextLike(v)) textScore[h] = (textScore[h] ?? 0) + 1;
      if (isAmountLike(v) && !isDateLike(v)) numScore[h] = (numScore[h] ?? 0) + 1;
    }
  }

  const topByScore = (scores: Record<string, number>) =>
    Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const dateCol = topByScore(dateScore);
  const descCol = topByScore(
    Object.fromEntries(Object.entries(textScore).filter(([k]) => k !== dateCol))
  );

  // Хоёр тоон багана байвал credit/debit, нэг байвал amount
  const numCols = Object.entries(numScore)
    .filter(([k]) => k !== dateCol && k !== descCol)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  return {
    dateCol,
    descCol,
    amountCol: numCols.length === 1 ? numCols[0] : null,
    creditCol: numCols.length >= 2 ? numCols[0] : null,
    debitCol:  numCols.length >= 2 ? numCols[1] : null,
  };
}

// ── Мөрийг гүйлгээ болгон хөрвүүлэх ──────────────────────────────

function rowToTransaction(
  row: Record<string, unknown>,
  cols: ColMap
): ParsedTransaction | null {
  const date = cols.dateCol ? parseDate(row[cols.dateCol]) : null;
  if (!date) return null;

  const description = cols.descCol
    ? String(row[cols.descCol] ?? "").trim() || "Гүйлгээ"
    : "Гүйлгээ";

  let amount: number | null = null;

  if (cols.creditCol && cols.debitCol) {
    const credit = parseAmount(row[cols.creditCol]);
    const debit  = parseAmount(row[cols.debitCol]);
    if (credit && Math.abs(credit) > 0) amount = Math.abs(credit);       // орлого = эерэг
    else if (debit && Math.abs(debit) > 0) amount = -Math.abs(debit);    // зарлага = сөрөг
  } else if (cols.amountCol) {
    amount = parseAmount(row[cols.amountCol]);
  }

  if (amount === null || amount === 0) return null;
  return { date, description, amount };
}

// ── Header мөрийг хайх (зарим банк эхний мөрүүдэд мэдээлэл оруулдаг) ─

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    let textCount = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string" && cell.v.trim().length > 1) textCount++;
    }
    if (textCount >= 2) return r; // 2+ текст багана → header мөр
  }
  return 0;
}

// ── Үндсэн parse функц ────────────────────────────────────────────

function parseSheet(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  const headerRow = findHeaderRow(sheet);

  // Header мөрөөс эхлэн уншина
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: headerRow,
  });

  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);

  // 1. Нэрээр илрүүлэх
  let cols = detectByHeaders(headers);

  // 2. Нэрээр олдоогүй бол агуулгаар илрүүлэх
  const hasEnoughInfo = (cols.dateCol || cols.amountCol || cols.creditCol);
  if (!hasEnoughInfo) {
    cols = detectByContent(rows);
  }

  const results: ParsedTransaction[] = [];
  for (const row of rows) {
    const tx = rowToTransaction(row, cols);
    if (tx) results.push(tx);
  }

  return results;
}

// ── Export функцүүд ───────────────────────────────────────────────

export function parseExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  let best: ParsedTransaction[] = [];

  // Бүх sheet-ийг туршиж хамгийн олон гүйлгээтэйг сонгоно
  for (const name of workbook.SheetNames) {
    const result = parseSheet(workbook.Sheets[name]);
    if (result.length > best.length) best = result;
  }

  return best;
}

export function parseCSV(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return parseSheet(sheet);
}
