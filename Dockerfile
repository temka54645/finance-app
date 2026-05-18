# syntax=docker/dockerfile:1.7

# ── 1. deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ── 2. builder ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── 3. prod-deps (зөвхөн production deps, dev устгасан) ──────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev

# ── 4. runner ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Бүх production deps (Prisma CLI болон бүх transitive deps оруулсан)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=prod-deps --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=prod-deps --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Generated Prisma client (Prisma 7-н output)
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

# Next.js standalone build (server.js + .next/server + минимал node_modules)
# ⚠ Энэ нь node_modules-ийг overlay хийнэ — standalone-н Next.js модулиуд prod-deps-ийг override болгоно
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# `node_modules/.bin/prisma` нь npm install-аас shim үүсгэгдсэн тул шууд хэрэглэнэ
CMD ["sh","-c","./node_modules/.bin/prisma migrate deploy && node server.js"]
