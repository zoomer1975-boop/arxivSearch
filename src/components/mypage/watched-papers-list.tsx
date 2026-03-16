'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WatchedPaper {
  id: string
  arxivId: string
  title: string
  matchedKeywords: string[]
  matchedCategory: string
  isRead: boolean
  notifiedAt: string
}

interface WatchedPapersListProps {
  papers: WatchedPaper[]
}

export function WatchedPapersList({ papers: initialPapers }: WatchedPapersListProps) {
  const [papers, setPapers] = useState(initialPapers)
  const [tab, setTab] = useState<'unread' | 'read'>('unread')

  async function markRead(id: string) {
    const res = await fetch(`/api/user/watched-papers/${id}/read`, {
      method: 'PATCH',
    })
    if (res.ok) {
      setPapers(prev =>
        prev.map(p => (p.id === id ? { ...p, isRead: true } : p))
      )
    }
  }

  const unread = papers.filter(p => !p.isRead)
  const read = papers.filter(p => p.isRead)
  const displayed = tab === 'unread' ? unread : read

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={tab === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('unread')}
        >
          Unread ({unread.length})
        </Button>
        <Button
          variant={tab === 'read' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('read')}
        >
          Read ({read.length})
        </Button>
      </div>

      {displayed.length === 0 && (
        <p className="text-gray-500 text-sm py-4">
          {tab === 'unread'
            ? 'No unread papers. Set up your interests to receive notifications.'
            : 'No read papers yet.'}
        </p>
      )}

      <div className="space-y-3">
        {displayed.map(paper => (
          <div
            key={paper.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/paper/${paper.arxivId}`}
                  className="font-medium text-sm hover:text-blue-600 line-clamp-2"
                >
                  {paper.title}
                </Link>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {paper.matchedCategory}
                  </Badge>
                  {paper.matchedKeywords.slice(0, 3).map(kw => (
                    <Badge
                      key={kw}
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {kw}
                    </Badge>
                  ))}
                  {paper.matchedKeywords.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      +{paper.matchedKeywords.length - 3}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(paper.notifiedAt).toLocaleDateString()}
                </p>
              </div>
              {!paper.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-xs"
                  onClick={() => markRead(paper.id)}
                >
                  Mark Read
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
