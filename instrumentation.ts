// Сервер эхлэх бүрд (зөвхөн development үед) database цэвэрлэнэ.
let cleared = false;

export async function register() {
  if (cleared) return;
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  cleared = true;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.transaction.deleteMany();
    await prisma.statement.deleteMany();
    console.log("[instrumentation] Database цэвэрлэгдлээ (dev mode)");
  } catch (err) {
    console.error("[instrumentation] Database цэвэрлэхэд алдаа:", err);
    // Алдаа гарсан ч серверийг блоклохгүй
  }
}
