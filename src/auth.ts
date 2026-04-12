import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

const ADMIN_IDS = (process.env.ADMIN_GITHUB_IDS ?? "").split(",").filter(Boolean)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      // Always re-evaluate admin status from env (not cached in JWT)
      if (token.id) {
        token.isAdmin = ADMIN_IDS.includes(token.id as string)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = (token.isAdmin as boolean) ?? false
      }
      return session
    },
  },
})
