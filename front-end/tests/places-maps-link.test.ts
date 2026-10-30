import { describe, expect, it } from 'vitest'

import { parseMapsLink } from '@/features/places/lib/maps-link'

const at = (latitude: number, longitude: number) => ({ kind: 'position', latitude, longitude })

describe('[E4.2][AC68] reading a Google Maps link', () => {
  it('takes the place\'s own !3d!4d position from a long place link, not the centre of the map', () => {
    const link = 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3074,17z/data=!3m1!4b1!4m6!3m5!1s0x478ffb:0x1!8m2!3d47.0516943!4d8.3074029!16zL20v'

    expect(parseMapsLink(link)).toEqual(at(47.05169, 8.3074))
  })

  it('takes the @lat,lng the map is centred on when there is no place position', () => {
    expect(parseMapsLink('https://www.google.com/maps/@47.0502,8.3093,15z')).toEqual(at(47.0502, 8.3093))
    expect(parseMapsLink('https://www.google.com/maps/place/Lucerne/@47.05048,8.30635,13z')).toEqual(at(47.05048, 8.30635))
  })

  it('reads a q, query, ll or center parameter that is a lat,lng pair, with the comma plain or percent-encoded', () => {
    expect(parseMapsLink('https://www.google.com/maps?q=47.0502,8.3093')).toEqual(at(47.0502, 8.3093))
    expect(parseMapsLink('https://www.google.com/maps/search/?api=1&query=47.0502%2C8.3093')).toEqual(at(47.0502, 8.3093))
    expect(parseMapsLink('https://maps.google.com/?ll=47.0502,8.3093&z=15')).toEqual(at(47.0502, 8.3093))
    expect(parseMapsLink('https://www.google.com/maps?center=47.0502,8.3093')).toEqual(at(47.0502, 8.3093))
  })

  it('reads a negative position and rounds to five decimals', () => {
    expect(parseMapsLink('https://www.google.com/maps/@-33.8567844,151.2152967,17z')).toEqual(at(-33.85678, 151.2153))
  })

  it('accepts a link pasted without https://, with spaces around it, on a country domain', () => {
    expect(parseMapsLink('  www.google.ch/maps/@47.05,8.3,15z  ')).toEqual(at(47.05, 8.3))
    expect(parseMapsLink('https://www.google.co.uk/maps?q=47.05,8.3')).toEqual(at(47.05, 8.3))
    expect(parseMapsLink('https://www.google.com.au/maps?q=47.05,8.3')).toEqual(at(47.05, 8.3))
  })

  it('sends the short links to the API without reading them', () => {
    expect(parseMapsLink('https://maps.app.goo.gl/AbCdEf123')).toEqual({ kind: 'short', url: 'https://maps.app.goo.gl/AbCdEf123' })
    expect(parseMapsLink('maps.app.goo.gl/AbCdEf123')).toEqual({ kind: 'short', url: 'https://maps.app.goo.gl/AbCdEf123' })
    expect(parseMapsLink('https://goo.gl/maps/AbCdEf')).toEqual({ kind: 'short', url: 'https://goo.gl/maps/AbCdEf' })
  })

  it('refuses a short link with no code, and a goo.gl link that is not a maps link', () => {
    expect(parseMapsLink('https://maps.app.goo.gl/')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://goo.gl/other/AbCdEf')).toEqual({ kind: 'unreadable' })
  })

  it('refuses a Google Maps link with no position, such as a search by name', () => {
    expect(parseMapsLink('https://www.google.com/maps/search/chapel+bridge')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://www.google.com/maps?q=Chapel+Bridge+Lucerne')).toEqual({ kind: 'unreadable' })
  })

  it('refuses a position outside the globe, other hosts, other schemes and text that is no link', () => {
    expect(parseMapsLink('https://www.google.com/maps/@91.2,8.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://www.google.com/maps/@47.2,181.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://example.com/maps/@47.05,8.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://www.google.evil.com/maps/@47.05,8.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://notgoogle.com/maps/@47.05,8.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('https://www.google.com/search?q=47.05,8.3')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('ftp://www.google.com/maps/@47.05,8.3,15z')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('47.05, 8.3')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('')).toEqual({ kind: 'unreadable' })
    expect(parseMapsLink('not a link at all')).toEqual({ kind: 'unreadable' })
  })
})
