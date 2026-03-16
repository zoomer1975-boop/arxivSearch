# Arxiv Search Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack web application for arXiv paper search, AI summarization/translation, and personalized notifications via Telegram/email.

**Architecture:** Next.js 14 App Router with TypeScript, PostgreSQL via Prisma ORM, NextAuth.js v5 for auth with admin-approval flow, Claude API for AI summaries, node-cron for scheduled paper detection and alerts.

**Tech Stack:** Next.js 14, TypeScript 5 (strict), Tailwind CSS, shadcn/ui, PostgreSQL 16, Prisma ORM, NextAuth.js v5, TanStack Query v5, Zustand, Anthropic Claude API, node-telegram-bot-api, Nodemailer, node-cron, Zod, Vitest, Docker

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via npx create-next-app)
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env.local`

**Step 1: Initialize Next.js project**

```bash
cd C:/dev/vibe/arxiv
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Next.js project created in current directory.

**Step 2: Install dependencies**

```bash
npm install @prisma/client prisma @auth/prisma-adapter next-auth@beta \
  @tanstack/react-query zustand zod \
  @anthropic-ai/sdk node-telegram-bot-api nodemailer node-cron \
  fast-xml-parser date-fns dompurify \
  @types/nodemailer @types/node-telegram-bot-api @types/dompurify \
  isomorphic-dompurify

npm install -D @types/node-cron vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Zinc base color, CSS variables yes
```

**Step 4: Install key shadcn components**

```bash
npx shadcn@latest add button input card badge skeleton dialog tabs select checkbox label toast
```

**Step 5: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: arxiv_user
      POSTGRES_PASSWORD: arxiv_pass
      POSTGRES_DB: arxiv_search
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Step 6: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://arxiv_user:arxiv_pass@localhost:5432/arxiv_search

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-xxxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@arxiv-search.com

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=your-cron-secret-min-32-chars
```

**Step 7: Create .env.local** (copy from .env.example and fill in real values for dev)

**Step 8: Start DB**

```bash
docker-compose up -d
```

Expected: PostgreSQL running on port 5432.

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: initial Next.js project scaffold with Docker"
```

---

## Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`

**Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

**Step 2: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum Status {
  PENDING
  APPROVED
  REJECTED
}

enum AlertMethod {
  EMAIL
  TELEGRAM
  BOTH
}

model User {
  id             String      @id @default(cuid())
  name           String
  email          String      @unique
  password       String
  institution    String?
  role           Role        @default(USER)
  status         Status      @default(PENDING)
  telegramChatId String?
  alertMethod    AlertMethod @default(EMAIL)
  alertTime      String      @default("09:00") // HH:mm format
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  keywords      UserKeyword[]
  categories    UserCategory[]
  watchedPapers WatchedPaper[]
}

model UserCategory {
  id       String @id @default(cuid())
  userId   String
  category String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category])
}

model UserKeyword {
  id      String @id @default(cuid())
  userId  String
  keyword String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, keyword])
}

model WatchedPaper {
  id              String   @id @default(cuid())
  userId          String
  arxivId         String
  title           String
  matchedKeywords String   // JSON array
  matchedCategory String
  isRead          Boolean  @default(false)
  notifiedAt      DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, arxivId])
  @@index([userId, isRead])
}

model PaperCache {
  id                 String   @id @default(cuid())
  arxivId            String   @unique
  title              String
  authors            String   // JSON stringified array
  abstract           String   @db.Text
  htmlContent        String?  @db.Text
  summary            String?  @db.Text
  summaryKo          String?  @db.Text
  translatedSections String?  @db.Text // JSON: section id -> translated text
  references         String?  @db.Text // JSON: parsed references
  fetchedAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model CronLog {
  id          String   @id @default(cuid())
  executedAt  DateTime @default(now())
  queriesRun  Int
  papersFound Int
  alertsSent  Int
  errors      String?  @db.Text
  status      String   // SUCCESS, PARTIAL, FAILED
}
```

**Step 3: Write prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@arxiv-search.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@arxiv-search.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'APPROVED',
    },
  })

  console.log('Seeded admin:', admin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to package.json scripts:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

**Step 4: Create src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 5: Install bcryptjs**

```bash
npm install bcryptjs @types/bcryptjs ts-node
```

**Step 6: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration files created, DB tables created.

**Step 7: Run seed**

```bash
npx prisma db seed
```

Expected: Admin user seeded.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all models and seed admin user"
```

---

## Task 3: Auth System (NextAuth v5)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/types/next-auth.d.ts`

**Step 1: Write src/types/next-auth.d.ts**

```typescript
import { Role, Status } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      status: Status
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: Role
    status: Status
  }
}
```

**Step 2: Write src/lib/auth.ts**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as 'USER' | 'ADMIN'
      session.user.status = token.status as 'PENDING' | 'APPROVED' | 'REJECTED'
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
```

**Step 3: Write src/app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

**Step 4: Write src/middleware.ts**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session
  const isApproved = session?.user?.status === 'APPROVED'
  const isAdmin = session?.user?.role === 'ADMIN'

  const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
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
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth v5 with JWT strategy and role-based middleware"
```

---

## Task 4: Auth Pages (Register, Login, Pending)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/pending/page.tsx`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/(auth)/layout.tsx`

**Step 1: Create register API route — src/app/api/auth/register/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/, 'Password must contain letters, numbers, and special characters'),
  institution: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        institution: data.institution,
      },
    })

    return NextResponse.json({ message: 'Registration successful. Awaiting admin approval.' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Create auth layout — src/app/(auth)/layout.tsx**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
```

**Step 3: Create login page — src/app/(auth)/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Access arXiv Search</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Step 4: Create register page — src/app/(auth)/register/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/login?registered=true')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up for arXiv Search (requires admin approval)</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <p className="text-xs text-gray-500">Min 8 chars, must include letters, numbers, and special characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution">Institution (optional)</Label>
            <Input id="institution" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Step 5: Create pending page — src/app/pending/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PendingPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.status === 'APPROVED') redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle>Awaiting Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Your account is pending admin approval. You will be notified once approved.
          </p>
          {session.user.status === 'REJECTED' && (
            <p className="mt-2 text-red-600">
              Your registration has been rejected. Please contact the administrator.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth pages (login, register, pending) and register API"
```

---

## Task 5: Admin Dashboard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/components/admin/user-approval-table.tsx`

**Step 1: Create admin users API — src/app/api/admin/users/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, institution: true, status: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

const updateSchema = z.object({
  userId: z.string(),
  status: z.enum(['APPROVED', 'REJECTED']),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, status } = updateSchema.parse(body)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  })

  return NextResponse.json(user)
}
```

**Step 2: Create user-approval-table component — src/components/admin/user-approval-table.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type User = {
  id: string
  name: string
  email: string
  institution: string | null
  status: string
  role: string
  createdAt: string
}

export function UserApprovalTable({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
    setLoading(userId)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    })

    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
    }
    setLoading(null)
  }

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Email</th>
            <th className="py-2 text-left">Institution</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-left">Joined</th>
            <th className="py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{user.name}</td>
              <td className="py-2">{user.email}</td>
              <td className="py-2">{user.institution ?? '-'}</td>
              <td className="py-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[user.status]}`}>
                  {user.status}
                </span>
              </td>
              <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="py-2 space-x-2">
                {user.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(user.id, 'APPROVED')} disabled={loading === user.id}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(user.id, 'REJECTED')} disabled={loading === user.id}>
                      Reject
                    </Button>
                  </>
                )}
                {user.status !== 'PENDING' && (
                  <span className="text-gray-400 text-xs">No actions</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 3: Create admin page — src/app/admin/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserApprovalTable } from '@/components/admin/user-approval-table'

export default async function AdminPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, institution: true, status: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">User Management</h2>
        <UserApprovalTable initialUsers={serialized} />
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard with user approval/rejection"
```

---

## Task 6: arXiv API Client & Types

**Files:**
- Create: `src/types/paper.ts`
- Create: `src/lib/arxiv-api.ts`

**Step 1: Create types — src/types/paper.ts**

```typescript
export interface PaperSummary {
  arxivId: string
  title: string
  authors: string[]
  abstract: string
  primaryCategory: string
  categories: string[]
  published: string
  updated: string
  htmlUrl: string
  pdfUrl: string
}

export interface SearchResponse {
  papers: PaperSummary[]
  totalResults: number
  startIndex: number
  itemsPerPage: number
}

export interface Reference {
  text: string
  arxivId?: string
  doi?: string
  arxivUrl?: string
}
```

**Step 2: Create arxiv client — src/lib/arxiv-api.ts**

```typescript
import { XMLParser } from 'fast-xml-parser'
import type { PaperSummary, SearchResponse } from '@/types/paper'

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query'
const REQUEST_INTERVAL = 3000

let lastRequestTime = 0

async function throttle() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL - elapsed))
  }
  lastRequestTime = Date.now()
}

