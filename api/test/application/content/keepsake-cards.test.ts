import type { ContentLanguage } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeKeepsakeCards } from '../../../src/modules/content/application/keepsake-cards.ts'

const item = (id: string, soldOut = false) => ({ id, slug: `s-${id}`, name: `N ${id}`, cover: null, soldOut, language: 'en' as ContentLanguage, requestedLanguage: 'en' as ContentLanguage, fallback: false, availableLanguages: ['en' as ContentLanguage] })

describe('[E4.4][AC31][AC54] keepsake cards of a story from the catalog list', () => {
  it('[E4.4][AC31] keeps the stored order, keeps a sold-out one flagged, skips an id the list lacks, and carries no price or language notice', async () => {
    const asked: ContentLanguage[] = []
    const cards = makeKeepsakeCards(async (language) => {
      asked.push(language)
      return { items: [item('a'), item('b', true), item('c')] }
    })

    const result = await cards(['c', 'unpublished', 'b', 'a'], 'de')

    expect(result).toEqual([
      { id: 'c', slug: 's-c', name: 'N c', cover: null, soldOut: false },
      { id: 'b', slug: 's-b', name: 'N b', cover: null, soldOut: true },
      { id: 'a', slug: 's-a', name: 'N a', cover: null, soldOut: false },
    ])
    expect(asked).toEqual(['de'])
  })
})
