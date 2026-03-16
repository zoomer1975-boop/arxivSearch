'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import type { Reference } from '@/types/paper'

interface ReferencesSectionProps {
  arxivId: string
  htmlContent: string | null
}

export function ReferencesSection({
  arxivId,
  htmlContent,
}: ReferencesSectionProps) {
  const [show, setShow] = useState(false)

  const { data, isLoading } = useQuery<Reference[]>({
    queryKey: ['references', arxivId],
    queryFn: async () => {
      const res = await fetch(`/api/papers/${arxivId}/references`)
      if (!res.ok) return []
      return res.json() as Promise<Reference[]>
    },
    enabled: show,
    staleTime: Infinity,
  })

  if (!htmlContent) return null

  return (
    <div className="mt-12 border-t pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">References</h2>
        <Button variant="outline" size="sm" onClick={() => setShow(s => !s)}>
          {show ? 'Hide References' : 'Show References'}
        </Button>
      </div>

      {show && (
        <div className="space-y-3">
          {isLoading && (
            <p className="text-gray-400 text-sm">Loading references...</p>
          )}
          {!isLoading && data?.length === 0 && (
            <p className="text-gray-500 text-sm">No references found.</p>
          )}
          {data?.map((ref, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-gray-400 shrink-0 min-w-[2rem]">[{i + 1}]</span>
              <div>
                <p className="text-gray-700">{ref.text}</p>
                <div className="flex gap-3 mt-1">
                  {ref.arxivUrl && (
                    <a
                      href={ref.arxivUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      arXiv
                    </a>
                  )}
                  {ref.doi && !ref.arxivUrl && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      DOI
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
