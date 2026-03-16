import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { summarizePaper } from '@/lib/claude-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ arxivId: string }> }
) {
  const { arxivId } = await params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (!cached) {
    return NextResponse.json({ error: 'Paper not found in cache. Visit the paper page first.' }, { status: 404 })
  }

  // Return cached summary if available
  if (cached.summary) {
    return NextResponse.json({ summary: cached.summary, cached: true })
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
    return NextResponse.json(
      { error: 'Failed to generate summary. Check ANTHROPIC_API_KEY.' },
      { status: 500 }
    )
  }
}
