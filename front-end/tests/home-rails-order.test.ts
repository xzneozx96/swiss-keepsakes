import type { PublicMapItem, PublicTourCard } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { mustVisitOrder, mustVisitsOf } from '@/features/home/lib/must-visits'
import { routeOrder } from '@/features/home/lib/routes'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function pin(n: number, over: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(n),
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
    mustVisit: true,
    tip: '',
    ...over,
  }
}

function tour(n: number, stayTag: PublicTourCard['stayTag']): PublicTourCard {
  return { id: id(n), slug: `tour-${n}`, title: `Tour ${n}`, stayTag, interests: [], durationMinutes: 120, stopCount: 4, coverKey: null, cover: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }
}

const names = (items: readonly { title: string }[]) => items.map(item => item.title)

describe('[E4.13][AC95] the must-visits', () => {
  it('keeps only the pins with the must-visit flag, in server order (AC-1)', () => {
    const pins = [pin(1), pin(2, { mustVisit: false }), pin(3)]

    expect(names(mustVisitsOf(pins))).toEqual(['Pin 1', 'Pin 3'])
  })

  it('puts the pin that matches an interest first and hides none (AC-1)', () => {
    const pins = [pin(1), pin(2), pin(3, { interests: ['food-drink'] }), pin(4)]
    const ordered = mustVisitOrder(pins, { stay: null, interests: ['food-drink'] })

    expect(names(ordered)).toEqual(['Pin 3', 'Pin 1', 'Pin 2', 'Pin 4'])
  })

  it('orders by interests first, then by stay fit, then by server order (the ticket: interests, then stay)', () => {
    const pins = [pin(1, { stayTag: 'multi_day' }), pin(2, { stayTag: 'short_stay' }), pin(3, { stayTag: 'multi_day', interests: ['food-drink'] })]

    expect(names(mustVisitOrder(pins, { stay: 'short_stay', interests: ['food-drink'] }))).toEqual(['Pin 3', 'Pin 2', 'Pin 1'])
  })

  it('keeps the server order with no answers', () => {
    const pins = [pin(1), pin(2, { interests: ['food-drink'] })]

    expect(names(mustVisitOrder(pins, { stay: null, interests: [] }))).toEqual(['Pin 1', 'Pin 2'])
  })
})

describe('[E4.13][AC95] the routes', () => {
  const tours = [tour(1, 'multi_day'), tour(2, 'short_stay'), tour(3, 'both'), tour(4, 'multi_day')]

  it('shows short-stay tours first for a short stay and for no answer, the neutral one in server order (AC-2)', () => {
    expect(names(routeOrder(tours, null))).toEqual(['Tour 2', 'Tour 3', 'Tour 1', 'Tour 4'])
    expect(names(routeOrder(tours, 'short_stay'))).toEqual(['Tour 2', 'Tour 3', 'Tour 1', 'Tour 4'])
  })

  it('shows multi-day tours first for a multi-day stay and drops none (AC-2)', () => {
    expect(names(routeOrder(tours, 'multi_day'))).toEqual(['Tour 1', 'Tour 3', 'Tour 4', 'Tour 2'])
  })
})
