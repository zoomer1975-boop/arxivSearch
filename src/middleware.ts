import NextAuth from 'next-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Import only the config, not the full auth with Prisma
import { authConfig } from '@/lib/auth-config'

const { auth } = NextAuth(authConfig)

export default auth((req: NextRequest & { auth: { user?: { status?: string; role?: string } } | null }) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const isApproved = session?.user?.status === 'APPROVED'
  const isAdmin = session?.user?.role === 'ADMIN'

  const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
  const isAdminPage = nextUrl.pathname.startsWith('/admin')
  const isPendingPage = nextUrl.pathname === '/pending'
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthPage || isApiAuth

  if (isPublic) return NextResponse.next()
  if (!isLoggedIn) return NextResponse.redirect(new URL('/login', nextUrl))
  if (isAdminPage && !isAdmin) return NextResponse.redirect(new URL('/', nextUrl))
  if (!isApproved && !isPendingPage) return NextResponse.redirect(new URL('/pending', nextUrl))
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
