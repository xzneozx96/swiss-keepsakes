import { describe, expect, it } from 'vitest'
import { isGoogleMapsHost, parseMapsPosition, parseMapsShortLink } from '../../../src/modules/content/application/maps-link.ts'

describe('a Google Maps short link', () => {
  it.each([
    'https://maps.app.goo.gl/AbCdEf123',
    'https://maps.app.goo.gl/AbCdEf123?g_st=ic',
    'https://goo.gl/maps/AbCdEf123',
    '  https://goo.gl/maps/AbCdEf123  ',
  ])('accepts %s', (text) => {
    expect(parseMapsShortLink(text)).toBeInstanceOf(URL)
  })

  it.each([
    ['plain http', 'http://maps.app.goo.gl/AbCdEf123'],
    ['another host', 'https://evil.example/maps/abc'],
    ['a lookalike host', 'https://maps.app.goo.gl.evil.example/abc'],
    ['a host that only ends the same', 'https://evilgoo.gl/maps/abc'],
    ['a goo.gl path outside /maps', 'https://goo.gl/AbCdEf'],
    ['no path on maps.app.goo.gl', 'https://maps.app.goo.gl/'],
    ['credentials', 'https://maps.app.goo.gl@evil.example/abc'],
    ['a port', 'https://maps.app.goo.gl:8443/abc'],
    ['a full maps address', 'https://www.google.com/maps/place/x/@47.05,8.3,17z'],
    ['not a URL', 'maps.app.goo.gl/abc'],
    ['an empty string', ''],
  ])('refuses %s', (_name, text) => {
    expect(parseMapsShortLink(text)).toBeUndefined()
  })
})

describe('a host a short link may pass through', () => {
  it.each(['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com', 'www.google.ch', 'google.de', 'www.google.co.uk', 'google.com.au', 'MAPS.GOOGLE.COM'])('allows %s', (host) => {
    expect(isGoogleMapsHost(host)).toBe(true)
  })

  it.each(['evil.example', 'google.com.evil.example', 'evilgoogle.com', 'notgoogle.ch', 'consent.google.com', 'google', 'goo.gl.evil.example', 'www.google.com.', '169.254.169.254', 'localhost'])('refuses %s', (host) => {
    expect(isGoogleMapsHost(host)).toBe(false)
  })
})

describe('the position in a Google Maps address', () => {
  const at = (path: string) => parseMapsPosition(new URL(`https://www.google.com${path}`))

  it('prefers the pin of the place (!3d!4d) over the map centre', () => {
    expect(at('/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3074,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d47.0507!4d8.3068!16zm')).toEqual({ latitude: 47.0507, longitude: 8.3068 })
  })

  it('falls back to the map centre (@lat,lng)', () => {
    expect(at('/maps/place/Lucerne/@47.0502,8.3093,15z')).toEqual({ latitude: 47.0502, longitude: 8.3093 })
    expect(at('/maps/@-33.8688,151.2093,12z')).toEqual({ latitude: -33.8688, longitude: 151.2093 })
  })

  it.each(['q', 'query', 'll'])('falls back to a coordinate pair in the %s parameter', (key) => {
    expect(at(`/maps?${key}=47.05%2C8.31`)).toEqual({ latitude: 47.05, longitude: 8.31 })
    expect(at(`/maps?${key}=47.05,%208.31`)).toEqual({ latitude: 47.05, longitude: 8.31 })
  })

  it('reads the coordinates when the data part is percent-encoded', () => {
    expect(at('/maps/place/x/data=%213m1%214b1%213d47.1%214d8.2')).toEqual({ latitude: 47.1, longitude: 8.2 })
  })

  it.each([
    ['a place name in q', '/maps?q=Kapellbruecke'],
    ['no coordinates', '/maps/place/Lucerne'],
    ['a latitude out of range', '/maps/@91.0,8.3,12z'],
    ['a longitude out of range', '/maps/@47.0,181.0,12z'],
    ['a malformed percent sequence', '/maps/place/%E0%A4%A'],
  ])('is undefined for %s', (_name, path) => {
    expect(at(path)).toBeUndefined()
  })
})
