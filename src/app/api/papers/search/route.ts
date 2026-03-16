import { NextRequest, NextResponse } from 'next/server'
import { searchArxiv } from '@/lib/arxiv-api'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const sort = searchParams.get('sort') === 'relevance' ? 'relevance' : 'submittedDate'
  const maxResults = 20
  const start = (page - 1) * maxResults

  try {
    const result = await searchArxiv({
      query: q,
      category: cat || undefined,
      start,
      maxResults,
      sortBy: sort,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
