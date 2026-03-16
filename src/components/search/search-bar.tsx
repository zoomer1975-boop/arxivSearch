'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'cs.AI', label: 'CS - AI' },
  { value: 'cs.LG', label: 'CS - Machine Learning' },
  { value: 'cs.CL', label: 'CS - Computation & Language' },
  { value: 'cs.CV', label: 'CS - Computer Vision' },
  { value: 'math.CO', label: 'Math - Combinatorics' },
  { value: 'stat.ML', label: 'Stats - Machine Learning' },
  { value: 'q-bio', label: 'Quantitative Biology' },
  { value: 'econ', label: 'Economics' },
  { value: 'quant-ph', label: 'Quantum Physics' },
  { value: 'hep-th', label: 'High Energy Physics' },
]

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('cat') ?? 'all')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category && category !== 'all') params.set('cat', category)
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search papers by keyword, author, or title..."
        className="flex-1 min-w-48"
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Search</Button>
    </form>
  )
}
