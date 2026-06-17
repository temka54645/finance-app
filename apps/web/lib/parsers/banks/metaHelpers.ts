/**
 * Bank parser-ийн нийтлэг metadata extractor helper-үүд.
 * Mongolian банкны хуулга нь дараах label-уудыг түгээмэл хэрэглэдэг:
 *   - "Хамрах хугацаа", "Интервал", "Хугацаа" — period range
 *   - "Эхний үлдэгдэл" / "Opening Balance" — opening
 *   - "Эцсийн үлдэгдэл" / "Closing Balance" — closing
 */

const MONTHS_3LETTER: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Дараах хэлбэрүүдийг хүлээж авна:
 *   "01/Jul/2021-30/Sep/2021"          (XAC)
 *   "2026-03-01-2026-05-20"            (Khan Bank "Интервал")
 *   "2026-03-01 - 2026-05-20"
 *   "01.07.2021 - 30.09.2021"
 */
export function parseDateRange(text: string): { start?: Date; end?: Date } {
  if (!text) return {};

  // Pattern 1: DD/Mon/YYYY-DD/Mon/YYYY
  const m1 = text.match(/(\d{1,2})\/([A-Za-z]{3})\/(\d{4})\s*[-–—]\s*(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/);
  if (m1) {
    const [, d1, mo1, y1, d2, mo2, y2] = m1;
    const m1n = MONTHS_3LETTER[mo1.toLowerCase()];
    const m2n = MONTHS_3LETTER[mo2.toLowerCase()];
    if (m1n !== undefined && m2n !== undefined) {
      return {
        start: new Date(Date.UTC(Number(y1), m1n, Number(d1))),
        end: new Date(Date.UTC(Number(y2), m2n, Number(d2), 23, 59, 59)),
      };
    }
  }

  // Pattern 2: YYYY-MM-DD-YYYY-MM-DD (Khan format)
  const m2 = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*-\s*(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) {
    const [, y1, mo1, d1, y2, mo2, d2] = m2;
    return {
      start: new Date(Date.UTC(Number(y1), Number(mo1) - 1, Number(d1))),
      end: new Date(Date.UTC(Number(y2), Number(mo2) - 1, Number(d2), 23, 59, 59)),
    };
  }

  // Pattern 3: DD.MM.YYYY - DD.MM.YYYY
  const m3 = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–—]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m3) {
    const [, d1, mo1, y1, d2, mo2, y2] = m3;
    return {
      start: new Date(Date.UTC(Number(y1), Number(mo1) - 1, Number(d1))),
      end: new Date(Date.UTC(Number(y2), Number(mo2) - 1, Number(d2), 23, 59, 59)),
    };
  }

  return {};
}

/**
 * Header rows дотроос label-ын дараагийн нүднээс утга хайна.
 * Жишээ нь "Хугацаа :" cell-ын дараах cell, эсвэл label дотор шууд "Интервал: 2026-03-01-..." хэлбэр.
 */
export function findLabeledValue(
  rows: unknown[][],
  label: RegExp,
  maxRows = 15
): string | null {
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell !== "string") continue;
      if (label.test(cell)) {
        // a) Дараагийн нүдэнд утга байж магадгүй
        const next = row[j + 1];
        if (next != null && next !== "" && (typeof next === "string" || typeof next === "number")) {
          return String(next);
        }
        // b) Label дотроо утгаа агуулж буй бол (e.g. "Интервал: 2026-03-01-2026-05-20")
        const inline = cell.split(/[:：]/).slice(1).join(":").trim();
        if (inline) return inline;
      }
    }
  }
  return null;
}

/**
 * Hierarchically тодорхой label-тай мөрөөс утгыг (өгөгдсөн col index дээр) уншина.
 * Жишээ: row[3]==="Эхний үлдэгдэл" бол row[balanceCol] = opening balance
 */
export function findBalanceByLabel(
  rows: unknown[][],
  label: string,
  labelCol: number,
  balanceCol: number
): number | undefined {
  for (const row of rows) {
    const cell = String(row[labelCol] ?? "").trim();
    if (cell === label) {
      const val = Number(row[balanceCol]);
      if (!isNaN(val)) return val;
    }
  }
  return undefined;
}
