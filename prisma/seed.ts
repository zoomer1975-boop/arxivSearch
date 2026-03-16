import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

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
