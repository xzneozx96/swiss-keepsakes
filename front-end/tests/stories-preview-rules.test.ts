import type { PinListItem, ProductListItem, StoryListItem } from '@sk/api-contract'
import type { StoryBlock } from '@/features/places/lib/story-text'

import { describe, expect, it } from 'vitest'

import { contentsOf, headingsOf, keepsakesOf, pinHrefFor, placesOf, previewPin, relatedOf } from '@/features/stories/lib/preview-rules'

const pinRow = (id: string, over: Partial<PinListItem> = {}) => ({ id, status: 'published', title: { en: `Pin ${id}` }, slug: { en: `pin-${id}` }, outboundUrl: null, ...over }) as unknown as PinListItem
const keepsake = (id: string, over: Partial<ProductListItem> = {}) => ({ id, status: 'published', name: { en: `Keepsake ${id}` }, cover: null, ...over }) as unknown as ProductListItem
const story = (groupId: string, languages: Record<string, { status: string } | null>, title: Record<string, string> = { en: groupId, de: groupId }) => ({ groupId, title, cover: null, languages }) as unknown as StoryListItem
const heading = (level: 2 | 3, text: string): StoryBlock => ({ type: 'heading', level, inlines: text === '' ? [] : [{ text }] })

describe('[E4.3][AC33] AC-4 relatedOf', () => {
  const items = [
    story('a', { en: { status: 'published' }, de: { status: 'published' } }),
    story('b', { en: { status: 'published' }, de: null }),
    story('c', { en: null, de: { status: 'draft' } }),
    story('self', { en: { status: 'published' }, de: { status: 'published' } }),
  ]

  it('drops a story without the language, one with only a draft, and the story itself, in the order of ids', () => {
    expect(relatedOf(['self', 'c', 'b', 'a'], items, 'de', 'self').map(entry => entry.groupId)).toEqual(['a'])
    expect(relatedOf(['b', 'a'], items, 'en', 'self').map(entry => entry.groupId)).toEqual(['b', 'a'])
  })

  it('falls back to the other language for the title', () => {
    expect(relatedOf(['x'], [story('x', { en: { status: 'published' } }, { en: 'Only English' })], 'en', 's')[0]?.title).toBe('Only English')
  })
})

describe('[E4.3][AC54] AC-2 keepsakesOf', () => {
  it('keeps published ones in the order of ids, with no price field', () => {
    const result = keepsakesOf(['k2', 'k1', 'k3', 'gone'], [keepsake('k1'), keepsake('k2'), keepsake('k3', { status: 'draft' }), keepsake('k4', { status: 'archived' })], 'en')

    expect(result.map(entry => entry.id)).toEqual(['k2', 'k1'])
    expect(Object.keys(result[0]!).sort()).toEqual(['id', 'name', 'photo'])
  })

  it('names a keepsake in the other language when the open one has none', () => {
    expect(keepsakesOf(['k1'], [keepsake('k1', { name: { en: 'Cowbell' } as never })], 'de')[0]?.name).toBe('Cowbell')
  })
})

describe('[E4.3][AC45] AC-3 pins', () => {
  it('counts an ended pin as published and falls back to the other language', () => {
    const pin = previewPin(pinRow('p', { status: 'ended', title: { en: 'Wall' } as never, slug: { en: 'wall' } as never }), 'de')

    expect(pin).toMatchObject({ published: true, name: 'Wall', slug: 'wall' })
  })

  it('gives the website, the map link, and null for a draft pin and an unknown id', () => {
    const pins = [
      previewPin(pinRow('site', { outboundUrl: 'https://zyt.example' }), 'en'),
      previewPin(pinRow('map'), 'en'),
      previewPin(pinRow('draft', { status: 'draft', outboundUrl: 'https://x.example' }), 'en'),
    ]
    const href = pinHrefFor(pins, 'en')

    expect(href('site')).toBe('https://zyt.example')
    expect(href('map')).toBe('/en/map?place=pin-map')
    expect(href('draft')).toBeNull()
    expect(href('unknown')).toBeNull()
  })

  it('lists places in the order of ids, published only', () => {
    const pins = [previewPin(pinRow('a'), 'en'), previewPin(pinRow('b', { status: 'draft' }), 'en'), previewPin(pinRow('c'), 'en')]

    expect(placesOf(['c', 'b', 'a', 'x'], pins).map(pin => pin.id)).toEqual(['c', 'a'])
  })
})

describe('[E4.3][AC45] AC-5 contents', () => {
  it('is empty for one H2, and for one H2 and an H3', () => {
    expect(contentsOf(headingsOf([heading(2, 'One')]))).toEqual([])
    expect(contentsOf(headingsOf([heading(2, 'One'), heading(3, 'Sub')]))).toEqual([])
  })

  it('has both entries for two H2, skips an empty one, and gives equal texts different ids', () => {
    const entries = contentsOf(headingsOf([heading(2, 'Same'), heading(2, ''), heading(2, 'Same')]))

    expect(entries.map(entry => entry.heading)).toEqual(['Same', 'Same'])
    expect(new Set(entries.map(entry => entry.id)).size).toBe(2)
  })

  it('finds headings nested in a quote or a list, in document order', () => {
    const nested: StoryBlock[] = [{ type: 'quote', blocks: [heading(2, 'Inside')] }, heading(3, 'After')]

    expect(headingsOf(nested).map(entry => entry.text)).toEqual(['Inside', 'After'])
  })
})
