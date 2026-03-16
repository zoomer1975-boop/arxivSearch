import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const MAX_KEYWORDS = 20

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keywords = await prisma.userKeyword.findMany({
    where: { userId: session.user.id },
  })
  return NextResponse.json(keywords.map(k => k.keyword))
}

const addSchema = z.object({
  keyword: z.string().min(1).max(50).trim(),
})

const removeSchema = z.object({
  keyword: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { keyword } = addSchema.parse(await req.json())

    const count = await prisma.userKeyword.count({
      where: { userId: session.user.id },
    })
    if (count >= MAX_KEYWORDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_KEYWORDS} keywords allowed` },
        { status: 400 }
      )
    }

    await prisma.userKeyword.upsert({
      where: {
        userId_keyword: { userId: session.user.id, keyword },
      },
      update: {},
      create: { userId: session.user.id, keyword },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid keyword' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { keyword } = removeSchema.parse(await req.json())
    await prisma.userKeyword.deleteMany({
      where: { userId: session.user.id, keyword },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
