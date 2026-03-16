import TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

function getBot(): TelegramBot {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
  }
  if (!bot) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  }
  return bot
}

interface PaperAlert {
  title: string
  authors: string[]
  arxivId: string
  matchedKeywords: string[]
}

export async function sendTelegramAlert(
  chatId: string,
  papers: PaperAlert[]
): Promise<void> {
  const b = getBot()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const MAX_PAPERS_PER_MESSAGE = 5
  const displayed = papers.slice(0, MAX_PAPERS_PER_MESSAGE)

  const paperLines = displayed
    .map(
      (p, i) =>
        `*${i + 1}. ${escapeMarkdown(p.title)}*\n` +
        `👥 ${escapeMarkdown(p.authors.slice(0, 2).join(', '))}\n` +
        `🏷 ${escapeMarkdown(p.matchedKeywords.join(', '))}\n` +
        `🔗 ${siteUrl}/paper/${p.arxivId}`
    )
    .join('\n\n')

  const overflow =
    papers.length > MAX_PAPERS_PER_MESSAGE
      ? `\n\n_...and ${papers.length - MAX_PAPERS_PER_MESSAGE} more on your My Page_`
      : ''

  const message =
    `📚 *${papers.length} new paper(s) found\\!*\n\n${paperLines}${overflow}`

  await b.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' })
}

function escapeMarkdown(text: string): string {
  // Escape special characters for Telegram MarkdownV2
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}
