import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  status = 401;
  constructor() { super("Нэвтрэх шаардлагатай"); }
}

/**
 * API route бүрд эхэнд дуудаж userId-г авна.
 * Хэрэв нэвтрээгүй бол UnauthorizedError шиднэ —
 * route-ын catch блок 401-ээр буцаах ёстой.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user.id;
}

export async function getUserIdOrNull(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
