# syntax=docker/dockerfile:1.7
# Build context = repo root (monorepo). fly.toml: dockerfile = "apps/web/Dockerfile".

# ── 1. deps (бүх workspace-н deps, root-д hoisted) ───────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# ── 2. builder ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Cache-bust: commit бүрт source-COPY ба build-ийг ЗААВАЛ дахин ажиллуулна
# (Depot/buildkit layer cache хуучин кодоор reuse хийхээс сэргийлнэ).
ARG GIT_SHA=dev
RUN echo "Building source for commit: $GIT_SHA"
COPY . .
RUN npm run generate -w @finmate/db
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @finmate/web

# ── 3. prod-deps (зөвхөн production deps — Prisma CLI энд орно) ──
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
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

# Production deps (Prisma CLI + transitive). migrate deploy-д хэрэгтэй.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./package.json

# migrate deploy-д хэрэгтэй schema + config (prisma.config.ts auto-load).
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts

# Next.js standalone (outputFileTracingRoot=repo root тул root = /app, server нь apps/web/server.js).
# Standalone-н node_modules нь prod-deps дээр overlay болж Next-н яг тааруулсан модулиудыг өгнө.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

# Migration-ийг ЗӨВХӨН энэ (web) app эзэмшинэ. packages/db дотроос ажиллуулж
# prisma.config.ts (relative schema path)-ийг автоматаар уншуулна.
CMD ["sh","-c","cd packages/db && node /app/node_modules/.bin/prisma migrate deploy && cd /app && exec node apps/web/server.js"]
