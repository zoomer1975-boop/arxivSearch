/**
 * Multi-provider AI client.
 *
 * Set these environment variables:
 *   AI_PROVIDER   = anthropic | openai | gemini | local  (default: anthropic)
 *   AI_MODEL      = model name (e.g. claude-sonnet-4-20250514, gpt-4o, gemini-2.0-flash)
 *   AI_API_KEY    = API key for the selected provider
 *   AI_BASE_URL   = custom base URL (required for local, optional override for others)
 *
 * Provider base URLs used when AI_BASE_URL is not set:
 *   anthropic  → Anthropic SDK (native)
 *   openai     → https://api.openai.com/v1
 *   gemini     → https://generativelanguage.googleapis.com/v1beta/openai
 *   local      → http://localhost:11434/v1  (Ollama default)
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

type Provider = 'anthropic' | 'openai' | 'gemini' | 'local'

const DEFAULT_BASE_URLS: Record<Exclude<Provider, 'anthropic'>, string> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  local: 'http://localhost:11434/v1',
}

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  local: 'llama3',
}

function getProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase()
  if (p === 'anthropic' || p === 'openai' || p === 'gemini' || p === 'local') {
    return p
  }
  throw new Error(`Unknown AI_PROVIDER "${p}". Must be one of: anthropic, openai, gemini, local`)
}

function getModel(): string {
  return process.env.AI_MODEL ?? DEFAULT_MODELS[getProvider()]
}

function getApiKey(): string | undefined {
  return process.env.AI_API_KEY ?? process.env.ANTHROPIC_API_KEY
}

// ─── Anthropic client (native SDK) ────────────────────────────────────────────

function createAnthropicClient(): Anthropic {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('AI_API_KEY (or ANTHROPIC_API_KEY) is required for provider "anthropic"')
  return new Anthropic({ apiKey })
}

async function callAnthropic(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const client = createAnthropicClient()
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected non-text response from Anthropic')
  return block.text
}

// ─── OpenAI-compatible client (OpenAI / Gemini / local) ───────────────────────

function createOpenAIClient(): OpenAI {
  const provider = getProvider() as Exclude<Provider, 'anthropic'>
  const apiKey = getApiKey() ?? 'local' // Ollama doesn't require a real key
  const baseURL = process.env.AI_BASE_URL ?? DEFAULT_BASE_URLS[provider]
  return new OpenAI({ apiKey, baseURL })
}

async function callOpenAICompat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const client = createOpenAIClient()
  const response = await client.chat.completions.create({
    model: getModel(),
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from AI provider')
  return content
}

// ─── Unified call ──────────────────────────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const provider = getProvider()
  if (provider === 'anthropic') {
    return callAnthropic(systemPrompt, userContent, maxTokens)
  }
  return callOpenAICompat(systemPrompt, userContent, maxTokens)
}

// ─── Public API ────────────────────────────────────────────────────────────────

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
  return callAI(
    SUMMARY_SYSTEM_PROMPT,
    `Title: ${title}\n\nAbstract: ${abstract}`,
    1024
  )
}

export async function translateToKorean(text: string): Promise<string> {
  return callAI(
    'You are a scientific paper translator. Translate the given English text to Korean accurately, preserving technical terms where appropriate (show original English term in parentheses for key technical terms).',
    text,
    4096
  )
}
