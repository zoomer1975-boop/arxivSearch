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

const putSchema = z.object({
  categories: z.array(z.string().min(1)).max(50),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { categories } = putSchema.parse(await req.json())

    await prisma.$transaction([
      prisma.userCategory.deleteMany({ where: { userId: session.user.id } }),
      prisma.userCategory.createMany({
        data: categories.map(cat => ({ userId: session.user.id, category: cat })),
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid categories' }, { status: 400 })
    }
    console.error('Categories update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
