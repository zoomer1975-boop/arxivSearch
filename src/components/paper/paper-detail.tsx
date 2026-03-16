'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PaperSummary } from '@/types/paper'

import { AiSummary } from './ai-summary'
import { TranslationView } from './translation-view'
// import { ReferencesSection } from './references-section'

type View = 'original' | 'translation' | 'summary'

interface PaperDetailProps {
  arxivId: string
  paper: PaperSummary
  htmlContent: string | null
}

export function PaperDetail({ arxivId, paper, htmlContent }: PaperDetailProps) {
  const [view, setView] = useState<View>('original')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Metadata header */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {paper.categories.map(c => (
            <Badge key={c} variant="outline">{c}</Badge>
          ))}
        </div>
        <h1 className="text-2xl font-bold mb-3 leading-snug">{paper.title}</h1>
        <p className="text-gray-600 mb-2 text-sm">{paper.authors.join(', ')}</p>
        {paper.published && (
          <p className="text-sm text-gray-400 mb-4">
            Published: {new Date(paper.published).toLocaleDateString()}
            {paper.updated && paper.updated !== paper.published
              ? ` · Updated: ${new Date(paper.updated).toLocaleDateString()}`
              : ''}
          </p>
        )}
        <div className="flex gap-2">
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">PDF</Button>
          </a>
          <a
            href={`https://arxiv.org/abs/${arxivId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">arXiv</Button>
          </a>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        <Button
          variant={view === 'original' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('original')}
        >
          Original
        </Button>
        <Button
          variant={view === 'translation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('translation')}
        >
          Korean Translation
        </Button>
        <Button
          variant={view === 'summary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('summary')}
        >
          AI Summary
        </Button>
      </div>

      {/* Content */}
      {view === 'original' && (
        <div>
          {htmlContent ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Abstract</h3>
              <p className="text-gray-700 leading-relaxed">{paper.abstract}</p>
              <p className="mt-4 text-sm text-gray-500">
                HTML version not available.{' '}
                <a href={paper.pdfUrl} className="text-blue-600 underline">
                  View PDF
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {view === 'translation' && (
        <TranslationView
          arxivId={arxivId}
          htmlContent={htmlContent}
          abstract={paper.abstract}
        />
      )}

      {view === 'summary' && (
        <AiSummary arxivId={arxivId} />
      )}
    </div>
  )
}
