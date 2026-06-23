/**
 * Харьцагч (counterparty) талбарын дэлгэцийн нэгдсэн формат.
 *
 * Банк болгон Excel хуулгадаа "Харьцсан данс" баганад өөр өөр төрлийн утга
 * агуулдаг тул dashboard картууд дээр зөрүүтэй харагддаг:
 *   - XacBank / Голомт → харьцагчийн НЭР    (ж: "Бат-Эрдэнэ")
 *   - ХААН банк        → зөвхөн дансны ДУГААР (ж: "5111793587")
 *   - Төрийн банк      → "нэр · дугаар" хосолсон
 *
 * ХААН зэрэг банк нэрийг тусдаа баганаар өгдөггүй тул дугаарыг нэр болгож
 * хувиргах боломжгүй. Иймд утгыг НЭР / ДАНС гэж ангилаад, дэлгэцэнд нэг
 * маягаар (данс бол тусгай шошго/дүрстэйгээр) харуулж тогтворжуулна.
 */

/** Зай, зураас, ₮ тэмдэг хасаад зөвхөн 6+ оронтой тоо үлдвэл дансны дугаар гэж үзнэ. */
export function isAccountNumber(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const cleaned = raw.replace(/[\s\-·]/g, "");
  return /^\d{6,}$/.test(cleaned);
}

/**
 * Нэг баганатай банкны "Харьцсан данс" утгыг нэр / дугаар руу ангилна.
 * Дугаар бол `account`, үсэг агуулсан бол `name`. Хоёр баганатай банк
 * (Голомт/Төрийн банк) энийг ашиглахгүй — шууд тус тусын баганаас авна.
 */
export function splitCounterparty(
  raw: string | null | undefined
): { name?: string; account?: string } {
  const v = (raw ?? "").trim();
  if (!v) return {};
  if (isAccountNumber(v)) return { account: v.replace(/[\s\-·]/g, "") };
  return { name: v };
}

export interface CounterpartyLabel {
  /** Дэлгэцэнд харуулах текст. */
  text: string;
  /** Утга нь дансны дугаар уу (true) эсвэл нэр үү (false). */
  isAccount: boolean;
  /** Огт утгагүй (хоосон) эсэх. */
  isEmpty: boolean;
}

/**
 * Харьцагчийн утгыг дэлгэцэнд бэлдэнэ. Дугаарыг хэвээр нь үлдээж зөвхөн
 * `isAccount` тугаар тэмдэглэнэ (дуудагч тал дансны дүрс/шошго нэмнэ).
 */
export function counterpartyLabel(raw: string | null | undefined): CounterpartyLabel {
  const v = (raw ?? "").trim();
  if (!v) return { text: "Тодорхойгүй", isAccount: false, isEmpty: true };
  if (isAccountNumber(v)) {
    return { text: v.replace(/[\s\-·]/g, ""), isAccount: true, isEmpty: false };
  }
  return { text: v, isAccount: false, isEmpty: false };
}
