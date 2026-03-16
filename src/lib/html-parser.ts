import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'em', 'a', 'img', 'table', 'thead', 'tbody',
  'tr', 'td', 'th', 'div', 'span', 'section', 'article',
  'figure', 'figcaption', 'sup', 'sub',
]

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'class', 'id', 'title', 'target', 'rel',
]

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

const ARXIV_PATTERN = /arxiv[:\s]*(\d{4}\.\d{4,5})/gi
const DOI_PATTERN = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi

export function extractReferences(
  html: string
): Array<{ text: string; arxivId?: string; doi?: string }> {
  // Find references section by common ID/class patterns
  const refSectionMatch = html.match(
    /<[^>]*(?:id|class)="[^"]*(?:ref|bib)[^"]*"[^>]*>([\s\S]*?)(?=<h[1-6]|<\/body|$)/i
  )
  if (!refSectionMatch) return []

  const refHtml = refSectionMatch[0]
  const listItems = refHtml.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? []

  return listItems.map(item => {
    const text = item.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    ARXIV_PATTERN.lastIndex = 0
    DOI_PATTERN.lastIndex = 0

    const arxivMatch = ARXIV_PATTERN.exec(text)
    const doiMatch = DOI_PATTERN.exec(text)

    return {
      text,
      arxivId: arxivMatch?.[1],
      doi: doiMatch?.[0],
    }
  })
}
