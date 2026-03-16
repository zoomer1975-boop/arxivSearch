'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { PaperCard } from './paper-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { SearchResponse } from '@/types/paper'

async function fetchPapers(
  q: string,
  cat: string,
  page: number
): Promise<SearchResponse> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (cat) params.set('cat', cat)
  params.set('page', String(page))

  const res = await fetch(`/api/papers/search?${params}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json() as Promise<SearchResponse>
}

export function PaperGallery() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? ''
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['papers', q, cat, page],
    queryFn: () => fetchPapers(q, cat, page),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-red-500 text-center py-8">
        Failed to load papers. Please try again.
      </p>
    )
  }

  if (!data?.papers.length) {
    return (
      <p className="text-gray-500 text-center py-8">
        {q || cat ? 'No papers found for this search.' : 'Enter a search term to find papers.'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {data.totalResults.toLocaleString()} results
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.papers.map(paper => (
          <PaperCard key={paper.arxivId} paper={paper} />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="py-2 px-4 text-sm">Page {page}</span>
        <Button
          variant="outline"
          onClick={() => setPage(p => p + 1)}
          disabled={data.papers.length < 20}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
