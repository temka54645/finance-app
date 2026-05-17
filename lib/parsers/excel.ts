import * as XLSX from "xlsx";

export interface ParsedTransaction {
  date: Date;
  description: string;
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
  if (typeof val === "number" && val > 1000 && val < 100000) {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d && d.y > 2000) return new Date(d.y, d.m - 1, d.d);
    } catch { /* ignore */ }
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

// ── Аль ч мөрөөс гүйлгээ задлах ───────────────────────────────────

interface RowAnalysis {
  date: Date | null;
  texts: string[];
  numbers: { col: string; val: number }[];
}

function analyzeRow(row: Record<string, unknown>): RowAnalysis {
  const result: RowAnalysis = { date: null, texts: [], numbers: [] };

  for (const [col, val] of Object.entries(row)) {
    if (!result.date) {
      const d = parseDate(val);
      if (d) { result.date = d; continue; }
    }
    const n = parseAmount(val);
    if (n !== null) {
      result.numbers.push({ col, val: n });
      continue;
    }
    if (isText(val)) {
      result.texts.push(String(val).trim());
    }
  }

  return result;
}

// ── Sheet-ийн бүтцийг ойлгох (2-р хүртэлх тоон багана) ────────────

function detectAmountStrategy(rows: Record<string, unknown>[]): {
  strategy: "credit-debit" | "single";
  creditCol?: string;
  debitCol?: string;
} {
  // Бүх мөрөнд хэдэн тоон багана идэвхтэй байгааг тоолно
  const colNumberCounts: Record<string, number> = {};
  for (const row of rows) {
    for (const [col, val] of Object.entries(row)) {
      if (parseAmount(val) !== null && parseDate(val) === null) {
        colNumberCounts[col] = (colNumberCounts[col] ?? 0) + 1;
      }
    }
  }

  // Хамгийн идэвхтэй 2 тоон багана олох
  const topNumCols = Object.entries(colNumberCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([col]) => col);

  if (topNumCols.length < 2) return { strategy: "single" };

  // Багануудын нэрээр credit/debit таних
  const headers = topNumCols.map(c => c.toLowerCase());
  const creditIdx = headers.findIndex(h => /орлого|credit|incoming|хүлээн|deposit|кредит|орсон/.test(h));
  const debitIdx = headers.findIndex(h => /зарлага|debit|outgoing|төлсөн|withdrawal|дебит|гарсан/.test(h));

  if (creditIdx >= 0 && debitIdx >= 0) {
    return {
      strategy: "credit-debit",
      creditCol: topNumCols[creditIdx],
      debitCol: topNumCols[debitIdx],
    };
  }

  // Хоёр идэвхтэй тоон багана байгаа боловч нэр нь танигдаагүй —
  // ихэвчлэн эхнийх нь орлого, хоёр дахь нь зарлага гэж үздэг
  // (МНБ-ны стандарт), гэхдээ найдваргүй учир single ашиглана
  return { strategy: "single" };
}

function buildTransaction(
  row: Record<string, unknown>,
  strategy: ReturnType<typeof detectAmountStrategy>
): ParsedTransaction | null {
  const analysis = analyzeRow(row);
  if (!analysis.date) return null;

  let amount: number | null = null;

  if (strategy.strategy === "credit-debit" && strategy.creditCol && strategy.debitCol) {
    const credit = parseAmount(row[strategy.creditCol]);
    const debit = parseAmount(row[strategy.debitCol]);
    if (credit && Math.abs(credit) > 0) amount = Math.abs(credit);
    else if (debit && Math.abs(debit) > 0) amount = -Math.abs(debit);
  } else {
    // Хамгийн их үнэмлэхүй утгатай тоог гүйлгээний дүн гэж үзнэ
    // (Үлдэгдэл нь ихэвчлэн их боловч statement-д нэг л байх ёстой)
    const candidates = analysis.numbers.filter(n => Math.abs(n.val) > 0);
    if (candidates.length === 0) return null;
    // Эхний тоог авна (ихэвчлэн үлдэгдэл сүүлд байдаг)
    amount = candidates[0].val;
  }

  if (amount === null || amount === 0) return null;

  // Тайлбар: хамгийн урт текст
  const description = analysis.texts.sort((a, b) => b.length - a.length)[0] ?? "Гүйлгээ";

  return { date: analysis.date, description, amount };
}

// ── Header мөрийг тогтоох (хэд хэдийг туршина) ────────────────────

function tryParseAtOffset(sheet: XLSX.WorkSheet, offset: number): ParsedTransaction[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: offset,
  });

  if (rows.length === 0) return [];

  const strategy = detectAmountStrategy(rows);
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    const tx = buildTransaction(row, strategy);
    if (tx) results.push(tx);
  }

  return results;
}

function parseSheet(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  // 0-10 хүртэлх offset-уудыг туршиж хамгийн их гүйлгээтэйг сонгоно
  let best: ParsedTransaction[] = [];
  for (let offset = 0; offset <= 10; offset++) {
    const result = tryParseAtOffset(sheet, offset);
    if (result.length > best.length) best = result;
  }
  return best;
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

// ── AI-аар task тэрхэн raw data-аас гүйлгээ задлах (fallback) ─────

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
