# Lovable ↔ Claude Sync Workflow

Lovable нь өөрийн **тусдаа repo** үүсгэдэг (нэр: `temka54645/warm-wealth-haven`). Энэ нь манай үндсэн `temka54645/finance-app` repo-оос **бүтэц өөр** (TanStack Router + Vite + shadcn/ui), тиймээс шууд merge хийх боломжгүй.

Энэ файл нь хоёр repo-н хооронд design өөрчлөлтийг **portable хийх** workflow-г тайлбарлана.

---

## Setup (нэг удаа хийнэ)

`lovable` нэртэй git remote аль хэдийн нэмэгдсэн:

```bash
git remote -v
# lovable  https://github.com/temka54645/warm-wealth-haven.git
# origin   https://github.com/temka54645/finance-app.git
```

---

## Өдөр тутмын ажиллах flow

### Та юу хийсэн → Юу хариу болох
| Тохиолдол | Алхам |
|-----------|-------|
| **Lovable дотор chat хийсэн** (UI/styling design) | Lovable autoматаар `warm-wealth-haven/fe-design` руу commit хийнэ |
| **Шинэ design-ыг finance-app руу авах хүсэлтэй** | `npm run sync:diff` → надад "энэ commit/файлуудыг port хийе" гэж хэлээрэй |
| **Бид Claude-тай хамтран код бичих** | Шууд `finance-app` repo-руу commit (өмнөх шиг) |
| **Backend bug засах / API өөрчлөх** | Зөвхөн миний repo-руу (Lovable backend-гүй) |

### Тушаалууд

```powershell
# Lovable-аас сүүлийн commit татах
npm run sync:fetch

# Шинээр өөрчлөгдсөн файлуудыг харах
npm run sync:diff

# Lovable-н бүх UI файлуудыг жагсаах
npm run sync:files
```

---

## Mapping cheatsheet (Lovable → Next.js)

| Lovable файл | Next.js дэх байршил |
|--------------|---------------------|
| `src/routes/login.tsx` | `app/(auth)/login/page.tsx` |
| `src/routes/signup.tsx` | `app/(auth)/signup/page.tsx` |
| `src/routes/dashboard.tsx` | `app/page.tsx` |
| `src/routes/categories.tsx` | `app/categories/page.tsx` *(шинээр үүсгэх)* |
| `src/routes/__root.tsx` | `app/layout.tsx` |
| `src/styles.css` | `app/globals.css` |
| `src/components/ui/*` | `components/ui/*` *(shadcn-ээр суулгах)* |
| `src/lib/utils.ts` | `lib/utils.ts` |

### Хувиргах ерөнхий дүрмүүд

| Lovable | Next.js орлуулах |
|---------|-------------------|
| `createFileRoute("/path")` | `export default function Page()` |
| `import { Link } from "@tanstack/react-router"` | `import Link from "next/link"` |
| `<Link to="/">` | `<Link href="/">` |
| `useNavigate()` → `navigate({to:"/"})` | `useRouter()` → `router.push("/")` |
| `Route.useRouteContext()` | server props / `useSession()` |
| Hardcoded fake submit (`setTimeout`) | Бодит `loginAction`/server action |

---

## Шинээр UI компонент нэмэх (`src/components/ui/*`)

Lovable shadcn/ui ашигладаг. Энд тухайн компонент хэрэгтэй болохоор:

```powershell
npx shadcn@latest add button card dialog # гэх мэт
```

Эсвэл `npx shadcn add` дотроо `--all` гээд бүгдийг суулгаж болно. Энэ нь `components/ui/*` хавтсыг үүсгэх ба Lovable-н бичсэнтэй ижил компонент байна.

---

## Анхааруулга

- `lovable` remote-руу **ХЭЗЭЭ Ч `git push` хийх ХЭРЭГГҮЙ** — Lovable autoматаар өөрөө удирддаг
- `lovable/fe-design` branch-ыг шууд checkout хийх хэрэггүй — зөвхөн файл унших, цэгцэлж portable хийх зорилгоор
- Backend файлууд (`app/api/`, `prisma/`, `lib/db.ts`) Lovable-д огт байхгүй — тэдгээрийг зөвхөн finance-app дотор үргэлжлүүлэн ажиллана
