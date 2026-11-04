import type { ContentLanguage } from '@sk/domain/content'
import { describe, expect, it, vi } from 'vitest'
import { makeKeepsakeCards } from '../../../src/modules/content/application/keepsake-cards.ts'

const item = (id: string, soldOut = false) => ({ id, slug: `s-${id}`, name: `N ${id}`, cover: null, soldOut, language: 'en' as ContentLanguage, requestedLanguage: 'en' as ContentLanguage, fallback: false, availableLanguages: ['en' as ContentLanguage] })

describe('[E4.4][AC31][AC54] keepsake cards of a story from the catalog read by id', () => {
  it('[E4.4][AC31] asks the catalog for the story\'s ids only, keeps a sold-out one flagged, and carries no price or language notice', async () => {
    const asked: [string[], ContentLanguage][] = []
    const cards = makeKeepsakeCards(async (ids, language) => {
      asked.push([ids, language])
      return { items: [item('c'), item('b', true), item('a')] }
    }, vi.fn())

    const result = await cards(['c', 'b', 'a'], 'de')

    expect(result).toEqual([
      { id: 'c', slug: 's-c', name: 'N c', cover: null, soldOut: false },
      { id: 'b', slug: 's-b', name: 'N b', cover: null, soldOut: true },
      { id: 'a', slug: 's-a', name: 'N a', cover: null, soldOut: false },
    ])
    expect(asked).toEqual([[['c', 'b', 'a'], 'de']])
  })

  it('[E4.4][AC31] a failing card read gives no cards and reports the error, so the story text still shows', async () => {
    const boom = new Error('stock down')
    const onError = vi.fn()
    const cards = makeKeepsakeCards(async () => {
      throw boom
    }, onError)

    expect(await cards(['a'], 'en')).toEqual([])
    expect(onError).toHaveBeenCalledWith(boom)
  })
})
