import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { randomBytes } from "crypto";

// Admin хэрэглэгч үүсгэх / байгаа account-ыг admin болгож ахиулах.
// finmate-admin app-ийн authorize нь role==='admin' БА emailVerified шаарддаг —
// тиймээс энд emailVerified-ийг шууд NOW() болгож тавина.
//
// Ажиллуулах (PROD DB рүү):
//   DATABASE_URL="<prod-postgres-url>" node scripts/create-admin-user.mjs <email> <password> "<name>"
//
// ⚠ Локал .env-ийн DATABASE_URL нь локал DB рүү заадаг тул prod-д
// үүсгэхдээ DATABASE_URL-ийг командын өмнө дамжуулна.

const email = (process.argv[2] ?? "admin@finmate.mn").toLowerCase();
const password = process.argv[3];
const name = process.argv[4] ?? "Admin";

if (!password || password.length < 8) {
  console.error("Usage: node scripts/create-admin-user.mjs <email> <password(min 8)> \"<name>\"");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hashedPassword = await bcrypt.hash(password, 12);
const id = "c" + randomBytes(12).toString("hex");

// Шинэ бол admin хэрэглэгч үүсгэнэ; байгаа email бол role=admin + emailVerified
// + нууц үгийг шинэчилнэ.
const sql = `
INSERT INTO "User" (id, email, "hashedPassword", name, "userType", role, plan, "paymentStatus", "planAmount", "emailVerified", "createdAt")
VALUES ($1, $2, $3, $4, 'personal', 'admin', 'free', 'active', 0, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  "hashedPassword" = EXCLUDED."hashedPassword",
  name = EXCLUDED.name,
  role = 'admin',
  "emailVerified" = COALESCE("User"."emailVerified", NOW())
RETURNING id, email, role, "emailVerified";
`;

try {
  const r = await pool.query(sql, [id, email, hashedPassword, name]);
  console.log(JSON.stringify({ ...r.rows[0], password }, null, 2));
} catch (e) {
  console.error("DB error:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
