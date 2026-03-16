import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildConnectionString(): string {
  // Support both a single DATABASE_URL or individual POSTGRES_* variables
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const host = process.env.POSTGRES_HOST ?? 'localhost'
  const port = process.env.POSTGRES_PORT ?? '5432'
  const user = process.env.POSTGRES_USER
  const password = process.env.POSTGRES_PASSWORD
  const db = process.env.POSTGRES_DB

  if (!user || !db) {
    throw new Error(
      'Database not configured. Set DATABASE_URL or POSTGRES_HOST/PORT/USER/PASSWORD/DB environment variables.'
    )
  }

  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user)
  return `postgresql://${auth}@${host}:${port}/${db}`
}

function createPrismaClient() {
  const connectionString = buildConnectionString()

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
