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
    "/sys/login",           // админ-login (тусдаа URL)
    "/api/auth",
    "/api/health",
    "/api/verify-email",    // verify-email page-аас дуудагдана
  ];
  const isPublic = publicPaths.some(
    p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );

  // Logged-in user shouldn't see login/signup pages
  if (
    isLoggedIn &&
    (pathname === "/login" || pathname === "/signup" || pathname === "/sys/login")
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated → зохих login руу шилжүүлнэ
  if (!isLoggedIn && !isPublic) {
    // /sys/* (админ) → /sys/login
    if (pathname.startsWith("/sys/") || pathname.startsWith("/api/sys/")) {
      return NextResponse.redirect(new URL("/sys/login", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // userType шалгахыг proxy-д НЭ хийнэ — JWT staleness асуудлаас болж
  // server-side page (app/page.tsx)-д шалгана. Ингэснээр PATCH /api/user-ийн
  // дараа шууд DB-аас уншиж зөв шийдвэр гаргана.

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
