import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractReferences } from '@/lib/html-parser'
import { fetchArxivById } from '@/lib/arxiv-api'
import type { Reference } from '@/types/paper'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ arxivId: string }> }
) {
  const { arxivId } = await params

  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (!cached) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Return cached references if available
  if (cached.references) {
    return NextResponse.json(JSON.parse(cached.references) as Reference[])
  }

  if (!cached.htmlContent) {
    return NextResponse.json([])
  }

  const rawRefs = extractReferences(cached.htmlContent)

  // Verify arXiv IDs in small batches (rate limited)
  const enriched: Reference[] = await Promise.all(
    rawRefs.map(async (ref): Promise<Reference> => {
      if (!ref.arxivId) {
        return {
          text: ref.text,
          doi: ref.doi,
        }
      }
      try {
        const paper = await fetchArxivById(ref.arxivId)
        return {
          text: ref.text,
          arxivId: ref.arxivId,
          doi: ref.doi,
          arxivUrl: paper ? `/paper/${ref.arxivId}` : undefined,
          verified: !!paper,
        }
      } catch {
        return {
          text: ref.text,
          arxivId: ref.arxivId,
          doi: ref.doi,
          verified: false,
        }
      }
    })
  )

  await prisma.paperCache.update({
    where: { arxivId },
    data: { references: JSON.stringify(enriched) },
  })

  return NextResponse.json(enriched)
}
