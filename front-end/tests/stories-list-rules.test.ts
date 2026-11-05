import type { StoryListItem, StoryListVersion } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'
import { languageState, storyTitle } from '@/features/stories/lib/list'

const version = (over: Partial<StoryListVersion> = {}): StoryListVersion => ({ status: 'draft', everPublished: false, editsNotLive: false, rowVersion: 1, updatedAt: '2026-11-03T08:00:00.000Z', ...over })
const published = (over: Partial<StoryListVersion> = {}) => version({ status: 'published', everPublished: true, ...over })

let counter = 0

function story(over: Partial<StoryListItem> & { en?: StoryListVersion | null, de?: StoryListVersion | null } = {}): StoryListItem {
  const { en = version(), de = null, ...rest } = over

  counter += 1

  return { groupId: `0198a000-0000-7000-8000-${String(counter).padStart(12, '0')}`, kind: 'story', title: { en: `Story ${counter}` }, cover: null, languages: { en, de }, updatedAt: '2026-11-03T08:00:00.000Z', ...rest }
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
})
