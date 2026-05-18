# Finance App — Multi-tenant SaaS

Олон хэрэглэгчтэй санхүүгийн дүн шинжилгээний веб апп. Нягтлан бодогчид өөрсдийн данс үүсгэж, банкны statement upload хийн, орлого/зарлагаа категориор шинжилж, **жилээр болон сараар** dashboard дээр харах боломжтой.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL · Auth.js v5 (email+password) · Recharts · Anthropic Claude AI (auto-categorization)

---

## Local development

### 1. Prereqs

- **Node.js 20.9+**
- **Docker Desktop** (Postgres-ийг local ажиллуулахад) ЭСВЭЛ ямар нэг managed Postgres (Neon, Supabase, Railway)
- Anthropic API key — https://console.anthropic.com

### 2. Setup

```powershell
# 1. Deps
npm install

# 2. Env vars
cp .env.example .env.local
# .env.local-г засаад дараахыг бөглөнө:
#   DATABASE_URL  — Postgres connection string
#   AUTH_SECRET   — `openssl rand -hex 32` гэж үүсгэнэ
#   ANTHROPIC_API_KEY — Claude API key

# 3. Postgres ажиллуулах (docker-compose ашиглавал)
npm run db:up

# 4. Migration
npm run db:migrate

# 5. Dev server
npm run dev
```

`http://localhost:3000` — Эхний удаа `/signup` хуудсаар бүртгүүлнэ.

### 3. Хэрэгцээтэй scripts

| Команд | Үүрэг |
|--------|-------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript шалгах |
| `npm run db:up` / `db:down` | Local Postgres эхлүүлэх/унтраах |
| `npm run db:migrate` | Шинэ migration үүсгээд apply хийх |
| `npm run db:deploy` | Production-д migration apply хийх (CI/Dockerfile-д) |
| `npm run db:studio` | Prisma Studio UI |

---

## Railway-д deploy хийх

### A. Postgres service нэмэх
1. Railway dashboard → **+ New** → **Database** → **PostgreSQL**
2. Service-ийг үүсгэсний дараа `Variables` tab-аас **`DATABASE_URL`**-г хуулна

### B. App service нэмэх
1. **+ New** → **GitHub Repo** → `temka54645/finance-app` сонгох
2. Railway автомат **Dockerfile**-ыг таних
3. **Variables** tab-д дараахыг нэмнэ:

```
DATABASE_URL=<Postgres service-ийн internal URL>
AUTH_SECRET=<openssl rand -hex 32>
AUTH_URL=https://<your-app>.up.railway.app
AUTH_TRUST_HOST=true
ANTHROPIC_API_KEY=sk-ant-...
DISABLE_DB_RESET=1
NODE_ENV=production
```

4. **Settings** → **Domains** → Railway-ийн домэйн идэвхжүүлэх (эсвэл custom domain нэмж SSL автомат)
5. **Deploy** дарна — `Dockerfile` build хийгдэж, `npx prisma migrate deploy && node server.js` ажиллана

### C. Health шалгах
- `https://<your-app>.up.railway.app/api/health` → `{ "ok": true, "db": "up" }`
- Эхний удаа `/signup` хуудсаар хэрэглэгч үүсгэх

---

## Project structure

```
app/
├── (auth)/              # Login, signup pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── actions.ts       # Server actions
├── api/
│   ├── auth/            # NextAuth handlers
│   ├── health/          # /api/health
│   ├── upload/          # Statement upload + AI categorize
│   ├── statements/      # CRUD
│   ├── transactions/    # CRUD + bulk update
│   ├── reports/         # Aggregations + monthly chart data
│   └── debug-parse/     # File parser debug
├── layout.tsx           # Root layout + SessionProvider
└── page.tsx             # Main dashboard
auth.ts                  # NextAuth v5 config
proxy.ts                 # Route protection (Next.js 16 replaces middleware.ts)
lib/
├── db.ts                # Prisma client + pg pool singleton
├── auth-helpers.ts      # requireUserId() for API routes
├── parsers/             # Excel/PDF/Bank-specific parsers
└── ai/                  # Claude AI categorization
components/
├── FileUpload.tsx
├── SummaryCards.tsx
├── HighlightCards.tsx
├── TransactionTable.tsx
├── UncategorizedSection.tsx
├── YearSelector.tsx     # Шинэ: жил сонгох
├── MonthlyChart.tsx     # Шинэ: Recharts сарын bar chart
├── UserMenu.tsx         # Шинэ: logout
└── SessionProviderWrapper.tsx
prisma/schema.prisma     # User + Statement + Transaction + Auth.js tables
Dockerfile               # Multi-stage production build
docker-compose.yml       # Local Postgres only
```

---

## Supported banks (auto-detected)

- **Хас банк (XacBank)** — `lib/parsers/banks/xac.ts`
- **Худалдаа Хөгжлийн Банк (TDB)** — `lib/parsers/banks/tdb.ts`
- **Generic auto-parser** — багана нэр болон агуулгаар автомат таних
- **AI fallback** — heuristic амжилтгүй бол Claude AI шууд raw data-аас задлуулна

Шинэ банкны template нэмэхдээ `lib/parsers/banks/`-д `{bank}.ts` үүсгээд `index.ts`-д бүртгүүлнэ.

---

## Ирээдүйн ажил

- [ ] Email verification (Resend/SendGrid)
- [ ] Password reset flow
- [ ] Per-user Anthropic API key
- [ ] `/api/auth/signup` rate limiting
- [ ] Statement archive (delete-ийн оронд)
- [ ] CSV/Excel-ээр гүйлгээ export
- [ ] Олон валют (USD, CNY) дэмжих
