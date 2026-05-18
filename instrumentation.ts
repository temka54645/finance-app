// Сервер эхлэх бүрд (зөвхөн development үед) database цэвэрлэнэ.
// Production-д ажиллахгүй — хэд хэдэн давхар хамгаалалт:
//   1) NODE_ENV !== "development"
//   2) DISABLE_DB_RESET === "1" (.env-д explicit тохируулж болно)
//   3) Дотоод `cleared` flag (нэг л удаа ажиллана)

let cleared = false;

export async function register() {
  if (cleared) return;
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.DISABLE_DB_RESET === "1") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  cleared = true;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.transaction.deleteMany();
    await prisma.statement.deleteMany();
    // User-ийг үлдээнэ — нэвтэрсэн хэрэглэгчээ алдахгүй
    console.log("[instrumentation] Statement + Transaction цэвэрлэгдлээ (dev mode)");
  } catch (err) {
    console.error("[instrumentation] Цэвэрлэхэд алдаа:", err);
  }
}
