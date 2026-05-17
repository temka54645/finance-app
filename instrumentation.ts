// Сервер эхлэх бүрд (зөвхөн development үед) database цэвэрлэнэ.
// Энэ нь хөгжүүлэлтийн үе шатанд сорилт хийхэд тохиромжтой.
export async function register() {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prisma } = await import("./lib/db");
  try {
    await prisma.transaction.deleteMany();
    await prisma.statement.deleteMany();
    console.log("[instrumentation] Database цэвэрлэгдлээ (dev mode)");
  } catch (err) {
    console.error("[instrumentation] Database цэвэрлэхэд алдаа:", err);
  }
}
