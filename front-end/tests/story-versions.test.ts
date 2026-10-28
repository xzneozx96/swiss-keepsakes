import { describe, expect, it } from 'vitest'

import { storyLanguages } from '@/features/content/lib/story-versions'

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
})
