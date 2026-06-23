import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";
import { splitCounterparty } from "@/lib/counterparty";

// Note: StatementMeta-г import хийхийн оронд дотооддоо тодорхойлсон —
// xac.ts ⇄ index.ts хооронд circular import гарахаас сэргийлэх.
interface StatementMeta {
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

export const XAC_BANK = {
  id: "xac",
  name: "Хас банк (XacBank)",
  // Файл XAC банкны statement мөн эсэхийг шалгах signature
  detect: (rawRows: unknown[][]): boolean => {
    const text = rawRows
      .slice(0, 10)
      .flat()
      .filter(v => typeof v === "string")
      .join(" ")
      .toLowerCase();
    return /дансны хуулга/.test(text) &&
           /харьцсан данс|гүйлгээний утга/.test(text) &&
           /орлого/.test(text) && /зарлага/.test(text);
  },
  // XAC банкны яг тогтсон header болон багана нэр
  headers: ["Огноо", "Харьцсан данс", "Гүйлгээний дугаар", "Гүйлгээний утга", "Орлого", "Зарлага", "Үлдэгдэл"],
};

export function parseXacBank(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Header мөрийг "Огноо" гэсэн утгаар хайна
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i];
    if (row.some(c => typeof c === "string" && c.trim() === "Огноо") &&
        row.some(c => typeof c === "string" && c.trim() === "Орлого") &&
        row.some(c => typeof c === "string" && c.trim() === "Зарлага")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx < 0) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: headerRowIdx,
  });

  const results: ParsedTransaction[] = [];
  for (const row of rows) {
    const dateRaw = row["Огноо"];
    let date: Date | null = null;

    if (dateRaw instanceof Date) date = dateRaw;
    else if (typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) date = d;
    }
    if (!date) continue;

    const credit = Number(row["Орлого"]) || 0;
    const debit = Number(row["Зарлага"]) || 0;
    const description = String(row["Гүйлгээний утга"] ?? "").trim() || "Гүйлгээ";
    const counterparty = String(row["Харьцсан данс"] ?? "").trim() || undefined;
    // XAC нэг "Харьцсан данс" баганатай — нэр эсвэл дугаарыг ангилж салгана.
    const { name: cpName, account: cpAccount } = splitCounterparty(counterparty);

    if (credit > 0) results.push({ date, description, counterparty, counterpartyName: cpName, counterpartyAccount: cpAccount, amount: credit });
    else if (debit > 0) results.push({ date, description, counterparty, counterpartyName: cpName, counterpartyAccount: cpAccount, amount: -debit });
  }

  return results;
}

const MONTHS_3LETTER: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * "01/Jul/2021-30/Sep/2021" гэх мэт интервал-аас periodStart/periodEnd-ийг гаргана.
 */
function parsePeriodRange(text: string): { start?: Date; end?: Date } {
  const m = text.match(/(\d{1,2})\/([A-Za-z]{3})\/(\d{4})\s*[-–—]\s*(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/);
  if (!m) return {};
  const [, d1, mo1, y1, d2, mo2, y2] = m;
  const m1 = MONTHS_3LETTER[mo1.toLowerCase()];
  const m2 = MONTHS_3LETTER[mo2.toLowerCase()];
  if (m1 === undefined || m2 === undefined) return {};
  return {
    start: new Date(Date.UTC(Number(y1), m1, Number(d1))),
    end: new Date(Date.UTC(Number(y2), m2, Number(d2), 23, 59, 59)),
  };
}

/**
 * XAC хуулгын metadata (period, opening/closing balance) гаргана.
 */
export function extractXacMeta(buffer: Buffer): StatementMeta {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const meta: StatementMeta = {};

  // Period interval — "Хугацаа :" гэсэн label-ын дараах cell-ээс
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell === "string" && /хугацаа\s*:/i.test(cell)) {
        const next = row[j + 1];
        if (typeof next === "string") {
          const { start, end } = parsePeriodRange(next);
          if (start) meta.periodStart = start;
          if (end) meta.periodEnd = end;
        }
      }
    }
  }

  // Opening / Closing — "Эхний үлдэгдэл" / "Эцсийн үлдэгдэл" мөрөөс col 6 (Үлдэгдэл)
  for (const row of rows) {
    const utga = String(row[3] ?? "").trim();
    if (utga === "Эхний үлдэгдэл") {
      const val = Number(row[6]);
      if (!isNaN(val)) meta.openingBalance = val;
    } else if (utga === "Эцсийн үлдэгдэл") {
      const val = Number(row[6]);
      if (!isNaN(val)) meta.closingBalance = val;
    }
  }

  return meta;
}
