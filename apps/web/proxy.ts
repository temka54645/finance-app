import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes (no auth required)
  const publicPaths = [
    "/login",
    "/signup",
    "/verify-email",        // email баталгаажуулах линк (token-аар)
    "/api/auth",
    "/api/health",
    "/api/verify-email",    // verify-email page-аас дуудагдана
  ];
  const isPublic = publicPaths.some(
    p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );

  // Logged-in user shouldn't see login/signup pages
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated → login руу шилжүүлнэ
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // userType шалгахыг proxy-д НЭ хийнэ — JWT staleness асуудлаас болж
  // server-side page (app/page.tsx)-д шалгана. Ингэснээр PATCH /api/user-ийн
  // дараа шууд DB-аас уншиж зөв шийдвэр гаргана.

  return NextResponse.next();
});

export const config = {
  // Static asset-уудыг (зураг, favicon) auth-аас гадуур үлдээнэ — эс бөгөөс
  // public/ доторх лого зэрэг png/jpg файлууд /login руу 307 redirect болно.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