function extractArxivId(id: string): string {
  const match = id.match(/abs\/(.+)$/)
  return match ? match[1] : id
}

function parseEntry(entry: Record<string, unknown>): PaperSummary {
  const id = extractArxivId(entry.id as string)
  const authors = Array.isArray(entry.author)
    ? (entry.author as Array<{ name: string }>).map(a => a.name)
    : [(entry.author as { name: string })?.name ?? 'Unknown']

  const categories = Array.isArray(entry.category)
    ? (entry.category as Array<{ '@_term': string }>).map(c => c['@_term'])
    : [(entry.category as { '@_term': string })?.['@_term'] ?? '']

  return {
    arxivId: id,
    title: (entry.title as string).replace(/\s+/g, ' ').trim(),
    authors,
    abstract: (entry.summary as string).replace(/\s+/g, ' ').trim(),
    primaryCategory: (entry['arxiv:primary_category'] as { '@_term': string })?.['@_term'] ?? categories[0],
    categories,
    published: entry.published as string,
    updated: entry.updated as string,
    htmlUrl: `https://ar5iv.labs.arxiv.org/html/${id}`,
    pdfUrl: `https://arxiv.org/pdf/${id}`,
  }
}

export async function searchArxiv(params: {
  query: string
  category?: string
  start?: number
  maxResults?: number
  sortBy?: 'relevance' | 'submittedDate'
}): Promise<SearchResponse> {
  await throttle()

  const searchQuery = params.category
    ? `cat:${params.category} AND all:${params.query}`
    : params.query
      ? `all:${params.query}`
      : 'all:*'

  const url = new URL(ARXIV_API_BASE)
  url.searchParams.set('search_query', searchQuery)
  url.searchParams.set('start', String(params.start ?? 0))
  url.searchParams.set('max_results', String(params.maxResults ?? 20))
  url.searchParams.set('sortBy', params.sortBy ?? 'submittedDate')
  url.searchParams.set('sortOrder', 'descending')

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`arXiv API error: ${response.status}`)

  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const feed = parsed.feed

  const entries = feed.entry
    ? Array.isArray(feed.entry) ? feed.entry : [feed.entry]
    : []

  return {
    papers: entries.map(parseEntry),
    totalResults: parseInt(feed['opensearch:totalResults'] ?? '0', 10),
    startIndex: parseInt(feed['opensearch:startIndex'] ?? '0', 10),
    itemsPerPage: parseInt(feed['opensearch:itemsPerPage'] ?? '0', 10),
  }
}

export async function fetchArxivById(arxivId: string): Promise<PaperSummary | null> {
  await throttle()

  const url = new URL(ARXIV_API_BASE)
  url.searchParams.set('id_list', arxivId)

  const response = await fetch(url.toString())
  if (!response.ok) return null

  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const entry = parsed.feed.entry

  if (!entry) return null
  return parseEntry(Array.isArray(entry) ? entry[0] : entry)
}
```

**Step 3: Write unit test — src/lib/__tests__/arxiv-api.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { searchArxiv } from '../arxiv-api'

describe('searchArxiv', () => {
  it('returns papers array for valid query', async () => {
    const result = await searchArxiv({ query: 'transformer', maxResults: 3 })
    expect(result.papers).toBeInstanceOf(Array)
    expect(result.papers.length).toBeGreaterThan(0)
    expect(result.papers[0]).toHaveProperty('arxivId')
    expect(result.papers[0]).toHaveProperty('title')
  }, 15000)
})
```

**Step 4: Setup vitest config — vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to package.json scripts:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

**Step 5: Run test**

```bash
npm test -- src/lib/__tests__/arxiv-api.test.ts
```

Expected: PASS (requires internet)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add arXiv API client with rate limiting and types"
```

---

## Task 7: Search API Route & Main Page

**Files:**
- Create: `src/app/api/papers/search/route.ts`
- Create: `src/components/search/paper-card.tsx`
- Create: `src/components/search/paper-gallery.tsx`
- Create: `src/components/search/search-bar.tsx`
- Create: `src/app/(main)/page.tsx`
- Create: `src/app/(main)/layout.tsx`

**Step 1: Create search API — src/app/api/papers/search/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchArxiv } from '@/lib/arxiv-api'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const sort = (searchParams.get('sort') ?? 'submittedDate') as 'relevance' | 'submittedDate'
  const maxResults = 20
  const start = (page - 1) * maxResults

  try {
    const result = await searchArxiv({
      query: q,
      category: cat || undefined,
      start,
      maxResults,
      sortBy: sort,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
```

