/**
 * Тухайн хэрэглэгчийн сар тутмын ашиглалтыг тооцоолж,
 * plan-ийн хязгаартай харьцуулна.
 */

import { prisma } from "@/lib/db";
import { getTier, type PlanKey } from "@/lib/plans";

/**
 * BETA_MODE / BYPASS_PLAN_LIMITS флаг идэвхтэй үед бүх plan хязгаар
 * unblock хийгдэнэ. Production-д энгийн plan-ийн logic-ыг сэргээхдээ
 * env-ээс утгыг хасна.
 */
export function isLimitBypassed(): boolean {
  return process.env.BYPASS_PLAN_LIMITS === "1" || process.env.BETA_MODE === "1";
}

export interface MonthlyUsage {
  /** Энэ сард үүссэн гүйлгээний тоо */
  txCount: number;
  /** Энэ сард upload хийсэн statement-ийн тоо */
  statementCount: number;
  /** Хэрэглэж буй өвөрмөц банкны нэрсийн тоо */
  bankCount: number;
}

/**
 * Тухайн сарын эхний өдрийн UTC midnight буцаана.
 */
function startOfMonthUtc(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfNextMonthUtc(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/**
 * Хэрэглэгчийн энэ сарын ашиглалтыг буцаана.
 */
export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const start = startOfMonthUtc();
  const end = startOfNextMonthUtc();

  const [statements, txCount] = await Promise.all([
    prisma.statement.findMany({
      where: { userId, uploadedAt: { gte: start, lt: end } },
      select: { bankName: true },
    }),
    prisma.transaction.count({
      where: {
        statement: { userId },
        createdAt: { gte: start, lt: end },
      },
    }),
  ]);

  const banks = new Set<string>();
  for (const s of statements) {
    if (s.bankName) banks.add(s.bankName.toLowerCase());
  }

  return {
    txCount,
    statementCount: statements.length,
    bankCount: banks.size,
  };
}

/**
 * Хэрэглэгчийн plan + энэ сарын ашиглалт + дараагийн tier-ийг хамтад нь буцаана.
 */
export async function getUsageContext(userId: string) {
  const [user, usage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, paymentStatus: true, planAmount: true, paidAt: true },
    }),
    getMonthlyUsage(userId),
  ]);

  const tier = getTier(user?.plan);
  return { tier, usage, billing: user };
}

/**
 * Custom error — 402 Payment Required эсвэл upgrade prompt үед.
 */
export class LimitExceededError extends Error {
  public readonly action: LimitAction;
  public readonly currentPlan: PlanKey;
  public readonly limit: number;
  public readonly used: number;

  constructor(action: LimitAction, currentPlan: PlanKey, limit: number, used: number, message: string) {
    super(message);
    this.name = "LimitExceededError";
    this.action = action;
    this.currentPlan = currentPlan;
    this.limit = limit;
    this.used = used;
  }
}

export type LimitAction = "upload" | "tx" | "ai" | "bank";

/**
 * Үйлдэл хийхээс өмнө plan-ийн хязгаарт багтаж буй эсэхийг шалгана.
 * Багтахгүй бол `LimitExceededError` шиднэ.
 *
 * @param userId Хэрэглэгчийн ID
 * @param action Хийх гэж буй үйлдэл
 * @param projected Үйлдлийн дараа нэмэгдэх хэмжээ (default 1)
 */
export async function assertWithinLimit(
  userId: string,
  action: LimitAction,
  projected = 1
): Promise<void> {
  // Beta/тестийн үед бүх limit-ийг алгасна
  if (isLimitBypassed()) return;

  const { tier, usage } = await getUsageContext(userId);
  const limits = tier.limits;

  switch (action) {
    case "upload": {
      const next = usage.statementCount + projected;
      if (next > limits.statementsPerMonth) {
        throw new LimitExceededError(
          action,
          tier.key,
          limits.statementsPerMonth,
          usage.statementCount,
          `Таны "${tier.label}" багц сарын ${limits.statementsPerMonth} statement-ээр хязгаарлагдсан. Энэ сард та аль хэдийн ${usage.statementCount} оруулсан байна.`
        );
      }
      return;
    }
    case "tx": {
      const next = usage.txCount + projected;
      if (next > limits.txPerMonth) {
        throw new LimitExceededError(
          action,
          tier.key,
          limits.txPerMonth,
          usage.txCount,
          `Таны "${tier.label}" багц сарын ${limits.txPerMonth} гүйлгээгээр хязгаарлагдсан.`
        );
      }
      return;
    }
    case "ai": {
      if (!limits.aiCategorization) {
        throw new LimitExceededError(
          action,
          tier.key,
          0,
          0,
          `AI ангилал нь "${tier.label}" багцад багтаагүй. Дээд багц руу шилжих шаардлагатай.`
        );
      }
      return;
    }
    case "bank": {
      const next = usage.bankCount + projected;
      if (next > limits.banks) {
        throw new LimitExceededError(
          action,
          tier.key,
          limits.banks,
          usage.bankCount,
          `Таны "${tier.label}" багц нэг сард ${limits.banks} банкаар хязгаарлагдсан.`
        );
      }
      return;
    }
  }
}

/**
 * Эрх шалгахдаа throw хийхгүй, boolean буцаана (UI-д ашиглах).
 */
export async function canPerform(userId: string, action: LimitAction, projected = 1): Promise<boolean> {
  try {
    await assertWithinLimit(userId, action, projected);
    return true;
  } catch (e) {
    if (e instanceof LimitExceededError) return false;
    throw e;
  }
}
