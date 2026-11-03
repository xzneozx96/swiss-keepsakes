import type { StoryListItem, StoryListVersion } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'
import { deleteBlock, filterStories, languageState, storyTitle, tabCounts } from '@/features/stories/lib/list'

const version = (over: Partial<StoryListVersion> = {}): StoryListVersion => ({ status: 'draft', everPublished: false, editsNotLive: false, rowVersion: 1, updatedAt: '2026-11-03T08:00:00.000Z', ...over })
const published = (over: Partial<StoryListVersion> = {}) => version({ status: 'published', everPublished: true, ...over })

let counter = 0

function story(over: Partial<StoryListItem> & { en?: StoryListVersion | null, de?: StoryListVersion | null } = {}): StoryListItem {
  const { en = version(), de = null, ...rest } = over

  counter += 1

  return { groupId: `0198a000-0000-7000-8000-${String(counter).padStart(12, '0')}`, kind: 'story', title: { en: `Story ${counter}` }, cover: null, languages: { en, de }, updatedAt: '2026-11-03T08:00:00.000Z', ...rest }
}

/** The ticket's outline: 2 published stories and 3 that only have drafts. */
function five() {
  return [
    story({ title: { en: 'Bridge' }, en: published() }),
    story({ title: { de: 'Brücke' }, en: null, de: published() }),
    story({ title: { en: 'Lake' } }),
    story({ title: { en: 'Mountain' }, de: version() }),
    story({ title: { en: 'Old town' }, en: version({ everPublished: true }) }),
  ]
}

describe('[E4.3][AC30] story list rules', () => {
  it('[E4.3][AC30] AC-1 languageState reads published, draft and none', () => {
    expect(languageState(published())).toBe('published')
    expect(languageState(published({ editsNotLive: true }))).toBe('published')
    expect(languageState(version())).toBe('draft')
    expect(languageState(version({ everPublished: true }))).toBe('draft')
    expect(languageState(null)).toBe('none')
  })

  it('[E4.3][AC30] the title is English, then German, and empty when neither has one', () => {
    expect(storyTitle(story({ title: { en: 'Bridge', de: 'Brücke' } }))).toBe('Bridge')
    expect(storyTitle(story({ title: { de: 'Brücke' } }))).toBe('Brücke')
    expect(storyTitle(story({ title: { en: '   ', de: 'Brücke' } }))).toBe('Brücke')
    expect(storyTitle(story({ title: {} }))).toBe('')
  })

  it.each([
    ['all', 5],
    ['published', 2],
    ['drafts', 3],
  ] as const)('[E4.3][AC30] AC-2 two published and three draft-only stories count All 5, Published 2, Drafts 3 and the %s tab shows %i rows', (tab, rows) => {
    const items = five()

    expect(tabCounts(items, '')).toEqual({ all: 5, published: 2, drafts: 3 })
    expect(filterStories(items, tab, '')).toHaveLength(rows)
  })

  it('[E4.3][AC30] AC-2 a story that was published and then unpublished is a draft', () => {
    const items = [story({ en: version({ everPublished: true }) })]

    expect(tabCounts(items, '')).toEqual({ all: 1, published: 0, drafts: 1 })
  })

  it('[E4.3][AC30] AC-2 the search matches either title, ignores case and spaces, and the counts follow it', () => {
    const items = five()

    expect(filterStories(items, 'all', '  BRÜCKE ').map(storyTitle)).toEqual(['Brücke'])
    expect(filterStories(items, 'all', 'bridge').map(storyTitle)).toEqual(['Bridge'])
    expect(tabCounts(items, 'o')).toEqual({ all: 2, published: 0, drafts: 2 })
    expect(filterStories(items, 'published', 'zzz')).toEqual([])
    expect(filterStories([story({ title: { en: 'Bridge', de: 'Brücke' } })], 'all', 'brü')).toHaveLength(1)
  })

  it('[E4.3][AC30] AC-4 deleteBlock is published, was-published or null', () => {
    expect(deleteBlock(story({ en: published() }))).toBe('published')
    expect(deleteBlock(story({ en: version(), de: published() }))).toBe('published')
    expect(deleteBlock(story({ en: version({ everPublished: true }) }))).toBe('was-published')
    expect(deleteBlock(story({ en: version(), de: version({ everPublished: true }) }))).toBe('was-published')
    expect(deleteBlock(story({ en: version(), de: version() }))).toBeNull()
    expect(deleteBlock(story({ en: null, de: version() }))).toBeNull()
  })
})
