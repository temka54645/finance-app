import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ── Хуваалцсан Prisma client (web + admin app хоёулаа эндээс импортолно) ──
// Нэг pg.Pool + нэг PrismaClient singleton. dev үед HMR-ийн давхар instance-аас
// сэргийлж globalThis дээр кэшилнэ.

const globalForPool = globalThis as unknown as { pgPool: pg.Pool };

function createPool() {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
}

const pool = globalForPool.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;

function createPrismaClient() {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Prisma-ийн бүх type / enum / `Prisma` namespace-ийг дамжуулан экспортлоно
// (App-ууд `@finmate/db`-ээс шууд import хийнэ).
export * from "../generated/prisma/client";
