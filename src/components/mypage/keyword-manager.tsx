'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const MAX_KEYWORDS = 20

interface KeywordManagerProps {
  initialKeywords: string[]
}

export function KeywordManager({ initialKeywords }: KeywordManagerProps) {
  const [keywords, setKeywords] = useState(initialKeywords)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function addKeyword() {
    const keyword = input.trim()
    if (!keyword) return
    if (keywords.includes(keyword)) {
      setError('Keyword already added')
      return
    }
    if (keywords.length >= MAX_KEYWORDS) {
      setError(`Maximum ${MAX_KEYWORDS} keywords`)
      return
    }

    setLoading(true)
    const res = await fetch('/api/user/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })

    if (res.ok) {
      setKeywords(prev => [...prev, keyword])
      setInput('')
      setError('')
    } else {
      const data = await res.json()
      setError((data as { error: string }).error ?? 'Failed to add keyword')
    }
    setLoading(false)
  }

  async function removeKeyword(keyword: string) {
    await fetch('/api/user/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })
    setKeywords(prev => prev.filter(k => k !== keyword))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setError('')
          }}
          placeholder="Add keyword (e.g. transformer, diffusion model)..."
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addKeyword()
            }
          }}
          className="max-w-sm"
          disabled={loading || keywords.length >= MAX_KEYWORDS}
        />
        <Button
          onClick={addKeyword}
          disabled={loading || keywords.length >= MAX_KEYWORDS}
        >
          Add
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => (
            <Badge key={kw} variant="secondary" className="gap-1 pr-1">
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="ml-1 hover:text-red-500 transition-colors"
                aria-label={`Remove keyword ${kw}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">
        {keywords.length}/{MAX_KEYWORDS} keywords
      </p>
    </div>
  )
}
