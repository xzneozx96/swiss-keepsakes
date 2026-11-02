import { describe, expect, it } from 'vitest'

import { directionsUrl, googleMapsUrl, publicPins, toGuestPin } from '@/features/lab/map-guest-data'
import { seedPins as merchantPins } from '@/features/lab/pins-merchant-data'

describe('"Open in Google Maps" on the guest card', () => {
  const coordinates: [number, number] = [8.3077, 47.0517]

  it('opens the stored link of the place when it has one', () => {
    const link = 'https://maps.app.goo.gl/RiTbLwL8vxFxPzk38'

    expect(directionsUrl({ coordinates, mapsLink: link })).toBe(link)
  })

  it('opens the position when there is no link or an empty one', () => {
    expect(directionsUrl({ coordinates })).toBe(googleMapsUrl(coordinates))
    expect(directionsUrl({ coordinates, mapsLink: '' })).toBe('https://www.google.com/maps/search/?api=1&query=47.0517,8.3077')
  })

  it('carries the link from the merchant pin to the guest pin', () => {
    const merchant = merchantPins.find(pin => pin.mapsLink)!
    const guest = publicPins.find(pin => pin.id === merchant.id)!

    expect(toGuestPin(merchant)?.mapsLink).toBe(merchant.mapsLink)
    expect(directionsUrl(guest)).toBe(merchant.mapsLink)
    expect(directionsUrl(publicPins.find(pin => !pin.mapsLink)!)).toContain('/maps/search/?api=1&query=')
  })
})
