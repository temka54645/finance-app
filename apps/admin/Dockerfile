# syntax=docker/dockerfile:1.7
# Build context = repo root (monorepo). fly.toml: dockerfile = "apps/admin/Dockerfile".
# ⚠ migrate БАЙХГҮЙ — schema-г зөвхөн web app эзэмшинэ (ижил DB, race-аас сэргийлнэ).

# ── 1. deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN npm ci

# ── 2. builder ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
ARG GIT_SHA=dev
RUN echo "Building admin for commit: $GIT_SHA"
COPY . .
RUN npm run generate -w @finmate/db
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @finmate/admin

# ── 3. runner ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone (өөрөө self-contained — traced node_modules дотроо агуулна).
# outputFileTracingRoot=repo root тул root = /app, server нь apps/admin/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
# public/ (лого зэрэг static asset) — standalone үүнийг автоматаар оруулдаггүй.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/admin/server.js"]
