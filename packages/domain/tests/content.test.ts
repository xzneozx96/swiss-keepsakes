import { describe, expect, it } from 'vitest'

import {
  canDeletePin,
  canDeleteStoryVersion,
  canDeleteTour,
  canMoveStoryVersion,
  hasText,
  languagesOf,
  pinPublishGaps,
  storyMediaIds,
  storyVersionPublishGaps,
  tourPublishGaps,
} from '../src/content'
import type { StoryDraft } from '../src/content'

const okPin = { title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3 }

describe('[E2.6] content/localized', () => {
  it('[E2.6] whitespace-only text has no text', () => {
    expect(hasText({ en: '   ', de: '' })).toBe(false)
    expect(hasText({})).toBe(false)
    expect(hasText(null)).toBe(false)
    expect(hasText(undefined)).toBe(false)
    expect(hasText({ de: ' x ' })).toBe(true)
    expect(languagesOf({ en: ' ', de: 'a' })).toEqual(['de'])
    expect(languagesOf({ en: 'a', de: 'b' })).toEqual(['de', 'en'])
  })
})

describe('[E2.6] content/pin', () => {
  it('[E2.6][AC85] a pin with a one-language title, a location and a slug has no gaps (no story, no category)', () => {
    expect(pinPublishGaps(okPin)).toEqual([])
  })

  it.each([
    ['title', { title: {} }],
    ['location', { longitude: null }],
    ['slug', { slug: null }],
    ['slug', { slug: { en: 'a' }, title: { en: 'a', de: 'b' } }],
  ] as const)('[E2.6][AC68] a pin lacking %s reports exactly that gap', (gap, over) => {
    expect(pinPublishGaps({ ...okPin, ...over })).toEqual([gap])
  })

  it('[E2.6][AC68] a title in DE only publishes with a DE-only slug', () => {
    expect(pinPublishGaps({ title: { de: 'Brücke' }, slug: { de: 'bruecke' }, latitude: 1, longitude: 2 })).toEqual([])
    expect(pinPublishGaps({ title: { de: 'Brücke' }, slug: { en: 'bridge' }, latitude: 1, longitude: 2 })).toEqual(['slug'])
  })

  it('[E2.6][AC79] only a never-published pin can be deleted', () => {
    expect(canDeletePin({ firstPublishedAt: null })).toBe(true)
    expect(canDeletePin({ firstPublishedAt: new Date('2026-10-01T00:00:00Z') })).toBe(false)
  })
})

describe('[E2.6] content/story', () => {
  it('[E2.6][AC30] a story version with a title and a slug has no gaps and no rule asks for a second language', () => {
    expect(storyVersionPublishGaps({ title: 'Lucerne', slug: 'lucerne' })).toEqual([])
    expect(storyVersionPublishGaps({ title: '  ', slug: null })).toEqual(['title', 'slug'])
    expect(storyVersionPublishGaps({ title: 'x', slug: ' ' })).toEqual(['slug'])
  })

  it('[E2.6][AC30] a published story version cannot move to another group, a draft can', () => {
    expect(canMoveStoryVersion({ status: 'published', published: null })).toBe(false)
    expect(canMoveStoryVersion({ status: 'draft', published: null })).toBe(true)
  })

  it('[E2.6] a story version that kept published text cannot be deleted', () => {
    const doc = { title: 't' } as StoryDraft
    expect(canDeleteStoryVersion({ published: doc })).toBe(false)
    expect(canDeleteStoryVersion({ published: null })).toBe(true)
  })

  it('[E2.6] storyMediaIds lists cover, image and audio blocks once', () => {
    const doc: StoryDraft = {
      title: 't',
      excerpt: '',
      intro: '',
      authorName: '',
      authorRole: '',
      readMinutes: null,
      coverMediaId: 'm1',
      sections: [{
        id: 's1',
        heading: 'h',
        blocks: [
          { type: 'paragraph', text: 'p' },
          { type: 'image', mediaId: 'm1', caption: '' },
          { type: 'image', mediaId: 'm2', caption: '' },
          { type: 'video', youtubeId: 'y', title: '', caption: '' },
          { type: 'audio', mediaId: 'm3', title: '', caption: '' },
          { type: 'image', mediaId: 'm2', caption: 'again' },
        ],
      }],
    }
    expect(storyMediaIds(doc)).toEqual([
      { id: 'm1', kind: 'image' },
      { id: 'm2', kind: 'image' },
      { id: 'm3', kind: 'audio' },
    ])
  })
})

describe('[E2.6] content/tour', () => {
  it('[E2.6] tour gaps name pdf when no PDF is set', () => {
    const base = { title: { en: 'Old town' }, slug: { en: 'old-town' }, pdfMediaId: null }
    expect(tourPublishGaps(base)).toEqual(['pdf'])
    expect(tourPublishGaps({ ...base, pdfMediaId: 'pdf1' })).toEqual([])
    expect(tourPublishGaps({ ...base, title: {}, slug: null, pdfMediaId: 'pdf1' })).toEqual(['title'])
    expect(tourPublishGaps({ ...base, slug: { de: 'x' }, pdfMediaId: 'pdf1' })).toEqual(['slug'])
  })

  it('[E2.6] only a draft tour that never published can be deleted', () => {
    expect(canDeleteTour({ status: 'draft', published: null })).toBe(true)
    expect(canDeleteTour({ status: 'published', published: null })).toBe(false)
  })
})
