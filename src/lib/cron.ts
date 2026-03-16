import { prisma } from '@/lib/prisma'
import { searchArxiv } from '@/lib/arxiv-api'
import { sendTelegramAlert } from '@/lib/telegram'
import { sendEmailAlert } from '@/lib/mailer'
import { subDays } from 'date-fns'

const RECENT_DAYS = 7

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface PaperMatch {
  title: string
  authors: string[]
  arxivId: string
  matchedKeywords: string[]
  matchedCategory: string
}

export async function runPaperCheck(): Promise<{
  queriesRun: number
  papersFound: number
  alertsSent: number
  errors: string[]
}> {
  const stats = {
    queriesRun: 0,
    papersFound: 0,
    alertsSent: 0,
    errors: [] as string[],
  }

  // Get all approved users with their interests
  const users = await prisma.user.findMany({
    where: { status: 'APPROVED' },
    include: { categories: true, keywords: true },
  })

  const since = subDays(new Date(), RECENT_DAYS)

  // Collect unique (category, keywords[]) pairs to deduplicate queries
  const queryMap = new Map<string, Set<string>>() // category -> set of keywords
  for (const user of users) {
    for (const cat of user.categories) {
      if (!queryMap.has(cat.category)) {
        queryMap.set(cat.category, new Set())
      }
      for (const kw of user.keywords) {
        queryMap.get(cat.category)!.add(kw.keyword)
      }
    }
  }

  if (queryMap.size === 0) {
    return stats
  }

  // Run deduplicated searches
  type PaperResult = {
    arxivId: string
    title: string
    authors: string[]
    abstract: string
    published: string
  }

  const resultsByQuery = new Map<string, PaperResult[]>() // "cat:kw1,kw2" -> papers

  for (const [category, keywordsSet] of queryMap.entries()) {
    const keywords = Array.from(keywordsSet)
    const query = keywords.length > 0 ? keywords.join(' OR ') : ''
    const queryKey = `${category}:${keywords.sort().join(',')}`

    try {
      const result = await searchArxiv({
        query,
        category,
        maxResults: 50,
        sortBy: 'submittedDate',
      })

      const recent = result.papers.filter(
        p => p.published && new Date(p.published) >= since
      )

      resultsByQuery.set(queryKey, recent.map(p => ({
        arxivId: p.arxivId,
        title: p.title,
        authors: p.authors,
        abstract: p.abstract,
        published: p.published,
      })))

      stats.queriesRun++
      stats.papersFound += recent.length
    } catch (err) {
      stats.errors.push(
        `Query failed for ${category}: ${(err as Error).message}`
      )
    }

    await sleep(3000) // Respect arXiv rate limit
  }

  // Match papers to users and collect new matches
  const userMatches = new Map<string, PaperMatch[]>()

  for (const user of users) {
    if (user.categories.length === 0 || user.keywords.length === 0) continue

    const userKeywordsLower = user.keywords.map(k => k.keyword.toLowerCase())
    const matches: PaperMatch[] = []

    for (const cat of user.categories) {
      const keywords = Array.from(queryMap.get(cat.category) ?? [])
      const queryKey = `${cat.category}:${keywords.sort().join(',')}`
      const papers = resultsByQuery.get(queryKey) ?? []

      for (const paper of papers) {
        const searchText = `${paper.title} ${paper.abstract}`.toLowerCase()
        const matchedKeywords = userKeywordsLower.filter(kw =>
          searchText.includes(kw)
        )

        if (matchedKeywords.length === 0) continue

        // Check if already notified
        try {
          const exists = await prisma.watchedPaper.findUnique({
            where: {
              userId_arxivId: { userId: user.id, arxivId: paper.arxivId },
            },
          })
          if (exists) continue
        } catch {
          continue
        }

        // Save to watchedPapers
        try {
          await prisma.watchedPaper.create({
            data: {
              userId: user.id,
              arxivId: paper.arxivId,
              title: paper.title,
              matchedKeywords: JSON.stringify(matchedKeywords),
              matchedCategory: cat.category,
            },
          })
          matches.push({
            title: paper.title,
            authors: paper.authors,
            arxivId: paper.arxivId,
            matchedKeywords,
            matchedCategory: cat.category,
          })
        } catch (err) {
          stats.errors.push(
            `Failed to save paper ${paper.arxivId} for user ${user.email}: ${(err as Error).message}`
          )
        }
      }
    }

    if (matches.length > 0) {
      userMatches.set(user.id, matches)
    }
  }

  // Send notifications
  for (const [userId, matches] of userMatches.entries()) {
    const user = users.find(u => u.id === userId)
    if (!user) continue

    const paperList = matches.map(m => ({
      title: m.title,
      authors: m.authors,
      arxivId: m.arxivId,
      matchedKeywords: m.matchedKeywords,
    }))

    try {
      if (user.alertMethod === 'EMAIL' || user.alertMethod === 'BOTH') {
        await sendEmailAlert(user.email, user.name, paperList)
      }
      if (
        (user.alertMethod === 'TELEGRAM' || user.alertMethod === 'BOTH') &&
        user.telegramChatId
      ) {
        await sendTelegramAlert(user.telegramChatId, paperList)
      }
      stats.alertsSent++
    } catch (err) {
      stats.errors.push(
        `Alert failed for ${user.email}: ${(err as Error).message}`
      )
    }
  }

  return stats
}
