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

      return { id: user.id, email: user.email, name: user.name, userType: user.userType };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
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
      // Шинэ login → user-аас id+userType-ыг token-руу хадгална
      if (user) {
        token.id = user.id;
        token.userType = (user as { userType?: string | null }).userType ?? null;
      }
      // session update үед (онбординг дараа г.м) DB-аас дахин уншина
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { userType: true },
        });
        token.userType = u?.userType ?? null;
      }
      // Хуучин JWT-д userType дутуу бол DB-аас нэг удаа сэргээх
      if (token.id && token.userType === undefined) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { userType: true },
        });
        token.userType = u?.userType ?? null;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as { userType?: string | null }).userType = (token.userType as string | null) ?? null;
      }
      return session;
    },
  },
});
