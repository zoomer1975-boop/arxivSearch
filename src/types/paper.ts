export interface PaperSummary {
  arxivId: string
  title: string
  authors: string[]
  abstract: string
  primaryCategory: string
  categories: string[]
  published: string
  updated: string
  htmlUrl: string
  pdfUrl: string
}

export interface SearchResponse {
  papers: PaperSummary[]
  totalResults: number
  startIndex: number
  itemsPerPage: number
}

export interface Reference {
  text: string
  arxivId?: string
  doi?: string
  arxivUrl?: string
  verified?: boolean
}