**Step 2: Create paper card — src/components/search/paper-card.tsx**

```typescript
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaperSummary } from '@/types/paper'
import { formatDistanceToNow } from 'date-fns'

interface PaperCardProps {
  paper: PaperSummary
}

export function PaperCard({ paper }: PaperCardProps) {
  const authorsDisplay = paper.authors.length > 3
    ? `${paper.authors.slice(0, 3).join(', ')} +${paper.authors.length - 3} more`
    : paper.authors.join(', ')

  return (
    <Link href={`/paper/${paper.arxivId}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <Badge variant="outline" className="w-fit text-xs mb-2">
            {paper.primaryCategory}
          </Badge>
          <CardTitle className="text-sm font-semibold line-clamp-2 leading-snug">
            {paper.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-500">{authorsDisplay}</p>
          <p className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(paper.published), { addSuffix: true })}
          </p>
          <p className="text-xs text-gray-600 line-clamp-3">{paper.abstract}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 3: Create search bar — src/components/search/search-bar.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'cs.AI', label: 'CS - AI' },
  { value: 'cs.LG', label: 'CS - Machine Learning' },
  { value: 'cs.CL', label: 'CS - Computation & Language' },
  { value: 'cs.CV', label: 'CS - Computer Vision' },
  { value: 'math.CO', label: 'Math - Combinatorics' },
  { value: 'physics', label: 'Physics' },
  { value: 'stat.ML', label: 'Stats - Machine Learning' },
  { value: 'q-bio', label: 'Quantitative Biology' },
  { value: 'econ', label: 'Economics' },
]

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('cat') ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('cat', category)
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search papers..."
        className="flex-1 min-w-48"
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Search</Button>
    </form>
  )
}
```

**Step 4: Create paper gallery — src/components/search/paper-gallery.tsx**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { PaperCard } from './paper-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { SearchResponse } from '@/types/paper'

async function fetchPapers(q: string, cat: string, page: number): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, cat, page: String(page) })
  const res = await fetch(`/api/papers/search?${params}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export function PaperGallery() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? ''
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['papers', q, cat, page],
    queryFn: () => fetchPapers(q, cat, page),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-red-500 text-center py-8">Failed to load papers. Please try again.</p>
  }

  if (!data?.papers.length) {
    return <p className="text-gray-500 text-center py-8">No papers found.</p>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{data.totalResults.toLocaleString()} results</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.papers.map(paper => (
          <PaperCard key={paper.arxivId} paper={paper} />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </Button>
        <span className="py-2 px-4 text-sm">Page {page}</span>
        <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={data.papers.length < 20}>
          Next
        </Button>
      </div>
    </div>
  )
}
```

**Step 5: Create main layout with TanStack Query provider — src/app/(main)/layout.tsx**

First create the QueryProvider — `src/components/query-provider.tsx`:
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Update `src/app/layout.tsx` to wrap with QueryProvider:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'arXiv Search',
  description: 'Search and summarize arXiv papers with AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
```

**Step 6: Create main page — src/app/(main)/page.tsx**

```typescript
import { Suspense } from 'react'
import { SearchBar } from '@/components/search/search-bar'
import { PaperGallery } from '@/components/search/paper-gallery'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">arXiv Search</h1>
        <nav className="flex gap-2">
          <Link href="/mypage"><Button variant="outline" size="sm">My Page</Button></Link>
          {session?.user.role === 'ADMIN' && (
            <Link href="/admin"><Button variant="outline" size="sm">Admin</Button></Link>
          )}
        </nav>
      </header>
      <div className="mb-6">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <PaperGallery />
      </Suspense>
    </div>
  )
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add paper search API, gallery, and main page"
```

---

## Task 8: Paper Detail Page - HTML Fetch & Render

**Files:**
- Create: `src/lib/html-parser.ts`
- Create: `src/app/api/papers/[arxivId]/route.ts`
- Create: `src/app/(main)/paper/[arxivId]/page.tsx`
- Create: `src/components/paper/paper-detail.tsx`

**Step 1: Create HTML parser — src/lib/html-parser.ts**

```typescript
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'strong', 'em', 'a', 'img', 'table', 'thead', 'tbody',
      'tr', 'td', 'th', 'div', 'span', 'section', 'article',
      'figure', 'figcaption', 'sup', 'sub', 'math',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  })
}

export function extractReferences(html: string): Array<{ text: string; arxivId?: string; doi?: string }> {
  const ARXIV_PATTERN = /arxiv[:\s]*(\d{4}\.\d{4,5})/gi
  const DOI_PATTERN = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi

  // Find references section
  const refMatch = html.match(/<[^>]*id="[^"]*ref[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/i)
  if (!refMatch) return []

  const items: Array<{ text: string; arxivId?: string; doi?: string }> = []
  const listItems = refMatch[0].match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? []

  for (const item of listItems) {
    const text = item.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const arxivMatch = ARXIV_PATTERN.exec(text)
    const doiMatch = DOI_PATTERN.exec(text)

    items.push({
      text,
      arxivId: arxivMatch?.[1],
      doi: doiMatch?.[0],
    })

    ARXIV_PATTERN.lastIndex = 0
    DOI_PATTERN.lastIndex = 0
  }

  return items
}
```

**Step 2: Create paper API route — src/app/api/papers/[arxivId]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchArxivById } from '@/lib/arxiv-api'
import { sanitizeHtml } from '@/lib/html-parser'

