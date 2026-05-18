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

# ── 3. migrate-deps (Prisma CLI-н бүх transitive deps-тэй цэвэр install) ────
FROM node:20-alpine AS migrate-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Зөвхөн prisma migration ажиллуулахад хэрэгцээтэй deps:
RUN npm install --omit=optional --no-audit --no-fund prisma @prisma/client @prisma/adapter-pg pg dotenv

# ── 4. runner ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone (өөрөө node_modules-ын subset-тэй)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

# Migration ажиллуулахад хэрэгтэй prisma CLI + бүх transitive deps
COPY --from=migrate-deps --chown=nextjs:nodejs /app/node_modules ./prisma-cli-modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 3000

# Migrate-ийн node_modules-ыг түр зам дээр зааж, migrate deploy ажиллуулна.
# Дараа нь Next.js standalone server.js ажиллана (өөрийн node_modules-той).
CMD ["sh","-c","NODE_PATH=/app/prisma-cli-modules node /app/prisma-cli-modules/prisma/build/index.js migrate deploy && node server.js"]
