import * as XLSX from "xlsx";

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // эерэг = орлого, сөрөг = зарлага
}

function parseAmount(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[,\s₮]/g, "").replace(/[()]/g, m => m === "(" ? "-" : "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val.trim().replace(/\./g, "-"));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function detectColumns(headers: string[]): {
  dateCol: string | null;
  descCol: string | null;
  amountCol: string | null;
  creditCol: string | null;
  debitCol: string | null;
} {
  const lower = headers.map(h => h.toLowerCase());

  const find = (...terms: string[]) =>
    headers[lower.findIndex(h => terms.some(t => h.includes(t)))] ?? null;

  return {
    dateCol:   find("огноо", "date", "дата", "өдөр"),
    descCol:   find("утга", "тайлбар", "нэр", "desc", "memo", "нарийвчлал", "гүйлгээний"),
    amountCol: find("дүн", "amount", "мөнгө", "sum", "нийт"),
    creditCol: find("орлого", "credit", "зарим", "incoming", "хүлээн"),
    debitCol:  find("зарлага", "debit", "гарсан", "outgoing", "төлсөн"),
  };
}

export function parseExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const cols = detectColumns(headers);
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    const date = cols.dateCol ? parseDate(row[cols.dateCol]) : null;
    if (!date) continue;

    const description = String(cols.descCol ? row[cols.descCol] : "Гүйлгээ").trim() || "Гүйлгээ";

    let amount: number | null = null;

    if (cols.creditCol && cols.debitCol) {
      // Тусдаа орлого/зарлага багана байвал
      const credit = parseAmount(row[cols.creditCol]);
      const debit = parseAmount(row[cols.debitCol]);
      if (credit && credit !== 0) amount = Math.abs(credit);      // орлого = эерэг
      else if (debit && debit !== 0) amount = -Math.abs(debit);   // зарлага = сөрөг
    } else if (cols.amountCol) {
      amount = parseAmount(row[cols.amountCol]);
    } else {
      // Ямар ч багана олдоогүй бол тоон утга хайх
      for (const key of headers) {
        if (key === cols.dateCol || key === cols.descCol) continue;
        const v = parseAmount(row[key]);
        if (v !== null && v !== 0) { amount = v; break; }
      }
    }

    if (amount !== null && amount !== 0) {
      results.push({ date, description, amount });
    }
  }

  return results;
}

export function parseCSV(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const cols = detectColumns(headers);
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    const date = cols.dateCol ? parseDate(row[cols.dateCol]) : null;
    if (!date) continue;

    const description = String(cols.descCol ? row[cols.descCol] : "Гүйлгээ").trim() || "Гүйлгээ";

    let amount: number | null = null;

    if (cols.creditCol && cols.debitCol) {
      const credit = parseAmount(row[cols.creditCol]);
      const debit = parseAmount(row[cols.debitCol]);
      if (credit && credit !== 0) amount = Math.abs(credit);
      else if (debit && debit !== 0) amount = -Math.abs(debit);
    } else if (cols.amountCol) {
      amount = parseAmount(row[cols.amountCol]);
    }

    if (amount !== null && amount !== 0) {
      results.push({ date, description, amount });
    }
  }

  return results;
}
