import { beforeEach, describe, expect, it } from 'vitest'

import { storyLanguages } from '@/features/content/lib/story-versions'
import { articleSeed } from '@/features/content/seed'
import { createSeedState } from '@/features/demo/seed'

function saveArticles(articles: typeof articleSeed) {
  const state = createSeedState()

  localStorage.setItem('sk.demo', JSON.stringify({ ...state, data: { ...state.data, articles } }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('storyLanguages', () => {
  it('returns only English for the English-only fixture story', () => {
    expect(storyLanguages('a-quiet-morning-on-the-reuss')).toEqual(['en'])
  })

  it('returns only German for the German-only fixture story', () => {
    expect(storyLanguages('ein-ruhiger-morgen-an-der-reuss')).toEqual(['de'])
  })

  it('returns both languages for a seeded story that shares one slug', () => {
    expect([...storyLanguages('musegg-morning')].sort()).toEqual(['de', 'en'])
  })

  it('returns nothing for an unknown slug', () => {
    expect(storyLanguages('nope')).toEqual([])
  })

  describe('in the browser, from the saved demo store', () => {
    const waterTower = articleSeed.find(a => a.slug === 'water-tower')!

    it('counts a German version the merchant published', () => {
      saveArticles([...articleSeed, { ...waterTower, id: 'water-tower-de', language: 'de' }])

      expect([...storyLanguages('water-tower')].sort()).toEqual(['de', 'en'])
    })

    it('leaves out a German version that is not published', () => {
      saveArticles([...articleSeed, { ...waterTower, id: 'water-tower-de', language: 'de', publication: { status: 'draft' } } as typeof waterTower])

      expect(storyLanguages('water-tower')).toEqual(['en'])
    })

    it('knows a story made in the browser', () => {
      saveArticles([...articleSeed, { ...waterTower, id: 'mine-de', slug: 'mine', language: 'de' }])

      expect(storyLanguages('mine')).toEqual(['de'])
    })

    it('still adds the fixtures outside production', () => {
      saveArticles(articleSeed)

      expect(storyLanguages('a-quiet-morning-on-the-reuss')).toEqual(['en'])
    })
  })
})
