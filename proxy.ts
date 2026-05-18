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

  // Logged in but userType not set → /onboarding
  // (онцгой: /onboarding, /api/user, /api/auth, /api/health-ийг алгасна)
  if (
    isLoggedIn &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/user") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/health") &&
    !pathname.startsWith("/_next")
  ) {
    // Session-аас шууд авах боломжгүй (jwt-д userType байхгүй), тиймээс fetch шаардлагатай.
    // Гэхдээ proxy.ts нь Edge runtime-д ажиллаж байгаа тул Prisma шууд дуудах боломжгүй.
    // Шийдэл: jwt callback-д userType-ыг session-руу нэмж дамжуулах (доорх auth.ts засвар).
    const userType = (req.auth?.user as { userType?: string | null } | undefined)?.userType;
    if (!userType) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
