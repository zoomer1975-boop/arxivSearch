'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function useScrollSync(
  leftRef: React.RefObject<HTMLDivElement | null>,
  rightRef: React.RefObject<HTMLDivElement | null>
) {
  const isSyncing = useRef(false)

  function syncLeft() {
    if (isSyncing.current || !leftRef.current || !rightRef.current) return
    isSyncing.current = true
    const src = leftRef.current
    const tgt = rightRef.current
    const max = src.scrollHeight - src.clientHeight
    if (max <= 0) { isSyncing.current = false; return }
    const ratio = src.scrollTop / max
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight)
    requestAnimationFrame(() => { isSyncing.current = false })
  }

  function syncRight() {
    if (isSyncing.current || !leftRef.current || !rightRef.current) return
    isSyncing.current = true
    const src = rightRef.current
    const tgt = leftRef.current
    const max = src.scrollHeight - src.clientHeight
    if (max <= 0) { isSyncing.current = false; return }
    const ratio = src.scrollTop / max
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight)
    requestAnimationFrame(() => { isSyncing.current = false })
  }

  return { syncLeft, syncRight }
}

interface TranslationViewProps {
  arxivId: string
  htmlContent: string | null
  abstract: string
}

export function TranslationView({
  arxivId,
  htmlContent,
  abstract,
}: TranslationViewProps) {
  const [enabled, setEnabled] = useState(false)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const { syncLeft, syncRight } = useScrollSync(leftRef, rightRef)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['translation', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/translate`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error: string }).error ?? 'Translation failed')
      }
      return res.json() as Promise<{ translation: string; cached: boolean }>
    },
    enabled,
    staleTime: Infinity,
    retry: false,
  })

  if (!enabled) {
    return (
      <div className="bg-green-50 rounded-lg p-6">
        <p className="text-gray-600 mb-4">
          View a side-by-side Korean translation with synchronized scrolling.
        </p>
        <Button onClick={() => setEnabled(true)}>Translate to Korean</Button>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[70vh]">
      <div
        ref={leftRef}
        onScroll={syncLeft}
        className="flex-1 overflow-y-auto border rounded-lg p-4"
      >
        <h3 className="text-xs font-semibold text-gray-400 mb-3 sticky top-0 bg-white py-1">
          English (Original)
        </h3>
        {htmlContent ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <p className="text-sm leading-relaxed">{abstract}</p>
        )}
      </div>

      <div
        ref={rightRef}
        onScroll={syncRight}
        className="flex-1 overflow-y-auto border rounded-lg p-4"
      >
        <h3 className="text-xs font-semibold text-gray-400 mb-3 sticky top-0 bg-white py-1">
          한국어 (번역)
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div>
            <p className="text-red-500 text-sm mb-2">Translation failed.</p>
            <Button variant="outline" size="sm" onClick={() => setEnabled(false)}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {data?.translation}
          </div>
        )}
      </div>
    </div>
  )
}
