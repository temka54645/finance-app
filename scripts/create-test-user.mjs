import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { randomBytes } from "crypto";

const email = (process.argv[2] ?? "test@finmate.local").toLowerCase();
const password = process.argv[3] ?? "Test12345!";
const name = process.argv[4] ?? "Test User";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hashedPassword = await bcrypt.hash(password, 12);
const id = "c" + randomBytes(12).toString("hex");

const sql = `
INSERT INTO "User" (id, email, "hashedPassword", name, "userType", role, plan, "paymentStatus", "planAmount", "createdAt")
VALUES ($1, $2, $3, $4, 'personal', 'user', 'free', 'active', 0, NOW())
ON CONFLICT (email) DO UPDATE SET "hashedPassword" = EXCLUDED."hashedPassword", name = EXCLUDED.name
RETURNING id, email;
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
