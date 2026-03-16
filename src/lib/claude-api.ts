import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SUMMARY_SYSTEM_PROMPT = `You are a research paper summarizer. Provide a structured summary with:
1. Main Research Question / Objective
2. Methodology
3. Key Findings / Results
4. Significance / Contributions
5. Limitations (if mentioned)
Keep each section to 2-3 sentences. Be precise and technical.`

export async function summarizePaper(
  abstract: string,
  title: string
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\nAbstract: ${abstract}`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

export async function translateToKorean(text: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:
      'You are a scientific paper translator. Translate the given English text to Korean accurately, preserving technical terms where appropriate (show original English term in parentheses for key technical terms).',
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}
