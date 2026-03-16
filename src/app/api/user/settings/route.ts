import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const settingsSchema = z.object({
  alertMethod: z.enum(['EMAIL', 'TELEGRAM', 'BOTH']).optional(),
  telegramChatId: z.string().max(100).nullable().optional(),
  alertTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format')
    .optional(),
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

  try {
    const data = settingsSchema.parse(await req.json())

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { alertMethod: true, telegramChatId: true, alertTime: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
