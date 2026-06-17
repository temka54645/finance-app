import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Adapter } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";

// ── Админ app-ийн NextAuth instance ────────────────────────────────
// Public web app-аас ТУСДАА: өөр домэйн → өөр cookie → өөр session,
// өөрийн AUTH_SECRET. authorize дотор `role === "admin"`-ийг заавал
// шаардаж, админ биш хэрэглэгчийг session огт авахаас сэргийлнэ
// (route guard дээр нэмэлт давхар хамгаалалт байгаа — defense in depth).

const credentialsSchema = z.object({
  email: z.string().email("Имэйл хаяг буруу"),
  password: z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
});

const providers: Provider[] = [
  Credentials({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (raw) => {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user?.hashedPassword) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.hashedPassword);
      if (!ok) return null;

      if (!user.emailVerified) throw new Error("EmailNotVerified");

      // Админ app — зөвхөн admin role нэвтэрнэ.
      if (user.role !== "admin") return null;

      return { id: user.id, email: user.email, name: user.name, userType: user.userType, role: user.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = user.id;
        token.userType = (user as { userType?: string | null }).userType ?? null;
        token.role = (user as { role?: string | null }).role ?? "user";
      }
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { userType: true, role: true },
        });
        token.userType = u?.userType ?? null;
        token.role = u?.role ?? "user";
      }
      if (token.id && (token.userType === undefined || token.role === undefined)) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { userType: true, role: true },
        });
        token.userType = u?.userType ?? null;
        token.role = u?.role ?? "user";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // role-ийг DB-ээс үргэлж шинэхэн уншина — stale JWT-ээс сэргийлнэ.
        try {
          const u = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { userType: true, role: true },
          });
          (session.user as { userType?: string | null }).userType = u?.userType ?? null;
          (session.user as { role?: string | null }).role = u?.role ?? "user";
        } catch {
          (session.user as { userType?: string | null }).userType = (token.userType as string | null) ?? null;
          (session.user as { role?: string | null }).role = (token.role as string | null) ?? "user";
        }
      }
      return session;
    },
  },
});
