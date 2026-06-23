import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";
import { parseDateRange } from "./metaHelpers";

interface StatementMeta {
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

/**
 * Голомт банк (Golomt Bank) Excel statement parser.
 *
 * Format (Operative Account Statement):
 *   Sheet: "OperativeAccountStatement"
 *
 *   Row 0:  ["","","","","","Хуулганы огноо","", "<print date>"]
 *   Row 1:  ["ДАНСНЫ ХУУЛГА", ...]
 *   Row 2:  ["", "Дансны дугаар", "<account> [MNT]", "IBAN", "", "MN24 ...", "", ""]
 *   Row 3:  ["", "Харилцагчийн нэр", "<name>", "Гүйлгээний огноо", "", "2024-04-01 - 2024-07-01", "", ""]
 *   Row 4:  ["", "Эхний үлдэгдэл", <opening number>, "", "", "", "", ""]
 *   Row 5 (HEADER):
 *           ["", "Гүйлгээний огноо", "Гүйлгээний утга",
 *            "Харьцсан дансны нэр", "Харьцсан данс",
 *            "Ханш", "Орлого", "Зарлага"]
 *   Row 6..N-4 (DATA):
 *           col 1: ISO datetime "2024-04-01T19:21:14"
 *           col 2: description
 *           col 3: counterparty name
 *           col 4: counterparty account number
 *           col 5: exchange rate (1 for MNT)
 *           col 6: income (positive) or ""
 *           col 7: expense (positive) or ""
 *   Footer last 3 rows: "Нийт орлого" / "Нийт зарлага" / "Эцсийн үлдэгдэл"
 */

export const GOLOMT_BANK = {
  id: "golomt",
  name: "Голомт Банк (Golomt Bank)",
  detect: (rawRows: unknown[][]): boolean => {
    const text = rawRows
      .slice(0, 10)
      .flat()
      .filter(v => typeof v === "string")
      .join(" ");
    return /дансны хуулга/i.test(text) &&
           /харьцсан дансны нэр/i.test(text) &&
           /гүйлгээний утга/i.test(text);
  },
};

const COL = {
  date: 1,
  description: 2,
  counterpartyName: 3,
  counterpartyAcct: 4,
  rate: 5,
  income: 6,
  expense: 7,
};

function getSheet(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName =
    workbook.SheetNames.find(n => /operative\s*account\s*statement/i.test(n)) ??
    workbook.SheetNames.find(n => /statement|хуулга/i.test(n)) ??
    workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
}

function parseGolomtDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val !== "string") return null;
  // "2024-04-01T19:21:14" эсвэл "2024-04-04T17:25" (секунд optional)
  const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)));
  }
  const md = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (md) {
    const [, y, mo, d] = md;
    return new Date(Date.UTC(+y, +mo - 1, +d));
  }
  return null;
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[,\s₮]/g, "");
    if (!cleaned) return 0;
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function findHeaderIdx(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    const hasDateLabel = row.some(c => typeof c === "string" && /^гүйлгээний огноо$/i.test(c.trim()));
    const hasIncomeLabel = row.some(c => typeof c === "string" && /^орлого$/i.test(c.trim()));
    const hasExpenseLabel = row.some(c => typeof c === "string" && /^зарлага$/i.test(c.trim()));
    if (hasDateLabel && hasIncomeLabel && hasExpenseLabel) return i;
  }
  return -1;
}

export function parseGolomtBank(buffer: Buffer): ParsedTransaction[] {
  const rows = getSheet(buffer);
  const headerIdx = findHeaderIdx(rows);
  if (headerIdx < 0) return [];

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const date = parseGolomtDate(row[COL.date]);
    if (!date) continue; // footer / blank rows

    const income = toNumber(row[COL.income]);
    const expense = toNumber(row[COL.expense]);

    let amount: number;
    if (income > 0) amount = income;
    else if (expense > 0) amount = -expense;
    else continue;

    const desc = String(row[COL.description] ?? "").trim();
    const counterpartyName = String(row[COL.counterpartyName] ?? "").trim();
    const counterpartyAcct = String(row[COL.counterpartyAcct] ?? "").trim();
    const description = desc || counterpartyName || "Гүйлгээ";
    const counterparty = counterpartyName ||
      (counterpartyAcct ? counterpartyAcct : undefined);

    results.push({
      date,
      description,
      counterparty,
      // Голомт нэр (col 3) ба данс (col 4)-ыг тус тусад нь өгдөг — салгаж хадгална.
      counterpartyName: counterpartyName || undefined,
      counterpartyAccount: counterpartyAcct || undefined,
      amount,
    });
  }

  return results;
}

/**
 * Голомт хуулгын period + balance metadata.
 *  - "Гүйлгээний огноо" cell-ын дараагийн нүднээс period range
 *  - "Эхний үлдэгдэл" мөрнөөс openingBalance
 *  - Footer-ийн "Эцсийн үлдэгдэл" мөрнөөс closingBalance
 */
export function extractGolomtMeta(buffer: Buffer): StatementMeta {
  const rows = getSheet(buffer);
  const meta: StatementMeta = {};

  // Эхний 10 мөр дотроос label-ийг хайна
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell !== "string") continue;
      const trimmed = cell.trim();

      // Period — "Гүйлгээний огноо" label-аас 2 нүдний дараа range байх ("Х", "", "2024-04-01 - 2024-07-01")
      if (/^гүйлгээний огноо$/i.test(trimmed)) {
        for (let k = j + 1; k < Math.min(row.length, j + 4); k++) {
          const v = row[k];
          if (typeof v === "string" && /\d{4}-\d{1,2}-\d{1,2}/.test(v)) {
            const { start, end } = parseDateRange(v);
            if (start) meta.periodStart = start;
            if (end) meta.periodEnd = end;
            break;
          }
        }
      }

      // Opening balance — "Эхний үлдэгдэл" label, дараа нь тоо
      if (/^эхний үлдэгдэл$/i.test(trimmed)) {
        for (let k = j + 1; k < row.length; k++) {
          const v = row[k];
          if (typeof v === "number" && !isNaN(v)) { meta.openingBalance = v; break; }
          if (typeof v === "string" && v.trim()) {
            const n = parseFloat(v.replace(/[,\s₮]/g, ""));
            if (!isNaN(n)) { meta.openingBalance = n; break; }
          }
        }
      }
    }
  }

  // Closing balance — footer-ийн "Эцсийн үлдэгдэл" мөрөөс (хүснэгтийн доод хэсэг)
  for (let i = rows.length - 1; i >= Math.max(0, rows.length - 10); i--) {
    const row = rows[i];
    const labelCell = row.find(c => typeof c === "string" && /^эцсийн үлдэгдэл$/i.test(c.trim()));
    if (!labelCell) continue;
    // дараагийн тоог ол
    for (const v of row) {
      if (typeof v === "number" && !isNaN(v) && v !== 0) {
        meta.closingBalance = v;
        break;
      }
      if (typeof v === "string" && v.trim() && /^[-\d.,\s₮]+$/.test(v)) {
        const n = parseFloat(v.replace(/[,\s₮]/g, ""));
        if (!isNaN(n)) { meta.closingBalance = n; break; }
      }
    }
    if (meta.closingBalance !== undefined) break;
  }

  return meta;
}
