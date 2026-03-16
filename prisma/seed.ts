import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin@1234'
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

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
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
