import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes (no auth required)
  const publicPaths = ["/login", "/signup", "/api/auth", "/api/health"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  // Logged-in user shouldn't see login/signup
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated → /login
  if (!isLoggedIn && !isPublic) {
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
