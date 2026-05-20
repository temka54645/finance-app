import { XAC_BANK, parseXacBank } from "./xac";
import { TDB_BANK, parseTdbBank } from "./tdb";
import { STATE_BANK, parseStateBank } from "./statebank";
import { KHAN_BANK, parseKhanBank } from "./khan";
import { parseExcel, extractRawRows, type ParsedTransaction } from "../excel";

export interface BankTemplate {
  id: string;
  name: string;
  detect: (rawRows: unknown[][]) => boolean;
  parse: (buffer: Buffer) => ParsedTransaction[];
}

// Бүртгэгдсэн банкны template-ууд
const BANK_TEMPLATES: BankTemplate[] = [
  { ...XAC_BANK, parse: parseXacBank },
  { ...TDB_BANK, parse: parseTdbBank },
  { ...STATE_BANK, parse: parseStateBank },
  { ...KHAN_BANK, parse: parseKhanBank },
  // Цаашид Golomt, Capitron гэх мэт нэмж болно
];

export interface ParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string | null;
  usedTemplate: boolean;
}

/**
 * Файлыг өгөгдсөн bank template-ээр эсвэл автомат илрүүлээд parse хийнэ.
 * - Эхлээд танигдсан банк байгаа эсэхийг шалгана
 * - Танигдвал тухайн template-ыг хэрэглэнэ
 * - Танигдахгүй бол generic auto-detect parser ашиглана
 */
export function parseWithBankDetection(buffer: Buffer): ParseResult {
  const rawRows = extractRawRows(buffer);

  // 1. Бүртгэгдсэн банк байгаа эсэхийг шалгах
  for (const template of BANK_TEMPLATES) {
    if (template.detect(rawRows)) {
      const transactions = template.parse(buffer);
      if (transactions.length > 0) {
        return { transactions, detectedBank: template.name, usedTemplate: true };
      }
    }
  }

  // 2. Generic auto-detect
  const transactions = parseExcel(buffer);
  return { transactions, detectedBank: null, usedTemplate: false };
}

export { BANK_TEMPLATES };
