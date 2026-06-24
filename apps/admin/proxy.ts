import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Админ app — бүх route нэвтрэлт шаардана (login, auth, health-ээс бусад).
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ["/login", "/api/auth", "/api/health"];
  const isPublic = publicPaths.some(
    p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );

  // Нэвтэрсэн хэрэглэгч login хуудас харах шаардлагагүй
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Нэвтрээгүй → login руу
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Static asset-уудыг (зураг, favicon) auth-аас гадуур үлдээнэ — эс бөгөөс
  // public/ доторх лого зэрэг png/jpg файлууд /login руу 307 redirect болно.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
