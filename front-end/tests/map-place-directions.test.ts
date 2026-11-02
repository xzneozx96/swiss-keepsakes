import { describe, expect, it } from 'vitest'

import { directionsUrl } from '@/features/map/lib/directions'

const here = { latitude: 47.0516, longitude: 8.3074 }

describe('[E4.7][AC89] directions link', () => {
  it('opens the stored Google Maps link when the place has one', () => {
    const link = 'https://www.google.com/maps/place/Chapel+Bridge/@47.0516,8.3074,17z'

    expect(directionsUrl({ ...here, mapsLink: link })).toBe(link)
  })

  it('falls back to the position, destination only', () => {
    const url = new URL(directionsUrl({ ...here, mapsLink: null }))

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/')
    expect([...url.searchParams.keys()].sort()).toEqual(['api', 'query'])
    expect(url.searchParams.get('query')).toBe('47.0516,8.3074')
  })

  it('does not trust a stored link that is not https', () => {
    expect(directionsUrl({ ...here, mapsLink: 'javascript:alert(1)' })).toContain('/maps/search/?api=1&query=')
    expect(directionsUrl({ ...here, mapsLink: 'http://maps.google.com/x' })).toContain('/maps/search/?api=1&query=')
  })
})
