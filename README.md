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
│   ├── transactions/    # CRUD + bulk update (PATCH { ids, category|type })
│   ├── statements/gaps/ # Statement gap detection (sequential walk)
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
├── ai/                  # Claude AI categorization
└── transaction-filter.ts # Query DSL parser + filter/sort engine
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
- **ХААН банк (Khan Bank)** — `lib/parsers/banks/khan.ts`
- **Төрийн банк (State Bank)** — `lib/parsers/banks/state.ts`
- **Голомт банк (Golomt)** — `lib/parsers/banks/golomt.ts`
- **Generic auto-parser** — багана нэр болон агуулгаар автомат таних
- **AI fallback** — heuristic амжилтгүй бол Claude AI шууд raw data-аас задлуулна

Бүх банкны parser нь metadata (период эхлэл/төгсгөл, нээлтийн/хаалтын үлдэгдэл) гаргадаг бөгөөд эдгээрийг `/api/statements/gaps` endpoint ашиглан statement-уудын завсар таних зорилгоор хэрэглэнэ.

Шинэ банкны template нэмэхдээ `lib/parsers/banks/`-д `{bank}.ts` үүсгээд `index.ts`-д бүртгүүлнэ.

---

## Changelog

Хамгийн сүүлийн томоохон шинэчлэлтүүд (огноогоор буурахаар жагсаасан).

### 2026-05-25 — Гүйлгээний дэвшилтэт шүүлт + olноор bulk update

**Дэвшилтэт шүүлт** (`components/TransactionTable.tsx` + шинэ `lib/transaction-filter.ts`)
- Хайлтын мөрөнд query DSL: `такси`, `-хас`, `"яг хэллэг"`, `cat:хоол`, `bank:хас`, `note:atm`, `desc:tdb`, `t:income`/`t:expense`, `>50000`, `<=2024-06`, `>=2024-03-01`, `2024-03-15`.
- "Дэвшилтэт" панель: категори multi-select chips (тоотой), огнооны болон дүнгийн range, эрэмбэлэх (date/amount/description/category × asc/desc).
- Active-filter chips бар нь шүүлт бүрийг тус тусдаа арилгах боломжтой, "Бүгдийг арилгах" reset товч.
- Real-time totals: шүүгдсэн гүйлгээний нийт орлого / зарлага / үлдэгдэл шууд харагдана.
- Keyboard shortcut: `/` хайлтад focus, `Esc` цэвэрлэх. `?` товч syntax-ийн тусламж.
- Танигдаагүй token-ийг amber hint-ээр сэрэмжлүүлнэ.

**Олноор сонгож category/type оноох**
- Хүснэгтийн зүүн талд checkbox багана. Header дээр "харагдаж буй бүгдийг сонгох" toggle, hagas-сонгогдсон төлөв support.
- Sticky action bar (selection байх үед): сонгосон тоо, категори dropdown (холимог төрлийн үед хоёр бүлгээр), type-ийг bulk-аар Орлого/Зарлага болгох.
- API: `/api/transactions` PATCH аль хэдийн `{ ids: string[], category?, type? }` дэмждэг.

### 2026-05-25 — Upload UX & performance

- **Auto-redirect устгасан**: upload амжилттай дууссаны дараа автоматаар dashboard руу үсрэхгүй. Success banner-ийн "Дашбоард руу очих" товчоор хэрэглэгч зөвшөөрөл өгч хаана.
- **Concurrency 3 → 2**: parallel upload-ийн event-loop saturation бууруулахаар. Сүүлийн файлуудын latency spike арилсан.
- **Gap-warning false positive засвар**: Өмнө нь parallel upload-ийн дараа "anhaaruulga" буруу гарч байсан (бүх concurrent upload ижил "өмнөх" statement-ийг олж байсан). Шинэ `app/api/statements/gaps` endpoint бүх statement-ийг периодын дарааллаар sequential walk хийж зөв gap-уудыг буцаана. Client upload бүхэн дууссаны дараа нэг удаа дуудна.

### 2026-05-27 — Statements bulk-delete (production)

- `components/StatementsManager.tsx`-д multi-select checkbox + bulk-delete action bar production-д идэвхтэй болов (`TEST_MODE` gate-ийг арилгасан).
- `app/api/statements` DELETE handler `{ ids: string[] }` body-г дэмждэг (single `id` ч хэвээр ажиллана), tenant scope `statement.userId`-аар хамгаалсан.
- Хуулга устгахад түүний бүх гүйлгээ ч хамт устана.

### 2026-05-25 — Upload performance

- Parallel upload, parallel AI batches, `createMany` ашиглалт, server timing diagnostics.

### 2026-05-25 — Golomt банкны parser

- `lib/parsers/banks/golomt.ts` нэмэгдэж metadata extraction-тай.

### Өмнөх sprint-үүд

- 2026-05-21: Pie/bar chart-уудыг туршилт хийгээд буцаасан (UI чанарын асуудлаас). Timeline-ийн uncategorized badge, expand-state memory, save&back navigation.
- 2026-05-21: Counterparty (харьцсан данс) талбарыг database-д хадгалж, гүйлгээний жагсаалт болон бүх дэлгэцэд харуулна.
- 2026-05-20: Бүх дэмжигдсэн банкны parser-уудад metadata extract (период, нээлтийн/хаалтын үлдэгдэл) нэмэв. ХААН, Төрийн, ТДБ, Хас.
- 2026-05-20: FinMate brand identity, motion micro-interactions, multi-file upload, per-bank logo badges, monthly bank breakdown.
- 2026-05-20: Auth-ийн staleness засвар — JWT-д хадгалсан role/userType нь DB-аас үргэлж шинэхэн уншигдана. Cross-user Google account linking prevention. /sys админ login Google support.

---

## Ирээдүйн ажил

- [ ] Email verification (Resend/SendGrid)
- [ ] Password reset flow
- [ ] Per-user Anthropic API key
- [ ] `/api/auth/signup` rate limiting
- [ ] Statement archive (delete-ийн оронд)
- [ ] CSV/Excel-ээр гүйлгээ export
- [ ] Олон валют (USD, CNY) дэмжих
