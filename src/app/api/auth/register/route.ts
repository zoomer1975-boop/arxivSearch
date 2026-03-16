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
      const issues = error.issues ?? error.flatten().formErrors
      const message = Array.isArray(issues) && issues.length > 0
        ? (issues[0] as { message: string }).message
        : 'Validation error'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
