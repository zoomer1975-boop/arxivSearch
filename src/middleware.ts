import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const isApproved = session?.user?.status === 'APPROVED'
  const isAdmin = session?.user?.role === 'ADMIN'

  const isAuthPage =
    nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
  const isAdminPage = nextUrl.pathname.startsWith('/admin')
  const isPendingPage = nextUrl.pathname === '/pending'
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthPage || isApiAuth

  if (isPublic) return NextResponse.next()

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAdminPage && !isAdmin) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  if (!isApproved && !isPendingPage) {
    return NextResponse.redirect(new URL('/pending', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
