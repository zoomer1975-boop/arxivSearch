import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div>
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-7xl">
          <Link href="/" className="text-xl font-bold">
            arXiv Search
          </Link>
          <nav className="flex gap-2">
            {session && (
              <Link href="/mypage">
                <Button variant="ghost" size="sm">My Page</Button>
              </Link>
            )}
            {session?.user.role === 'ADMIN' && (
              <Link href="/admin">
                <Button variant="ghost" size="sm">Admin</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
