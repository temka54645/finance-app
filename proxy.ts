import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Auth.js v5: use the `auth` export as the proxy.
// It populates `req.auth` with the session.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes (no auth required)
  const publicPaths = ["/login", "/signup", "/api/auth", "/api/health"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  // Already logged-in user shouldn't see login/signup
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated user accessing protected route → /login
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
