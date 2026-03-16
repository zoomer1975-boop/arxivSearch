import { XMLParser } from 'fast-xml-parser'
import type { PaperSummary, SearchResponse } from '@/types/paper'

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query'
const REQUEST_INTERVAL_MS = 3000

let lastRequestTime = 0

async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise<void>(resolve =>
      setTimeout(resolve, REQUEST_INTERVAL_MS - elapsed)
    )
  }
  lastRequestTime = Date.now()
}

function extractArxivId(id: string): string {
  const match = id.match(/abs\/(.+)$/)
  return match ? match[1] : id
}

type XmlEntry = {
  id: string
  title: string
  summary: string
  published: string
  updated: string
  author: { name: string } | Array<{ name: string }>
  category: { '@_term': string } | Array<{ '@_term': string }>
  'arxiv:primary_category'?: { '@_term': string }
}

function parseEntry(entry: XmlEntry): PaperSummary {
  const arxivId = extractArxivId(entry.id)

  const authors = Array.isArray(entry.author)
    ? entry.author.map(a => a.name)
    : entry.author?.name
    ? [entry.author.name]
    : []

  const categories = Array.isArray(entry.category)
    ? entry.category.map(c => c['@_term'])
    : entry.category?.['@_term']
    ? [entry.category['@_term']]
    : []

  const primaryCategory =
    entry['arxiv:primary_category']?.['@_term'] ?? categories[0] ?? ''

  return {
    arxivId,
    title: String(entry.title).replace(/\s+/g, ' ').trim(),
    authors,
    abstract: String(entry.summary).replace(/\s+/g, ' ').trim(),
    primaryCategory,
    categories,
    published: entry.published,
    updated: entry.updated,
    htmlUrl: `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
  }
}

type ArxivFeed = {
  entry?: XmlEntry | XmlEntry[]
  'opensearch:totalResults'?: string | number
  'opensearch:startIndex'?: string | number
  'opensearch:itemsPerPage'?: string | number
}

function parseFeed(feed: ArxivFeed): SearchResponse {
  const entries = feed.entry
    ? Array.isArray(feed.entry)
      ? feed.entry
      : [feed.entry]
    : []

  return {
    papers: entries.map(parseEntry),
    totalResults: Number(feed['opensearch:totalResults'] ?? 0),
    startIndex: Number(feed['opensearch:startIndex'] ?? 0),
    itemsPerPage: Number(feed['opensearch:itemsPerPage'] ?? 0),
  }
}

async function fetchArxivXml(url: URL): Promise<ArxivFeed> {
  await throttle()

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'ArxivSearch/1.0 (research tool)' },
  })

  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'author' || name === 'category',
  })
  const parsed = parser.parse(xml)
  return parsed.feed as ArxivFeed
}

export async function searchArxiv(params: {
  query: string
  category?: string
  start?: number
  maxResults?: number
  sortBy?: 'relevance' | 'submittedDate'
}): Promise<SearchResponse> {
  const searchQuery = buildSearchQuery(params.query, params.category)

  const url = new URL(ARXIV_API_BASE)
  url.searchParams.set('search_query', searchQuery)
  url.searchParams.set('start', String(params.start ?? 0))
  url.searchParams.set('max_results', String(params.maxResults ?? 20))
  url.searchParams.set('sortBy', params.sortBy ?? 'submittedDate')
  url.searchParams.set('sortOrder', 'descending')

  const feed = await fetchArxivXml(url)
  return parseFeed(feed)
}

export async function fetchArxivById(arxivId: string): Promise<PaperSummary | null> {
  const url = new URL(ARXIV_API_BASE)
  url.searchParams.set('id_list', arxivId)

  try {
    const feed = await fetchArxivXml(url)
    const entries = feed.entry
      ? Array.isArray(feed.entry)
        ? feed.entry
        : [feed.entry]
      : []
    return entries.length > 0 ? parseEntry(entries[0]) : null
  } catch {
    return null
  }
}

export function buildSearchQuery(query: string, category?: string): string {
  const sanitizedQuery = query.trim()

  if (category && sanitizedQuery) {
    return `cat:${category} AND all:${sanitizedQuery}`
  }
  if (category) {
    return `cat:${category}`
  }
  if (sanitizedQuery) {
    return `all:${sanitizedQuery}`
  }
  return 'all:*'
}
