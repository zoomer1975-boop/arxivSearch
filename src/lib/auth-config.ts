import type { NextAuthConfig } from 'next-auth'
import type { Role, Status } from '@/generated/prisma/enums'

export const authConfig: NextAuthConfig = {
  providers: [], // Providers are defined in auth.ts with Prisma
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role as Role
        token.status = (user as { status?: string }).status as Status
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.status = token.status as Status
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
}
