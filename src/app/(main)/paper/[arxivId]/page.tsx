import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchArxivById } from '@/lib/arxiv-api'
import { sanitizeHtml } from '@/lib/html-parser'
import { PaperDetail } from '@/components/paper/paper-detail'
import type { PaperSummary } from '@/types/paper'

interface PageProps {
  params: Promise<{ arxivId: string }>
}

async function getPaperData(
  arxivId: string
): Promise<{ paper: PaperSummary; htmlContent: string | null } | null> {
  // Check cache first
  let cached = await prisma.paperCache.findUnique({ where: { arxivId } })

  if (!cached) {
    const paper = await fetchArxivById(arxivId)
    if (!paper) return null

    let htmlContent: string | null = null
    try {
      const htmlRes = await fetch(
        `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (htmlRes.ok) {
        htmlContent = sanitizeHtml(await htmlRes.text())
      }
    } catch {
      // HTML not available; fall through with null
    }

    cached = await prisma.paperCache.create({
      data: {
        arxivId,
        title: paper.title,
        authors: JSON.stringify(paper.authors),
        abstract: paper.abstract,
        htmlContent,
      },
    })
  }

  const authors = JSON.parse(cached.authors) as string[]

  const paper: PaperSummary = {
    arxivId,
    title: cached.title,
    authors,
    abstract: cached.abstract,
    primaryCategory: '',
    categories: [],
    published: '',
    updated: '',
    htmlUrl: `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
  }

  return { paper, htmlContent: cached.htmlContent ?? null }
}

export default async function PaperPage({ params }: PageProps) {
  const { arxivId } = await params
  const data = await getPaperData(arxivId)
  if (!data) notFound()

  return (
    <PaperDetail
      arxivId={arxivId}
      paper={data.paper}
      htmlContent={data.htmlContent}
    />
  )
}
