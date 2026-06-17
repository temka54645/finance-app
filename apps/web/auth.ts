import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Adapter } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";

const credentialsSchema = z.object({
  email: z.string().email("Имэйл хаяг буруу"),
  password: z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
});

// Google OAuth тохиргоо нь зөвхөн env vars байх үед идэвхждэг
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

      // Email баталгаажуулаагүй бол нэвтэрч чадахгүй
      if (!user.emailVerified) {
        // NextAuth-ийн алдааг URL дээр `error=EmailNotVerified` болгож харуулна
        throw new Error("EmailNotVerified");
      }

      return { id: user.id, email: user.email, name: user.name, userType: user.userType, role: user.role };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // ⚠ Энэ flag-ийг false-д тавьсан — өмнө нь enabled үед нэг session
      // дотроос дараагийн Google account-ыг ялгаатай email-тэй ч гэсэн
      // одоогийн хэрэглэгчрүү буруугаар link хийдэг алдаа байсан.
      // Зөвхөн email яг таарвал линкждэг (NextAuth default).
      allowDangerousEmailAccountLinking: false,
      // Account picker-ийг үргэлж харуулна — auto-pick хийхгүй
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      // Шинэ login → user-аас id+userType+role-г token-руу хадгална
      if (user) {
        token.id = user.id;
        token.userType = (user as { userType?: string | null }).userType ?? null;
        token.role = (user as { role?: string | null }).role ?? "user";
      }
      // session update үед DB-ээс дахин уншина
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { userType: true, role: true },
        });
        token.userType = u?.userType ?? null;
        token.role = u?.role ?? "user";
      }
      // Хуучин JWT-д userType эсвэл role дутуу бол DB-аас сэргээх
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
        // userType / role нь DB-д өөрчлөгдсөн ч JWT cookie-д хуучин утгатай үлдэх
        // асуудлаас сэргийлэх — session callback дотор DB-ээс үргэлж шинэхэн уншина.
        // Энэ нь session фэтч бүрт нэг индекстэй lookup нэмнэ, гэхдээ
        // userType-аас хамаарсан category list зэрэг UI зөв ажиллах баталгаа болно.
        let u: { userType: string | null; role: string } | null;
        try {
          u = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { userType: true, role: true },
          });
        } catch {
          // DB алдаа гарвал JWT-ийн утгад буцна (degraded mode) — хэрэглэгчийг
          // түр зуурын DB саатлаас болж гаргахгүй.
          session.user.id = token.id as string;
          (session.user as { userType?: string | null }).userType = (token.userType as string | null) ?? null;
          (session.user as { role?: string | null }).role = (token.role as string | null) ?? "user";
          return session;
        }

        if (!u) {
          // Хэрэглэгчийн row DB-д байхгүй (жишээ нь account устгаад дахин үүсгэсэн).
          // Энэ JWT нь "сүнс" session — id-г өгөхгүй орхиж session-ийг хүчингүй
          // болгоно. Ингэснээр requireUserId() 401 өгч, route guard /login руу
          // зөв чиглүүлнэ (хуучин id-аар prisma.update хийж P2025/500 гарахаас сэргийлнэ).
          return session;
        }

        session.user.id = token.id as string;
        (session.user as { userType?: string | null }).userType = u.userType ?? null;
        (session.user as { role?: string | null }).role = u.role ?? "user";
      }
      return session;
    },
  },
});
