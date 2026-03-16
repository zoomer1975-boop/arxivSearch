import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { translateToKorean } from '@/lib/ai-api'
import { auth } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ arxivId: string }> }
) {
  const session = await auth()
  if (!session || session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { arxivId } = await params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (!cached) {
    return NextResponse.json({ error: 'Paper not found in cache.' }, { status: 404 })
  }

  // Return cached translation if available
  if (cached.summaryKo) {
    return NextResponse.json({ translation: cached.summaryKo, cached: true })
  }

  // Translate the abstract (not full HTML — too large for single API call)
  try {
    const translation = await translateToKorean(cached.abstract)

    await prisma.paperCache.update({
      where: { arxivId },
      data: { summaryKo: translation },
    })

    return NextResponse.json({ translation, cached: false })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate. Check AI_API_KEY and AI_PROVIDER settings.' },
      { status: 500 }
    )
  }
}
