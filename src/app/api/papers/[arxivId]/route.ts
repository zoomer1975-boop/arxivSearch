import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchArxivById } from '@/lib/arxiv-api'
import { sanitizeHtml } from '@/lib/html-parser'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ arxivId: string }> }
) {
  const { arxivId } = await params

  // Return cached data if html is already fetched
  const cached = await prisma.paperCache.findUnique({ where: { arxivId } })
  if (cached?.htmlContent) {
    return NextResponse.json(cached)
  }

  // Fetch metadata from arXiv
  const paper = await fetchArxivById(arxivId)
  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Try to fetch HTML from ar5iv
  let htmlContent: string | null = null
  try {
    const htmlRes = await fetch(
      `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
      {
        headers: { 'User-Agent': 'ArxivSearch/1.0' },
        signal: AbortSignal.timeout(15000),
      }
    )
    if (htmlRes.ok) {
      const rawHtml = await htmlRes.text()
      htmlContent = sanitizeHtml(rawHtml)
    }
  } catch (err) {
    console.warn(`Could not fetch HTML for ${arxivId}:`, err)
  }

  const cacheData = {
    arxivId,
    title: paper.title,
    authors: JSON.stringify(paper.authors),
    abstract: paper.abstract,
    htmlContent,
  }

  const result = await prisma.paperCache.upsert({
    where: { arxivId },
    update: cacheData,
    create: cacheData,
  })

  return NextResponse.json(result)
}
