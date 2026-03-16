'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface AiSummaryProps {
  arxivId: string
}

export function AiSummary({ arxivId }: AiSummaryProps) {
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/summary`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error: string }).error ?? 'Failed to fetch summary')
      }
      return res.json() as Promise<{ summary: string; cached: boolean }>
    },
    enabled,
    staleTime: Infinity,
    retry: false,
  })

  if (!enabled) {
    return (
      <div className="bg-blue-50 rounded-lg p-6">
        <p className="text-gray-600 mb-4">
          Get a structured AI summary of this paper&apos;s key contributions.
        </p>
        <Button onClick={() => setEnabled(true)}>Generate AI Summary</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
        <p className="text-red-600 mb-2">Failed to generate summary.</p>
        <p className="text-sm text-gray-500">Make sure ANTHROPIC_API_KEY is set in your environment.</p>
        <Button variant="outline" className="mt-4" onClick={() => setEnabled(false)}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data?.cached && (
        <p className="text-xs text-gray-400">Cached summary</p>
      )}
      <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
        {data?.summary}
      </div>
    </div>
  )
}
