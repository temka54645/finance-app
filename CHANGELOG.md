# Changelog

FinMate-ийн чухал өөрчлөлтүүд. Формат нь [Keep a Changelog](https://keepachangelog.com/)
зарчмыг баримтална. Огноо нь `YYYY-MM-DD`.

## [2026-06-24]

### Changed — Имэйл баталгаажуулалт (LINK → 6 оронтой OTP код)
- **Баталгаажуулах линкийг 6 оронтой код болгож сольсон.** Хэрэглэгч бүртгүүлмэгц
  имэйлээр ирсэн 6 оронтой кодыг апп дээрх талбарт оруулж баталгаажуулна (өмнө нь
  линк дээр дардаг байсан). Spam folder-оос линк хайхгүйгээр кодыг хуулж оруулж
  болох тул найдвартай.
- **Кодын хүчинтэй хугацаа 24 цаг → 15 минут** болсон (OTP-д тохирсон).
- **Brute-force хамгаалалт** — буруу код 5 удаа оруулбал код хүчингүй болж, шинэ код
  хүсэх шаардлагатай (`VerificationToken.attempts` багана). Кодыг `identifier+token`
  хослолоор хайдаг тул `token`-ийн global unique constraint-г хассан.
  ⚠ **Deploy: `npx prisma db push` ажиллуулж schema-г prod DB-д тусгана.**
- Файлууд: `packages/db/prisma/schema.prisma`, `apps/web/lib/mail.ts`,
  `apps/web/app/(auth)/actions.ts`, `apps/web/app/api/verify-email/route.ts`,
  `apps/web/app/verify-email/page.tsx`, `apps/web/app/(auth)/signup/page.tsx`.

### Changed — Имэйл deliverability (spam-аас сэргийлэх)
- **`mail.ts`-д plain-text хувилбар нэмсэн** (multipart/alternative) — зөвхөн HTML
  байсныг spam filter сэжиглэдэг байсныг засна.
- **`List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` header** нэмсэн —
  Gmail/Yahoo-ийн bulk-sender дүрэмд эерэгээр үнэлэгдэнэ.
- ⚠ **DNS: `_dmarc.finmate.mn` TXT record байхгүй байсан** (spam-ийн гол шалтгаан).
  Cloudflare-т нэмэх ёстой: `v=DMARC1; p=none; rua=mailto:temka21311@gmail.com;
  fo=1; adkim=r; aspf=r`. (DKIM `resend._domainkey` ба SPF `send.finmate.mn` бэлэн.)

### Added (Нэмэгдсэн)
- **FinMate brand assets** — `finmate-logo.png` (бүтэн lockup), `finmate-mark.png`
  (дугуй mark), favicon set (`icon.png` 512, `apple-icon.png` 180, `favicon.ico`).
  Хуучин `BarChart2` icon-ийг auth layout, onboarding, AppShell-д brand asset-аар
  сольсон.
- **Google OAuth-ийн ижил-имэйл мөргөлдөөн (account collision) шийдэл** —
  `apps/web/auth.ts`-ийн `signIn` callback дотор: Google-ээр нэвтрэх үед ижил
  имэйлтэй (нууц үгийн) account байгаа ч Google линкгүй бол, **зөвхөн хоёр тал ч
  имэйл эзэмшлээ нотолсон** (local `emailVerified` + Google `email_verified`) үед л
  аюулгүйгээр автоматаар линклэнэ; эс бөгөөс `OAuthAccountNotLinked`-ээр хориглож
  account takeover-оос сэргийлнэ.
- **Admin хэрэглэгч үүсгэх script** — `scripts/create-admin-user.mjs`. Шинэ admin
  үүсгэх эсвэл байгаа account-ыг `role='admin'` + `emailVerified` болгож ахиулна
  (prod `DATABASE_URL`-аар ажиллуулна).

### Changed (Өөрчлөгдсөн)
- **Login алдааны мессеж** — NextAuth-ийн `pages.error` нь `/login` руу чиглэх
  болсон тул auth-ийн бүх алдаа login хуудсан дээр бууна. Login хуудас
  `?error=<code>`-ыг ойлгомжтой монгол мессеж болгож харуулаад URL-аас цэвэрлэнэ.
- **proxy.ts matcher** — `png/jpg` зэрэг static asset-уудыг хасч тохируулсан тул
  лого/favicon зэрэг файлууд `/login` руу 307 redirect хийгдэхээ больсон.

### Infrastructure (Дэд бүтэц / Deploy)
- **`admin.finmate.mn` ажиллагаанд орлоо** — Cloudflare CNAME (`admin` →
  `zkxee9z.finmate-admin.fly.dev`, DNS-only), Fly cert (Let's Encrypt) verified,
  admin secrets (`AUTH_URL`/`NEXTAUTH_URL`/`APP_URL`) `https://admin.finmate.mn`
  руу шинэчлэгдсэн. `/login` → 200.
- **`finmate.mn` production домэйн** — apex + `www` нь Cloudflare DNS-only-оор Fly
  IP рүү, certs verified, prod secrets (`NEXTAUTH_URL`/`AUTH_URL`/`APP_URL`/
  `MAIL_FROM`) finmate.mn руу шинэчлэгдсэн.

### Known issues (Мэдэгдэж буй алдаа)
- **Хуулга оруулахад давхардал** — олон файлыг зэрэг (`CONCURRENCY = 2`) оруулахад
  dedup шүүлт race condition-д орж, давхцсан файлуудын гүйлгээ давхар ордог.
  Дахин оруулахад байгаа давхардлыг автоматаар устгадаггүй (dedup нь зөвхөн
  нэмэх үед ажилладаг). Засвар хүлээгдэж байна (Postgres advisory lock эсвэл
  `CONCURRENCY = 1`).
