# Changelog

FinMate-ийн чухал өөрчлөлтүүд. Формат нь [Keep a Changelog](https://keepachangelog.com/)
зарчмыг баримтална. Огноо нь `YYYY-MM-DD`.

## [2026-06-24]

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
