import * as XLSX from "xlsx";
import { splitCounterparty } from "@/lib/counterparty";

export interface ParsedTransaction {
  date: Date;
  description: string;
  /** Харьцсан данс — нэр эсвэл дугаар (legacy, нэгдсэн). Back-compat-д хадгална. */
  counterparty?: string;
  /** Харьцагчийн НЭР (салгаж хадгална). Банк өгөхгүй бол undefined. */
  counterpartyName?: string;
  /** Харьцсан дансны ДУГААР (салгаж хадгална). Банк өгөхгүй бол undefined. */
  counterpartyAccount?: string;
  amount: number; // эерэг = орлого, сөрөг = зарлага
}

// ── Туслах ───────────────────────────────────────────────────────

function parseAmount(val: unknown): number | null {
  if (typeof val === "number" && isFinite(val) && val !== 0) return val;
  if (typeof val === "string" && val.trim()) {
    const neg = val.includes("(") && val.includes(")");
    const cleaned = val.replace(/[,\s₮$€¥£]/g, "").replace(/[()]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = parseFloat(cleaned);
    if (isNaN(n) || n === 0) return null;
    return neg ? -Math.abs(n) : n;
  }
  return null;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime()) && val.getFullYear() > 2000) return val;
  if (typeof val === "number" && val > 25569 && val < 100000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (s.length < 6 || s.length > 25) return null;
    const normalized = s
      .replace(/(\d{4})[./](\d{1,2})[./](\d{1,2})/, "$1-$2-$3")
      .replace(/(\d{1,2})[./](\d{1,2})[./](\d{4})/, "$3-$2-$1");
    const d = new Date(normalized);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return d;
  }
  return null;
}

function isText(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim();
  return s.length > 1 && parseDate(s) === null && parseAmount(s) === null;
}

// ── Header нэрээр тодорхой багана таних ─────────────────────────

interface ColMap {
  dateCol: string | null;
  descCol: string | null;
  amountCol: string | null;
  creditCol: string | null;
  debitCol: string | null;
  balanceCol: string | null;
  counterpartyCol: string | null;
}

const RE = {
  date: /огноо|date|дата|өдөр/i,
  desc: /утга|тайлбар|нарийвч|narration|description|particulars|memo|reference/i,
  credit: /орлого|credit|incoming|deposit|кредит|орсон/i,
  debit: /зарлага|debit|outgoing|withdrawal|дебит|гарсан/i,
  amount: /дүн|amount|мөнгө|sum|нийт/i,
  balance: /үлдэгдэл|balance|остаток/i,
  // Харьцсан данс / counterparty — нэр эсвэл дансны дугаар.
  counterparty: /харьцсан\s*данс|харьцагч|counterparty|beneficiary|payer|payee/i,
};

function detectByHeaders(headers: string[]): ColMap {
  const find = (re: RegExp) => headers.find(h => re.test(h)) ?? null;
  return {
    dateCol:         find(RE.date),
    descCol:         find(RE.desc),
    creditCol:       find(RE.credit),
    debitCol:        find(RE.debit),
    amountCol:       find(RE.amount),
    balanceCol:      find(RE.balance),
    counterpartyCol: find(RE.counterparty),
  };
}

// ── Гүйлгээ бүтээх ───────────────────────────────────────────────

