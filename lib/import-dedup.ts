import type { ParsedTransaction } from "@/lib/parsers/excel";

/**
 * Хуулга оруулах үеийн давхардал шүүлт.
 *
 * Шалтгаан: нэг данс/хугацааг хамарсан 2 өөр файл (жишээ нь TDB export +
 * танигдаагүй өөр форматын файл) оруулахад ижил гүйлгээ 2 удаа DB-д ордог.
 * Файл бүр өөр parser-аар уншигдсан тул `description` нь зөрдөг
 * ("ЕВ -1" vs "452358110 ЦЭЛМЭГ ТӨРТОГТОХ") — иймд тайлбараар таних боломжгүй.
 * Цорын ганц найдвартай дохио нь: ижил өдөр + ижил төрөл + ижил дүн.
 *
 * Аюулгүй байдал:
 *  - Огноог UTC өдрийн нарийвчлалаар авна (TDB serial vs Khan datetime зөрөхөөс
 *    сэргийлж цаг/минут-ыг үл тоомсорлоно).
 *  - Multiset matching: нэг өдөр 2 ижил дүнтэй жинхэнэ шимтгэл байвал, аль
 *    хэдийн орсон 1-тэй нь л таарч, 2 дахийг нь шинэ гэж үзнэ.
 */

export interface ExistingTxKey {
  date: Date;
  amount: number; // эерэг (Math.abs хадгалагдсан)
  type: string;   // "income" | "expense"
}

/** UTC өдөр + төрөл + дүн (2 орон) → давхардлын түлхүүр. */
function dedupKey(date: Date, amount: number, type: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}|${type}|${Math.abs(amount).toFixed(2)}`;
}

export interface DedupResult {
  /** DB-д урьд нь байхгүй — оруулах ёстой гүйлгээ */
  fresh: ParsedTransaction[];
  /** Аль хэдийн орсон гэж тогтоогдсон — алгасах гүйлгээ */
  duplicates: ParsedTransaction[];
}

/**
 * `incoming` гүйлгээнүүдийг `existing` (DB-д байгаа) гүйлгээтэй харьцуулж
 * fresh / duplicates болгон хуваана. Multiset логик ашиглана.
 */
export function splitDuplicates(
  incoming: ParsedTransaction[],
  existing: ExistingTxKey[]
): DedupResult {
  // Байгаа гүйлгээний multiset (key → үлдсэн тоо)
  const available = new Map<string, number>();
  for (const e of existing) {
    const type = e.type === "income" || e.type === "expense"
      ? e.type
      : (e.amount >= 0 ? "income" : "expense");
    const k = dedupKey(e.date, e.amount, type);
    available.set(k, (available.get(k) ?? 0) + 1);
  }

  const fresh: ParsedTransaction[] = [];
  const duplicates: ParsedTransaction[] = [];

  for (const tx of incoming) {
    const type = tx.amount >= 0 ? "income" : "expense";
    const k = dedupKey(tx.date, tx.amount, type);
    const remaining = available.get(k) ?? 0;
    if (remaining > 0) {
      available.set(k, remaining - 1); // нэг тааруулалтыг "хэрэглэв"
      duplicates.push(tx);
    } else {
      fresh.push(tx);
    }
  }

  return { fresh, duplicates };
}
