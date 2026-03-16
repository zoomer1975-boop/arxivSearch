import { describe, it, expect } from 'vitest'
import { buildSearchQuery } from '../arxiv-api'

// Test the pure buildSearchQuery function (no network required)
describe('buildSearchQuery', () => {
  it('returns all:query when only query provided', () => {
    expect(buildSearchQuery('transformer')).toBe('all:transformer')
  })

  it('returns cat:category when only category provided', () => {
    expect(buildSearchQuery('', 'cs.AI')).toBe('cat:cs.AI')
  })

  it('combines category and query', () => {
    expect(buildSearchQuery('attention', 'cs.LG')).toBe('cat:cs.LG AND all:attention')
  })

  it('returns all:* for empty query and no category', () => {
    expect(buildSearchQuery('')).toBe('all:*')
  })
})
