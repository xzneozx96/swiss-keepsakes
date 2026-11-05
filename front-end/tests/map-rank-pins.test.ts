import type { PublicMapItem } from '@sk/api-contract'

import { rankByTags } from '@sk/domain/content'

import { describe, expect, it } from 'vitest'

function pin(n: number, extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    address: null,
    weeklyHours: [],
    title: `Pin ${n}`,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
    ...extra,
  }
}

const slugs = (list: readonly PublicMapItem[]) => list.map(item => item.slug)

describe('[E4.5][AC44] a short stay sinks a multi-day pin without hiding it', () => {
  it('puts the multi-day pin after every short-stay and both pin and keeps the count', () => {
    const list = [pin(1, { stayTag: 'multi_day' }), pin(2, { stayTag: 'short_stay' }), pin(3, { stayTag: 'both' }), pin(4, { stayTag: 'short_stay' })]
    const ranked = rankByTags(list, { stay: 'short_stay', interests: [] })

    expect(slugs(ranked)).toEqual(['pin-2', 'pin-3', 'pin-4', 'pin-1'])
    expect(ranked).toHaveLength(list.length)
  })
})

describe('[E4.5][AC38] interests move matching pins up', () => {
  it('puts food-drink pins first, keeps the count and the server order inside each group', () => {
    const list = [pin(1), pin(2, { interests: ['food-drink'] }), pin(3), pin(4, { interests: ['food-drink', 'not-an-interest'] })]
    const ranked = rankByTags(list, { stay: null, interests: ['food-drink'] })

    expect(slugs(ranked)).toEqual(['pin-2', 'pin-4', 'pin-1', 'pin-3'])
    expect(ranked).toHaveLength(list.length)
  })

  it('keeps the input order when nothing is chosen', () => {
    const list = [pin(3, { stayTag: 'multi_day' }), pin(1), pin(2, { interests: ['food-drink'] })]

    expect(slugs(rankByTags(list, { stay: null, interests: [] }))).toEqual(['pin-3', 'pin-1', 'pin-2'])
  })
})
