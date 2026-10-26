import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "user"; name?: string | null; email?: string | null; image?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.select().from(users).where(eq(users.email, user.email));
      const now = new Date();
      if (existing[0]) {
        await db.update(users).set({ name: user.name ?? existing[0].name, image: user.image ?? existing[0].image, updatedAt: now }).where(eq(users.email, user.email));
      } else {
        const allUsers = await db.select({ id: users.id }).from(users);
        await db.insert(users).values({ email: user.email, name: user.name, image: user.image, role: allUsers.length === 0 ? "admin" : "user", createdAt: now, updatedAt: now });
      }
      return true;
    },
    async jwt({ token }) {
      const enrichedToken = token as typeof token & { userId?: string; role?: "admin" | "user" };
      if (token.email) {
        const saved = await db.select().from(users).where(eq(users.email, token.email));
        if (saved[0]) {
          enrichedToken.userId = String(saved[0].id);
          enrichedToken.role = saved[0].role;
        }
      }
      return enrichedToken;
    },
    async session({ session, token }) {
      const enrichedToken = token as typeof token & { userId?: string; role?: "admin" | "user" };
      session.user.id = enrichedToken.userId ?? enrichedToken.sub ?? "";
      session.user.role = enrichedToken.role ?? "user";
      return session;
    },
  },
});