function buildTransaction(
  row: Record<string, unknown>,
  cols: ColMap
): ParsedTransaction | null {
  const date = cols.dateCol ? parseDate(row[cols.dateCol]) : null;
  if (!date) return null;

  let amount: number | null = null;

  if (cols.creditCol && cols.debitCol) {
    const credit = parseAmount(row[cols.creditCol]);
    const debit = parseAmount(row[cols.debitCol]);
    if (credit && Math.abs(credit) > 0) amount = Math.abs(credit);
    else if (debit && Math.abs(debit) > 0) amount = -Math.abs(debit);
  } else if (cols.amountCol) {
    amount = parseAmount(row[cols.amountCol]);
  } else {
    // ямар ч багана танигдаагүй бол үлдэгдэл бус хамгийн их тоог сонгох
    for (const [col, val] of Object.entries(row)) {
      if (col === cols.balanceCol || col === cols.dateCol || col === cols.descCol) continue;
      const n = parseAmount(val);
      if (n !== null) { amount = n; break; }
    }
  }

  if (amount === null || amount === 0) return null;

  // Харьцсан данс / counterparty
  const counterparty = cols.counterpartyCol
    ? String(row[cols.counterpartyCol] ?? "").trim() || undefined
    : undefined;

  // Тайлбар: descCol эсвэл хамгийн урт текст (огноо/тоо/харьцсан данс биш)
  let description = "";
  if (cols.descCol) {
    description = String(row[cols.descCol] ?? "").trim();
  }
  if (!description) {
    const texts: string[] = [];
    for (const [col, val] of Object.entries(row)) {
      if (col === cols.dateCol || col === cols.balanceCol || col === cols.creditCol
        || col === cols.debitCol || col === cols.amountCol || col === cols.counterpartyCol) continue;
      if (isText(val)) texts.push(String(val).trim());
    }
    description = texts.sort((a, b) => b.length - a.length)[0] ?? "";
  }
  // Тайлбар олдоогүй бол харьцсан дансыг тайлбар болгон ашиглана (bank template-уудтай нийцүүлэв)
  if (!description) description = counterparty ?? "Гүйлгээ";

  // Нэг баганатай тул нэр/дугаарыг ангилж салгана.
  const { name: counterpartyName, account: counterpartyAccount } = splitCounterparty(counterparty);

  return { date, description, counterparty, counterpartyName, counterpartyAccount, amount };
}

// ── Header offset-ийн чанарыг үнэлэх ──────────────────────────────

interface OffsetResult {
  transactions: ParsedTransaction[];
  confidence: number; // 0-100
}

function tryParseAtOffset(sheet: XLSX.WorkSheet, offset: number): OffsetResult {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: offset,
  });
  if (rows.length === 0) return { transactions: [], confidence: 0 };

  const headers = Object.keys(rows[0]);
  const cols = detectByHeaders(headers);

  // Confidence score
  let confidence = 0;
  if (cols.dateCol) confidence += 20;
  if (cols.descCol) confidence += 20;
  if (cols.creditCol && cols.debitCol) confidence += 40;
  else if (cols.amountCol) confidence += 30;
  if (cols.balanceCol) confidence += 10; // үлдэгдэл байх нь сайн дохио (тэгээд бид түүнийг үл ашиглана)

  const transactions: ParsedTransaction[] = [];
  for (const row of rows) {
    const tx = buildTransaction(row, cols);
    if (tx) transactions.push(tx);
  }

  return { transactions, confidence };
}

function parseSheet(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  let best: OffsetResult = { transactions: [], confidence: 0 };

  for (let offset = 0; offset <= 15; offset++) {
    const result = tryParseAtOffset(sheet, offset);
    // Эхлээд confidence, дараа нь гүйлгээний тоогоор сонгох
    if (
      result.transactions.length > 0 &&
      (result.confidence > best.confidence ||
        (result.confidence === best.confidence && result.transactions.length > best.transactions.length))
    ) {
      best = result;
    }
  }

  return best.transactions;
}

// ── Public API ────────────────────────────────────────────────────

export function parseExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  let best: ParsedTransaction[] = [];
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

export function extractRawRows(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  let bestSheet = workbook.Sheets[workbook.SheetNames[0]];
  let bestRowCount = 0;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (data.length > bestRowCount) {
      bestRowCount = data.length;
      bestSheet = sheet;
    }
  }
  return XLSX.utils.sheet_to_json<unknown[]>(bestSheet, { header: 1, defval: "" });
}
