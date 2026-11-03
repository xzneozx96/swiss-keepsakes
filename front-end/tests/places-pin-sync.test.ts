import { describe, expect, it } from 'vitest'

import { parseMapsLink } from '@/features/places/lib/maps-link'
import { addressMayNotMatch, distanceMetres, linkToPin, movedAway } from '@/features/places/lib/pin-sync'

const bridge = { lat: 47.0516489, lng: 8.3049602 }

describe('distanceMetres', () => {
  it('is 0 for the same spot and about 111 m for 0.001 degrees of latitude', () => {
    expect(distanceMetres(bridge, bridge)).toBe(0)
    expect(distanceMetres(bridge, { lat: bridge.lat + 0.001, lng: bridge.lng })).toBeGreaterThan(110)
    expect(distanceMetres(bridge, { lat: bridge.lat + 0.001, lng: bridge.lng })).toBeLessThan(112)
  })
})

describe('movedAway', () => {
  it('ignores a nudge inside the tolerance and sees one beyond it', () => {
    expect(movedAway(bridge, { lat: bridge.lat + 0.00005, lng: bridge.lng })).toBe(false)
    expect(movedAway(bridge, { lat: bridge.lat + 0.0002, lng: bridge.lng })).toBe(true)
  })

  it('is false when there is nothing to compare', () => {
    expect(movedAway(null, bridge)).toBe(false)
    expect(movedAway(bridge, null)).toBe(false)
  })
})

describe('linkToPin', () => {
  it('makes a link the parser reads back to the same position', () => {
    const link = linkToPin(bridge)

    expect(link).toBe('https://www.google.com/maps?q=47.05165,8.30496')
    expect(parseMapsLink(link)).toEqual({ kind: 'position', latitude: 47.05165, longitude: 8.30496 })
  })

  it('works for negative and whole numbers', () => {
    expect(parseMapsLink(linkToPin({ lat: 47, lng: -8.5 }))).toEqual({ kind: 'position', latitude: 47, longitude: -8.5 })
  })
})

describe('addressMayNotMatch', () => {
  it('warns when the pin left the spot of the typing, or there was no pin then', () => {
    expect(addressMayNotMatch(bridge, { lat: bridge.lat + 0.001, lng: bridge.lng })).toBe(true)
    expect(addressMayNotMatch(null, bridge)).toBe(true)
  })

  it('does not warn while the pin is where it was, or when there is no pin', () => {
    expect(addressMayNotMatch(bridge, bridge)).toBe(false)
    expect(addressMayNotMatch(bridge, null)).toBe(false)
    expect(addressMayNotMatch(null, null)).toBe(false)
  })
})
