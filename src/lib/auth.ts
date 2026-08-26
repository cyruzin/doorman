import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

// Limite de tentativas em memória por username (sem Redis — processo único).
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(username: string): boolean {
  const entry = loginAttempts.get(username);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(username);
    return false;
  }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function registerFailedAttempt(username: string): void {
  const entry = loginAttempts.get(username);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(username, { count: 1, resetAt: Date.now() + LOGIN_ATTEMPTS_WINDOW_MS });
  } else {
    entry.count++;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // Sem domínio fixo (roda no IP/LAN da máquina) — confia no Host header.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;
        if (isRateLimited(username)) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          registerFailedAttempt(username);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          registerFailedAttempt(username);
          return null;
        }

        loginAttempts.delete(username);
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.id = user.id as string;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