export async function GET(req: NextRequest, { params }: { params: { arxivId: string } }) {
  const { arxivId } = params

  // Check cache first
  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (cached && cached.htmlContent) {
    return NextResponse.json(cached)
  }

  // Fetch from arXiv
  const paper = await fetchArxivById(arxivId)
  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Try to fetch HTML from ar5iv
  let htmlContent: string | null = null
  try {
    const htmlRes = await fetch(`https://ar5iv.labs.arxiv.org/html/${arxivId}`, {
      headers: { 'User-Agent': 'ArxivSearch/1.0' },
    })
    if (htmlRes.ok) {
      const rawHtml = await htmlRes.text()
      htmlContent = sanitizeHtml(rawHtml)
    }
  } catch {
    console.warn(`Could not fetch HTML for ${arxivId}`)
  }

  // Upsert cache
  const cacheData = {
    arxivId,
    title: paper.title,
    authors: JSON.stringify(paper.authors),
    abstract: paper.abstract,
    htmlContent,
  }

  const result = await prisma.paperCache.upsert({
    where: { arxivId },
    update: cacheData,
    create: cacheData,
  })

  return NextResponse.json(result)
}
```

**Step 3: Create paper detail component — src/components/paper/paper-detail.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PaperSummary } from '@/types/paper'
import { AiSummary } from './ai-summary'
import { TranslationView } from './translation-view'
import { ReferencesSection } from './references-section'

interface PaperDetailProps {
  arxivId: string
  paper: PaperSummary
  htmlContent: string | null
}

type View = 'original' | 'translation' | 'summary'

export function PaperDetail({ arxivId, paper, htmlContent }: PaperDetailProps) {
  const [view, setView] = useState<View>('original')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {paper.categories.map(c => (
            <Badge key={c} variant="outline">{c}</Badge>
          ))}
        </div>
        <h1 className="text-2xl font-bold mb-3">{paper.title}</h1>
        <p className="text-gray-600 mb-2">{paper.authors.join(', ')}</p>
        <p className="text-sm text-gray-400 mb-4">
          Published: {new Date(paper.published).toLocaleDateString()} |
          Updated: {new Date(paper.updated).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">PDF</Button>
          </a>
          <a href={`https://arxiv.org/abs/${arxivId}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">arXiv</Button>
          </a>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        <Button variant={view === 'original' ? 'default' : 'outline'} onClick={() => setView('original')}>
          Original
        </Button>
        <Button variant={view === 'translation' ? 'default' : 'outline'} onClick={() => setView('translation')}>
          Korean Translation
        </Button>
        <Button variant={view === 'summary' ? 'default' : 'outline'} onClick={() => setView('summary')}>
          AI Summary
        </Button>
      </div>

      {/* Content */}
      {view === 'original' && (
        <div>
          {htmlContent ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Abstract</h3>
              <p className="text-gray-700">{paper.abstract}</p>
              <p className="mt-4 text-sm text-gray-500">HTML version not available. <a href={paper.pdfUrl} className="text-blue-600 underline">View PDF</a></p>
            </div>
          )}
        </div>
      )}
      {view === 'translation' && <TranslationView arxivId={arxivId} htmlContent={htmlContent} abstract={paper.abstract} />}
      {view === 'summary' && <AiSummary arxivId={arxivId} abstract={paper.abstract} />}

      {/* References */}
      <ReferencesSection arxivId={arxivId} htmlContent={htmlContent} />
    </div>
  )
}
```

**Step 4: Create detail page — src/app/(main)/paper/[arxivId]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchArxivById } from '@/lib/arxiv-api'
import { sanitizeHtml } from '@/lib/html-parser'
import { PaperDetail } from '@/components/paper/paper-detail'
import type { PaperSummary } from '@/types/paper'

async function getPaper(arxivId: string) {
  let cached = await prisma.paperCache.findUnique({ where: { arxivId } })

  if (!cached) {
    const paper = await fetchArxivById(arxivId)
    if (!paper) return null

    let htmlContent: string | null = null
    try {
      const htmlRes = await fetch(`https://ar5iv.labs.arxiv.org/html/${arxivId}`)
      if (htmlRes.ok) {
        htmlContent = sanitizeHtml(await htmlRes.text())
      }
    } catch {}

    cached = await prisma.paperCache.create({
      data: {
        arxivId,
        title: paper.title,
        authors: JSON.stringify(paper.authors),
        abstract: paper.abstract,
        htmlContent,
      },
    })
  }

  const authors = JSON.parse(cached.authors) as string[]
  const paper: PaperSummary = {
    arxivId,
    title: cached.title,
    authors,
    abstract: cached.abstract,
    primaryCategory: '',
    categories: [],
    published: '',
    updated: '',
    htmlUrl: `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
  }

  return { paper, htmlContent: cached.htmlContent ?? null }
}

export default async function PaperPage({ params }: { params: { arxivId: string } }) {
  const data = await getPaper(params.arxivId)
  if (!data) notFound()

  return <PaperDetail arxivId={params.arxivId} paper={data.paper} htmlContent={data.htmlContent} />
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add paper detail page with ar5iv HTML rendering"
```

---

## Task 9: AI Summary & Translation

**Files:**
- Create: `src/lib/claude-api.ts`
- Create: `src/app/api/papers/[arxivId]/summary/route.ts`
- Create: `src/app/api/papers/[arxivId]/translate/route.ts`
- Create: `src/components/paper/ai-summary.tsx`
- Create: `src/components/paper/translation-view.tsx`

**Step 1: Create Claude API client — src/lib/claude-api.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function summarizePaper(abstract: string, title: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are a research paper summarizer. Provide a structured summary with:
1. Main Research Question / Objective
2. Methodology
3. Key Findings / Results
4. Significance / Contributions
5. Limitations (if mentioned)
Keep each section to 2-3 sentences. Be precise and technical.`,
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\nAbstract: ${abstract}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function translateToKorean(text: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: 'You are a scientific paper translator. Translate the given English text to Korean accurately, preserving technical terms where appropriate (show original English term in parentheses for key technical terms).',
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function translateSections(
  sections: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; translated: string }>> {
  const results: Array<{ id: string; translated: string }> = []

  // Process in batches of 3 sections
  for (let i = 0; i < sections.length; i += 3) {
    const batch = sections.slice(i, i + 3)
    const translations = await Promise.all(
      batch.map(async s => ({
        id: s.id,
        translated: await translateToKorean(s.text),
      }))
    )
    results.push(...translations)
  }

  return results
}
```

**Step 2: Create summary API route — src/app/api/papers/[arxivId]/summary/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { summarizePaper } from '@/lib/claude-api'

export async function GET(req: NextRequest, { params }: { params: { arxivId: string } }) {
  const { arxivId } = params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (cached?.summary) {
    return NextResponse.json({ summary: cached.summary, cached: true })
  }

  if (!cached) {
    return NextResponse.json({ error: 'Paper not found in cache' }, { status: 404 })
  }

  try {
    const summary = await summarizePaper(cached.abstract, cached.title)

    await prisma.paperCache.update({
      where: { arxivId },
      data: { summary },
    })

    return NextResponse.json({ summary, cached: false })
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
```

**Step 3: Create translate API route — src/app/api/papers/[arxivId]/translate/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { translateToKorean } from '@/lib/claude-api'

export async function GET(req: NextRequest, { params }: { params: { arxivId: string } }) {
  const { arxivId } = params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (cached?.summaryKo) {
    return NextResponse.json({ translation: cached.summaryKo, cached: true })
  }

  if (!cached) {
    return NextResponse.json({ error: 'Paper not found in cache' }, { status: 404 })
  }

  try {
    const sourceText = cached.abstract
    const translation = await translateToKorean(sourceText)

    await prisma.paperCache.update({
      where: { arxivId },
      data: { summaryKo: translation },
    })

    return NextResponse.json({ translation, cached: false })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 })
  }
}
```

**Step 4: Create AI summary component — src/components/paper/ai-summary.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function AiSummary({ arxivId, abstract }: { arxivId: string; abstract: string }) {
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/summary`)
      if (!res.ok) throw new Error('Failed to fetch summary')
      return res.json() as Promise<{ summary: string }>
    },
    enabled,
    staleTime: Infinity,
  })

  if (!enabled) {
    return (
      <div className="bg-blue-50 rounded-lg p-6">
        <p className="text-gray-600 mb-4">Get an AI-generated structured summary of this paper.</p>
        <Button onClick={() => setEnabled(true)}>Generate AI Summary</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-red-500">Failed to generate summary. Please try again.</p>
  }

  return (
    <div className="prose max-w-none">
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{data?.summary}</div>
    </div>
  )
}
```

**Step 5: Create translation view with scroll sync — src/components/paper/translation-view.tsx**

```typescript
'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function useScrollSync(
  leftRef: React.RefObject<HTMLDivElement>,
  rightRef: React.RefObject<HTMLDivElement>
) {
  const isSyncing = useRef(false)

  function syncLeft() {
    if (isSyncing.current || !leftRef.current || !rightRef.current) return
    isSyncing.current = true
    const src = leftRef.current
    const tgt = rightRef.current
    const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight)
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight)
    requestAnimationFrame(() => { isSyncing.current = false })
  }

  function syncRight() {
    if (isSyncing.current || !leftRef.current || !rightRef.current) return
    isSyncing.current = true
    const src = rightRef.current
    const tgt = leftRef.current
    const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight)
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight)
    requestAnimationFrame(() => { isSyncing.current = false })
  }

  return { syncLeft, syncRight }
}

interface TranslationViewProps {
  arxivId: string
  htmlContent: string | null
  abstract: string
}

export function TranslationView({ arxivId, htmlContent, abstract }: TranslationViewProps) {
  const [enabled, setEnabled] = useState(false)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const { syncLeft, syncRight } = useScrollSync(leftRef, rightRef)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['translation', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/translate`)
      if (!res.ok) throw new Error('Failed to fetch translation')
      return res.json() as Promise<{ translation: string }>
    },
    enabled,
    staleTime: Infinity,
  })

  if (!enabled) {
    return (
      <div className="bg-green-50 rounded-lg p-6">
        <p className="text-gray-600 mb-4">View a side-by-side Korean translation with scroll sync.</p>
        <Button onClick={() => setEnabled(true)}>Translate to Korean</Button>
      </div>
    )
  }

  const originalContent = htmlContent ?? abstract

  return (
    <div className="flex gap-4 h-[70vh]">
      <div
        ref={leftRef}
        onScroll={syncLeft}
        className="flex-1 overflow-y-auto border rounded-lg p-4"
      >
        <h3 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-white">English (Original)</h3>
        {htmlContent ? (
          <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          <p className="text-sm">{abstract}</p>
        )}
      </div>
      <div
        ref={rightRef}
        onScroll={syncRight}
        className="flex-1 overflow-y-auto border rounded-lg p-4"
      >
        <h3 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-white">한국어 (번역)</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-red-500 text-sm">Translation failed. Please try again.</p>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{data?.translation}</div>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Claude API integration for AI summary and Korean translation"
```

---

## Task 10: References Section

**Files:**
- Create: `src/app/api/papers/[arxivId]/references/route.ts`
- Create: `src/components/paper/references-section.tsx`

**Step 1: Create references API route — src/app/api/papers/[arxivId]/references/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractReferences } from '@/lib/html-parser'
import { fetchArxivById } from '@/lib/arxiv-api'

export async function GET(req: NextRequest, { params }: { params: { arxivId: string } }) {
  const { arxivId } = params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (!cached) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Return cached references if available
  if (cached.references) {
    return NextResponse.json(JSON.parse(cached.references))
  }

  if (!cached.htmlContent) {
    return NextResponse.json([])
  }

  const rawRefs = extractReferences(cached.htmlContent)

  // Verify which arxivIds actually exist
  const enriched = await Promise.all(
    rawRefs.map(async ref => {
      if (!ref.arxivId) return { ...ref, verified: false }
      try {
        const paper = await fetchArxivById(ref.arxivId)
        return {
          ...ref,
          verified: !!paper,
          arxivUrl: paper ? `/paper/${ref.arxivId}` : undefined,
        }
      } catch {
        return { ...ref, verified: false }
      }
    })
  )

  await prisma.paperCache.update({
    where: { arxivId },
    data: { references: JSON.stringify(enriched) },
  })

  return NextResponse.json(enriched)
}
```

**Step 2: Create references section component — src/components/paper/references-section.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

interface Reference {
  text: string
  arxivId?: string
  doi?: string
  arxivUrl?: string
  verified?: boolean
}

export function ReferencesSection({ arxivId, htmlContent }: { arxivId: string; htmlContent: string | null }) {
  const [show, setShow] = useState(false)

  const { data, isLoading } = useQuery<Reference[]>({
    queryKey: ['references', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/references`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: show && !!htmlContent,
    staleTime: Infinity,
  })

  if (!htmlContent) return null

  return (
    <div className="mt-12 border-t pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">References</h2>
        <Button variant="outline" size="sm" onClick={() => setShow(s => !s)}>
          {show ? 'Hide' : 'Show References'}
        </Button>
      </div>

      {show && (
        <div className="space-y-3">
          {isLoading && <p className="text-gray-400 text-sm">Loading references...</p>}
          {data?.length === 0 && <p className="text-gray-500 text-sm">No references found.</p>}
          {data?.map((ref, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-gray-400 min-w-6">[{i + 1}]</span>
              <div>
                <p className="text-gray-700">{ref.text}</p>
                <div className="flex gap-2 mt-1">
                  {ref.arxivUrl && (
                    <a href={ref.arxivUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs">
                      arXiv
                    </a>
                  )}
                  {ref.doi && !ref.arxivUrl && (
                    <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs">
                      DOI
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add reference extraction and verification for paper detail"
```

---

## Task 11: My Page - Category & Keyword Management

**Files:**
- Create: `src/app/mypage/page.tsx`
- Create: `src/app/api/user/categories/route.ts`
- Create: `src/app/api/user/keywords/route.ts`
- Create: `src/app/api/user/settings/route.ts`
- Create: `src/components/mypage/category-selector.tsx`
- Create: `src/components/mypage/keyword-manager.tsx`
- Create: `src/components/mypage/alert-settings.tsx`

**Step 1: Create categories API — src/app/api/user/categories/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.userCategory.findMany({
    where: { userId: session.user.id },
  })

  return NextResponse.json(categories.map(c => c.category))
}

const schema = z.object({ categories: z.array(z.string()) })

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categories } = schema.parse(await req.json())

  // Replace all user categories
  await prisma.$transaction([
    prisma.userCategory.deleteMany({ where: { userId: session.user.id } }),
    prisma.userCategory.createMany({
      data: categories.map(cat => ({ userId: session.user.id, category: cat })),
    }),
  ])

  return NextResponse.json({ success: true })
}
```

**Step 2: Create keywords API — src/app/api/user/keywords/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keywords = await prisma.userKeyword.findMany({ where: { userId: session.user.id } })
  return NextResponse.json(keywords.map(k => k.keyword))
}

const addSchema = z.object({ keyword: z.string().min(1).max(50) })
const removeSchema = z.object({ keyword: z.string() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keyword } = addSchema.parse(await req.json())

  const count = await prisma.userKeyword.count({ where: { userId: session.user.id } })
  if (count >= 20) return NextResponse.json({ error: 'Maximum 20 keywords' }, { status: 400 })

  await prisma.userKeyword.upsert({
    where: { userId_keyword: { userId: session.user.id, keyword } },
    update: {},
    create: { userId: session.user.id, keyword },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keyword } = removeSchema.parse(await req.json())

  await prisma.userKeyword.deleteMany({
    where: { userId: session.user.id, keyword },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Create user settings API — src/app/api/user/settings/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const settingsSchema = z.object({
  alertMethod: z.enum(['EMAIL', 'TELEGRAM', 'BOTH']).optional(),
  telegramChatId: z.string().optional(),
  alertTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { alertMethod: true, telegramChatId: true, alertTime: true },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = settingsSchema.parse(await req.json())

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { alertMethod: true, telegramChatId: true, alertTime: true },
  })

  return NextResponse.json(user)
}
```

**Step 4: Create category selector — src/components/mypage/category-selector.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const CATEGORY_GROUPS = [
  {
    label: 'Computer Science',
    categories: ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.CR', 'cs.NE', 'cs.RO', 'cs.SE'],
  },
  {
    label: 'Mathematics',
    categories: ['math.CO', 'math.ST', 'math.OC', 'math.PR', 'math.NA'],
  },
  {
    label: 'Physics',
    categories: ['physics.comp-ph', 'hep-th', 'quant-ph', 'cond-mat.mes-hall'],
  },
  {
    label: 'Statistics',
    categories: ['stat.ML', 'stat.TH', 'stat.ME'],
  },
  {
    label: 'Other',
    categories: ['eess.IV', 'econ.GN', 'q-bio.NC', 'q-fin.CP'],
  },
]

interface CategorySelectorProps {
  initialSelected: string[]
  onSave: (categories: string[]) => Promise<void>
}

export function CategorySelector({ initialSelected, onSave }: CategorySelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(cat: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function toggleGroup(label: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(Array.from(selected))
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {CATEGORY_GROUPS.map(group => (
        <div key={group.label} className="border rounded-lg p-4">
          <button
            className="flex items-center justify-between w-full font-medium"
            onClick={() => toggleGroup(group.label)}
          >
            <span>{group.label}</span>
            <span>{expanded.has(group.label) ? '▲' : '▼'}</span>
          </button>
          {expanded.has(group.label) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {group.categories.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <Checkbox
                    id={cat}
                    checked={selected.has(cat)}
                    onCheckedChange={() => toggle(cat)}
                  />
                  <Label htmlFor={cat} className="text-sm cursor-pointer">{cat}</Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{selected.size} categories selected</span>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Categories'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 5: Create keyword manager — src/components/mypage/keyword-manager.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface KeywordManagerProps {
  initialKeywords: string[]
}

export function KeywordManager({ initialKeywords }: KeywordManagerProps) {
  const [keywords, setKeywords] = useState(initialKeywords)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  async function addKeyword() {
    const keyword = input.trim()
    if (!keyword) return
    if (keywords.includes(keyword)) { setError('Keyword already added'); return }
    if (keywords.length >= 20) { setError('Maximum 20 keywords'); return }

    const res = await fetch('/api/user/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })

    if (res.ok) {
      setKeywords(prev => [...prev, keyword])
      setInput('')
      setError('')
    } else {
      const data = await res.json()
      setError(data.error)
    }
  }

  async function removeKeyword(keyword: string) {
    await fetch('/api/user/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })
    setKeywords(prev => prev.filter(k => k !== keyword))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          placeholder="Add keyword..."
          onKeyDown={e => e.key === 'Enter' && addKeyword()}
          className="max-w-xs"
        />
        <Button onClick={addKeyword} disabled={keywords.length >= 20}>Add</Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => (
          <Badge key={kw} variant="secondary" className="gap-1">
            {kw}
            <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-red-500">×</button>
          </Badge>
        ))}
      </div>
      <p className="text-xs text-gray-500">{keywords.length}/20 keywords</p>
    </div>
  )
}
```

**Step 6: Create alert settings component — src/components/mypage/alert-settings.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AlertSettingsProps {
  initialSettings: {
    alertMethod: string
    telegramChatId: string | null
    alertTime: string
  }
}

export function AlertSettings({ initialSettings }: AlertSettingsProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Alert Method</Label>
        <Select
          value={settings.alertMethod}
          onValueChange={v => setSettings(s => ({ ...s, alertMethod: v }))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="TELEGRAM">Telegram</SelectItem>
            <SelectItem value="BOTH">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(settings.alertMethod === 'TELEGRAM' || settings.alertMethod === 'BOTH') && (
        <div className="space-y-2">
          <Label>Telegram Chat ID</Label>
          <Input
            value={settings.telegramChatId ?? ''}
            onChange={e => setSettings(s => ({ ...s, telegramChatId: e.target.value }))}
            placeholder="e.g. 123456789"
            className="max-w-xs"
          />
          <p className="text-xs text-gray-500">
            Message @userinfobot on Telegram to get your chat ID
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Alert Time (KST)</Label>
        <Input
          type="time"
          value={settings.alertTime}
          onChange={e => setSettings(s => ({ ...s, alertTime: e.target.value }))}
          className="w-32"
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
```

**Step 7: Create my page — src/app/mypage/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CategorySelector } from '@/components/mypage/category-selector'
import { KeywordManager } from '@/components/mypage/keyword-manager'
import { AlertSettings } from '@/components/mypage/alert-settings'
import { WatchedPapersList } from '@/components/mypage/watched-papers-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

async function saveCategories(userId: string, categories: string[]) {
  'use server'
  const { prisma: db } = await import('@/lib/prisma')
  await db.$transaction([
    db.userCategory.deleteMany({ where: { userId } }),
    db.userCategory.createMany({ data: categories.map(cat => ({ userId, category: cat })) }),
  ])
}

export default async function MyPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [categories, keywords, settings, watchedPapers] = await Promise.all([
    prisma.userCategory.findMany({ where: { userId: session.user.id } }),
    prisma.userKeyword.findMany({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { alertMethod: true, telegramChatId: true, alertTime: true },
    }),
    prisma.watchedPaper.findMany({
      where: { userId: session.user.id },
      orderBy: { notifiedAt: 'desc' },
      take: 50,
    }),
  ])

  const categorySaveAction = saveCategories.bind(null, session.user.id)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">My Page</h1>
      <Tabs defaultValue="interests">
        <TabsList className="mb-6">
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          <TabsTrigger value="papers">Watched Papers</TabsTrigger>
        </TabsList>

        <TabsContent value="interests" className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <CategorySelector
              initialSelected={categories.map(c => c.category)}
              onSave={categorySaveAction}
            />
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-4">Keywords</h2>
            <KeywordManager initialKeywords={keywords.map(k => k.keyword)} />
          </section>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertSettings
            initialSettings={{
              alertMethod: settings?.alertMethod ?? 'EMAIL',
              telegramChatId: settings?.telegramChatId ?? null,
              alertTime: settings?.alertTime ?? '09:00',
            }}
          />
        </TabsContent>

        <TabsContent value="papers">
          <WatchedPapersList
            papers={watchedPapers.map(p => ({
              ...p,
              matchedKeywords: JSON.parse(p.matchedKeywords) as string[],
              notifiedAt: p.notifiedAt.toISOString(),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add my page with category, keyword, and alert settings management"
```

---

## Task 12: Watched Papers List

**Files:**
- Create: `src/components/mypage/watched-papers-list.tsx`

**Step 1: Create watched papers component**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WatchedPaper {
  id: string
  arxivId: string
  title: string
  matchedKeywords: string[]
  matchedCategory: string
  isRead: boolean
  notifiedAt: string
}

interface Props {
  papers: WatchedPaper[]
}

export function WatchedPapersList({ papers: initialPapers }: Props) {
  const [papers, setPapers] = useState(initialPapers)
  const [tab, setTab] = useState<'unread' | 'read'>('unread')

  async function markRead(id: string) {
    await fetch(`/api/user/watched-papers/${id}/read`, { method: 'PATCH' })
    setPapers(prev => prev.map(p => p.id === id ? { ...p, isRead: true } : p))
  }

  const displayed = papers.filter(p => tab === 'unread' ? !p.isRead : p.isRead)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setTab('unread')}>
          Unread ({papers.filter(p => !p.isRead).length})
        </Button>
        <Button variant={tab === 'read' ? 'default' : 'outline'} size="sm" onClick={() => setTab('read')}>
          Read ({papers.filter(p => p.isRead).length})
        </Button>
      </div>

      {displayed.length === 0 && (
        <p className="text-gray-500 text-sm py-4">No {tab} papers.</p>
      )}

      <div className="space-y-3">
        {displayed.map(paper => (
          <div key={paper.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Link href={`/paper/${paper.arxivId}`} className="font-medium hover:text-blue-600 text-sm">
                  {paper.title}
                </Link>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{paper.matchedCategory}</Badge>
                  {paper.matchedKeywords.map(kw => (
                    <Badge key={kw} className="text-xs bg-blue-50 text-blue-700">{kw}</Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{new Date(paper.notifiedAt).toLocaleDateString()}</p>
              </div>
              {!paper.isRead && (
                <Button size="sm" variant="ghost" onClick={() => markRead(paper.id)}>
                  Mark Read
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create mark-read API — src/app/api/user/watched-papers/[id]/read/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.watchedPaper.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add watched papers list with read/unread tabs"
```

---

## Task 13: Notification System (Telegram + Email)

**Files:**
- Create: `src/lib/telegram.ts`
- Create: `src/lib/mailer.ts`

**Step 1: Create Telegram client — src/lib/telegram.ts**

```typescript
import TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

function getBot(): TelegramBot {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
  }
  if (!bot) throw new Error('TELEGRAM_BOT_TOKEN not configured')
  return bot
}

export async function sendTelegramAlert(
  chatId: string,
  papers: Array<{ title: string; authors: string[]; arxivId: string; matchedKeywords: string[] }>
): Promise<void> {
  const b = getBot()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const paperLines = papers
    .slice(0, 5) // max 5 papers per message
    .map(
      (p, i) =>
        `${i + 1}. *${p.title.replace(/[*_`]/g, '\\$&')}*\n` +
        `   👥 ${p.authors.slice(0, 2).join(', ')}\n` +
        `   🏷 ${p.matchedKeywords.join(', ')}\n` +
        `   🔗 ${siteUrl}/paper/${p.arxivId}`
    )
    .join('\n\n')

  const message =
    `📚 *${papers.length} new paper(s) found!*\n\n${paperLines}` +
    (papers.length > 5 ? `\n\n...and ${papers.length - 5} more on your My Page` : '')

  await b.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}
```

**Step 2: Create mailer — src/lib/mailer.ts**

```typescript
import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmailAlert(
  toEmail: string,
  name: string,
  papers: Array<{ title: string; authors: string[]; arxivId: string; matchedKeywords: string[] }>
): Promise<void> {
  const transporter = createTransport()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const paperHtml = papers
    .map(
      p => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <a href="${siteUrl}/paper/${p.arxivId}" style="font-weight:bold; color:#2563eb; text-decoration:none;">
          ${p.title}
        </a>
        <p style="color:#6b7280; font-size:14px; margin:4px 0;">${p.authors.slice(0, 3).join(', ')}</p>
        <p style="font-size:12px; color:#9ca3af;">Keywords: ${p.matchedKeywords.join(', ')}</p>
      </div>
    `
    )
    .join('')

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: `arXiv Search: ${papers.length} new paper(s) for you`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name},</h2>
        <p>We found <strong>${papers.length} new paper(s)</strong> matching your interests:</p>
        ${paperHtml}
        <hr />
        <p style="font-size:12px; color:#9ca3af;">
          Manage your alerts at <a href="${siteUrl}/mypage">${siteUrl}/mypage</a>
        </p>
      </div>
    `,
  })
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Telegram and email notification clients"
```

---

## Task 14: Cron Job - Paper Detection & Alerts

**Files:**
- Create: `src/lib/cron.ts`
- Create: `src/app/api/cron/check-papers/route.ts`

**Step 1: Create cron logic — src/lib/cron.ts**

```typescript
import { prisma } from '@/lib/prisma'
import { searchArxiv } from '@/lib/arxiv-api'
import { sendTelegramAlert } from '@/lib/telegram'
import { sendEmailAlert } from '@/lib/mailer'
import { subDays, formatISO } from 'date-fns'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runPaperCheck(): Promise<{
  queriesRun: number
  papersFound: number
  alertsSent: number
  errors: string[]
}> {
  const stats = { queriesRun: 0, papersFound: 0, alertsSent: 0, errors: [] as string[] }

  const users = await prisma.user.findMany({
    where: { status: 'APPROVED' },
    include: { categories: true, keywords: true },
  })

  const sevenDaysAgo = subDays(new Date(), 7)

  // Collect unique (category, keyword) pairs
  const queryMap = new Map<string, Set<string>>() // category -> keywords set
  for (const user of users) {
    for (const cat of user.categories) {
      if (!queryMap.has(cat.category)) queryMap.set(cat.category, new Set())
      for (const kw of user.keywords) {
        queryMap.get(cat.category)!.add(kw.keyword)
      }
    }
  }

  // Run searches
  const papersByQuery = new Map<string, typeof import('@/types/paper').PaperSummary[]>()

  for (const [category, keywords] of queryMap.entries()) {
    const kwArray = Array.from(keywords)
    const query = kwArray.length > 0 ? kwArray.join(' OR ') : ''

    try {
      const result = await searchArxiv({ query, category, maxResults: 50, sortBy: 'submittedDate' })
      // Filter to last 7 days
      const recent = result.papers.filter(p => new Date(p.published) >= sevenDaysAgo)
      papersByQuery.set(`${category}:${kwArray.join(',')}`, recent)
      stats.queriesRun++
      stats.papersFound += recent.length
      await sleep(3000)
    } catch (e) {
      stats.errors.push(`Query failed for ${category}: ${(e as Error).message}`)
    }
  }

  // Match papers to users and send alerts
  const userAlerts = new Map<string, Array<{ paper: { title: string; authors: string[]; arxivId: string }; matchedKeywords: string[]; matchedCategory: string }>>()

  for (const user of users) {
    if (user.categories.length === 0 || user.keywords.length === 0) continue

    const userPapers: Array<{ paper: { title: string; authors: string[]; arxivId: string }; matchedKeywords: string[]; matchedCategory: string }> = []
    const userKws = user.keywords.map(k => k.keyword.toLowerCase())

    for (const cat of user.categories) {
      for (const [key, papers] of papersByQuery.entries()) {
        if (!key.startsWith(cat.category)) continue

        for (const paper of papers) {
          const lowerAbstract = (paper.abstract + ' ' + paper.title).toLowerCase()
          const matchedKeywords = userKws.filter(kw => lowerAbstract.includes(kw))

          if (matchedKeywords.length === 0) continue

          // Check if already notified
          const exists = await prisma.watchedPaper.findUnique({
            where: { userId_arxivId: { userId: user.id, arxivId: paper.arxivId } },
          })
          if (exists) continue

          await prisma.watchedPaper.create({
            data: {
              userId: user.id,
              arxivId: paper.arxivId,
              title: paper.title,
              matchedKeywords: JSON.stringify(matchedKeywords),
              matchedCategory: cat.category,
            },
          })

          userPapers.push({ paper, matchedKeywords, matchedCategory: cat.category })
        }
      }
    }

    if (userPapers.length > 0) {
      userAlerts.set(user.id, userPapers)
    }
  }

  // Send notifications
  for (const [userId, alerts] of userAlerts.entries()) {
    const user = users.find(u => u.id === userId)!
    const paperList = alerts.map(a => ({
      title: a.paper.title,
      authors: a.paper.authors ?? [],
      arxivId: a.paper.arxivId,
      matchedKeywords: a.matchedKeywords,
    }))

    try {
      if (user.alertMethod === 'EMAIL' || user.alertMethod === 'BOTH') {
        await sendEmailAlert(user.email, user.name, paperList)
      }
      if ((user.alertMethod === 'TELEGRAM' || user.alertMethod === 'BOTH') && user.telegramChatId) {
        await sendTelegramAlert(user.telegramChatId, paperList)
      }
      stats.alertsSent++
    } catch (e) {
      stats.errors.push(`Alert failed for ${user.email}: ${(e as Error).message}`)
    }
  }

  return stats
}
```

**Step 2: Create cron API endpoint — src/app/api/cron/check-papers/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { runPaperCheck } from '@/lib/cron'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await runPaperCheck()

    await prisma.cronLog.create({
      data: {
        queriesRun: stats.queriesRun,
        papersFound: stats.papersFound,
        alertsSent: stats.alertsSent,
        errors: stats.errors.length > 0 ? JSON.stringify(stats.errors) : null,
        status: stats.errors.length === 0 ? 'SUCCESS' : stats.alertsSent > 0 ? 'PARTIAL' : 'FAILED',
      },
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
```

**Step 3: Create server-side cron initialization — src/lib/cron-init.ts**

```typescript
import cron from 'node-cron'

let initialized = false

export function initCron() {
  if (initialized || process.env.NODE_ENV !== 'production') return
  initialized = true

  // Run every day at 09:00 KST (00:00 UTC)
  cron.schedule('0 0 * * *', async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    try {
      await fetch(`${siteUrl}/api/cron/check-papers`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      })
    } catch (e) {
      console.error('Cron trigger failed:', e)
    }
  })

  console.log('Cron initialized')
}
```

Add to `src/app/layout.tsx` server component:
```typescript
// import at top
import { initCron } from '@/lib/cron-init'
// call before return
initCron()
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add cron job for paper detection and user notification dispatch"
```

---

## Task 15: Docker & Final Polish

**Files:**
- Create: `Dockerfile`
- Modify: `docker-compose.yml`

**Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Update docker-compose.yml**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: arxiv_user
      POSTGRES_PASSWORD: arxiv_pass
      POSTGRES_DB: arxiv_search
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arxiv_user -d arxiv_search"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://arxiv_user:arxiv_pass@db:5432/arxiv_search
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      CRON_SECRET: ${CRON_SECRET}
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

Add to `next.config.ts`:
```typescript
const config = {
  output: 'standalone',
}
export default config
```

**Step 3: Final build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add Dockerfile and complete docker-compose for production deployment"
```

---

## Summary

| Phase | Tasks | Features |
|-------|-------|----------|
| Setup | 1-2 | Scaffold, DB schema, Docker |
| Phase 1 | 3-5 | Auth, admin approval |
| Phase 2 | 6-7 | arXiv search, gallery |
| Phase 3 | 8-10 | Paper detail, AI summary, translation, references |
| Phase 4 | 11-14 | My page, notifications, cron |
| Deploy | 15 | Dockerfile, compose |

**Run locally:**
```bash
docker-compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Admin login: `admin@arxiv-search.com` / `Admin@1234`
