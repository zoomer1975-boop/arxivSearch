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
    select: {
      id: true,
      name: true,
      email: true,
      institution: true,
      status: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))
  )
}

const updateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, status } = updateSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    console.error('Admin update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
