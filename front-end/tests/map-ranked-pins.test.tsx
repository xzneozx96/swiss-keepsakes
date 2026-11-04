import type { PublicMapItem } from '@sk/api-contract'

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useRankedPins } from '@/features/map/hooks/use-ranked-pins'
import { resetAnswersStoreForTests, saveAnswers, saveStay } from '@/features/onboarding/lib/answers-store'

function pin(n: number, extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
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

const list = [pin(1, { stayTag: 'multi_day' }), pin(2, { stayTag: 'short_stay', interests: ['food-drink'] }), pin(3, { stayTag: 'both' })]
const slugs = (pins: readonly PublicMapItem[]) => pins.map(item => item.slug)

beforeEach(() => {
  localStorage.clear()
  resetAnswersStoreForTests()
})

describe('[E4.5][AC93] no answers keep the server order', () => {
  it('returns the very same array', () => {
    const { result } = renderHook(() => useRankedPins(list))

    expect(result.current).toBe(list)
  })
})

describe('[E4.5][AC44] the answers order the pins and hide none', () => {
  it('sinks the multi-day pin for a short stay', () => {
    saveStay('short_stay')
    const { result } = renderHook(() => useRankedPins(list))

    expect(slugs(result.current)).toEqual(['pin-2', 'pin-3', 'pin-1'])
    expect(result.current).toHaveLength(list.length)
  })
})

describe('[E4.5][AC38] interests order the pins', () => {
  it('moves the matching pin first', () => {
    saveAnswers({ stay: null, interests: ['food-drink'] })
    const { result } = renderHook(() => useRankedPins(list))

    expect(slugs(result.current)).toEqual(['pin-2', 'pin-1', 'pin-3'])
  })
})

describe('[E4.5][AC44] the order changes with the pins and the answers only', () => {
  it('returns the same array across re-renders with the same pins and answers', () => {
    saveStay('short_stay')
    const { result, rerender } = renderHook(({ pins, tick }: { pins: PublicMapItem[], tick: number }) => ({ ranked: useRankedPins(pins), tick }), { initialProps: { pins: list, tick: 0 } })
    const first = result.current.ranked

    rerender({ pins: list, tick: 1 })
    rerender({ pins: list, tick: 2 })

    expect(result.current.tick).toBe(2)
    expect(result.current.ranked).toBe(first)
  })

  it('ranks again when the answers change and when the pins change', () => {
    saveStay('short_stay')
    const { result, rerender } = renderHook(({ pins }: { pins: PublicMapItem[] }) => useRankedPins(pins), { initialProps: { pins: list } })
    const first = result.current

    act(() => saveStay('multi_day'))
    expect(slugs(result.current)).toEqual(['pin-1', 'pin-3', 'pin-2'])
    expect(result.current).not.toBe(first)

    const more = [...list, pin(4, { stayTag: 'short_stay' })]

    rerender({ pins: more })
    expect(slugs(result.current)).toEqual(['pin-1', 'pin-3', 'pin-2', 'pin-4'])
  })
})
