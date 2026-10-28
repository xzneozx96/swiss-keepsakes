import { describe, expect, it } from 'vitest'

import { findStory, guestPins, toGuestPin, weekdayName } from '@/features/lab/map-guest-data'
import { seedPins } from '@/features/lab/pins-merchant-data'

const seed = (id: string) => structuredClone(seedPins.find(p => p.id === id)!)

describe('[S4 lab] the guest map reads the merchant pins', () => {
  it('shows only published, placed pins whose dates are not over', () => {
    const ids = guestPins(seedPins).map(p => p.id)

    expect(ids).toContain('p1')
    expect(ids).not.toContain('p5') // hidden
    expect(ids).not.toContain('p6') // only date was 26 Oct
    expect(ids).not.toContain('p7') // draft without a location
  })

  it('follows an edit: a moved pin and a new tip', () => {
    const pin = { ...seed('p1'), lat: 47.05, lng: 8.3, tip: { en: 'New tip', de: '' } }
    const guest = toGuestPin(pin)!

    expect(guest.coordinates).toEqual([8.3, 47.05])
    expect(guest.tip).toEqual({ en: 'New tip' })
  })

  it('cannot draw a pin without a location', () => {
    expect(toGuestPin(seed('p7'))).toBeUndefined()
  })

  it('links the main story only in the languages it is published in', () => {
    // s2 is published in English and only drafted in German, so the German card drops it.
    expect(toGuestPin(seed('p2'))!.mainStory).toBe('chapel-bridge-paintings')
    expect(findStory('chapel-bridge-paintings')!.title).toEqual({ en: 'The paintings under the Chapel Bridge roof' })
  })

  it('names all seven weekdays', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(day => weekdayName(day, 'en', 'short')))
      .toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })
})
