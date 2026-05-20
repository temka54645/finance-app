/**
 * Төлбөрийн 4 шатлалт систем.
 *
 * Tier нь хэрэглэгчийн сар тутмын хэмжээнд (statement, гүйлгээ) болон
 * боломжит функцэд (AI categorization, олон банк) хязгаар тавина.
 *
 * Backward compatibility: DB-д хуучин `pro`/`business` утга байж болзошгүй —
 * `normalizePlan()` нь тэдгээрийг шинэ tier-руу map хийнэ.
 */

export type PlanKey = "free" | "small" | "medium" | "large";

export interface PlanLimits {
  /** Сар тутмын гүйлгээний дээд тоо (Infinity = хязгааргүй) */
  txPerMonth: number;
  /** Сар тутамд оруулж болох statement-ийн дээд тоо */
  statementsPerMonth: number;
  /** Зэрэгцээ ашиглаж болох банкны тоо */
  banks: number;
  /** AI-аар категори тогтоох эрх */
  aiCategorization: boolean;
  /** Priority дэмжлэг (Том tier-д л) */
  prioritySupport: boolean;
  /** Олон хэрэглэгч/team feature (Том tier-д) */
  multiUser: boolean;
}

export interface PlanTier {
  key: PlanKey;
  label: string;
  description: string;
  priceMnt: number;
  limits: PlanLimits;
}

export const PLAN_TIERS: Record<PlanKey, PlanTier> = {
  free: {
    key: "free",
    label: "Бичил",
    description: "Турших, эсвэл маш бага хэмжээний хэрэглэгчдэд",
    priceMnt: 0,
    limits: {
      txPerMonth: 100,
      statementsPerMonth: 2,
      banks: 1,
      aiCategorization: false,
      prioritySupport: false,
      multiUser: false,
    },
  },
  small: {
    key: "small",
    label: "Жижиг",
    description: "Хувь хэрэглэгч эсвэл жижиг бизнес",
    priceMnt: 9_900,
    limits: {
      txPerMonth: 500,
      statementsPerMonth: 5,
      banks: 2,
      aiCategorization: true,
      prioritySupport: false,
      multiUser: false,
    },
  },
  medium: {
    key: "medium",
    label: "Дунд",
    description: "Дунд хэмжээний бизнес, нягтлан бодогч",
    priceMnt: 29_900,
    limits: {
      txPerMonth: 2_000,
      statementsPerMonth: 15,
      banks: 99,
      aiCategorization: true,
      prioritySupport: false,
      multiUser: false,
    },
  },
  large: {
    key: "large",
    label: "Том",
    description: "Том бизнес, нягтлан бодох газар",
    priceMnt: 79_900,
    limits: {
      txPerMonth: Number.POSITIVE_INFINITY,
      statementsPerMonth: Number.POSITIVE_INFINITY,
      banks: 99,
      aiCategorization: true,
      prioritySupport: true,
      multiUser: true,
    },
  },
};

/** Бүх tier-ийг дарааллаар (хямдаас үнэтэй рүү) буцаана */
export const PLAN_ORDER: PlanKey[] = ["free", "small", "medium", "large"];

/**
 * DB-ээс уншсан plan утгыг хүчинтэй PlanKey болгоно.
 * Хуучин утгуудыг (pro, business) map хийнэ.
 */
export function normalizePlan(raw: string | null | undefined): PlanKey {
  if (!raw) return "free";
  switch (raw) {
    case "free":
    case "small":
    case "medium":
    case "large":
      return raw;
    case "pro":
      return "small";
    case "business":
      return "medium";
    default:
      return "free";
  }
}

/** PlanKey-аас бүрэн tier object буцаана */
export function getTier(plan: string | null | undefined): PlanTier {
  return PLAN_TIERS[normalizePlan(plan)];
}

/** Дараагийн дээд tier-ийг буцаана (null = одоо хамгийн дээд) */
export function getNextTier(plan: string | null | undefined): PlanTier | null {
  const current = normalizePlan(plan);
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_TIERS[PLAN_ORDER[idx + 1]];
}

/** MNT-ийг "9,900₮" гэх мэт format хийнэ */
export function formatMnt(amount: number): string {
  return amount.toLocaleString("mn-MN", { maximumFractionDigits: 0 }) + "₮";
}

/** Хязгаарыг "хязгааргүй" буюу тоогоор format хийнэ */
export function formatLimit(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("mn-MN") : "хязгааргүй";
}
