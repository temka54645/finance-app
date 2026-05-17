import * as XLSX from "xlsx";
import type { ParsedTransaction } from "../excel";

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

    if (credit > 0) results.push({ date, description, amount: credit });
    else if (debit > 0) results.push({ date, description, amount: -debit });
  }

  return results;
}
