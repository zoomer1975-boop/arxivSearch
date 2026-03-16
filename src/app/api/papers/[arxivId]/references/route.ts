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

  // Verify arXiv IDs sequentially to respect rate limits (throttle is handled in fetchArxivById)
  const enriched: Reference[] = []
  for (const ref of rawRefs) {
    if (!ref.arxivId) {
      enriched.push({ text: ref.text, doi: ref.doi })
      continue
    }
    try {
      const paper = await fetchArxivById(ref.arxivId)
      enriched.push({
        text: ref.text,
        arxivId: ref.arxivId,
        doi: ref.doi,
        arxivUrl: paper ? `/paper/${ref.arxivId}` : undefined,
        verified: !!paper,
      })
    } catch {
      enriched.push({ text: ref.text, arxivId: ref.arxivId, doi: ref.doi, verified: false })
    }
    // throttle is handled in fetchArxivById via fetchArxivXml
  }

  await prisma.paperCache.update({
    where: { arxivId },
    data: { references: JSON.stringify(enriched) },
  })

  return NextResponse.json(enriched)
}
