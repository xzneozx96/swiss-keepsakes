import { describe, expect, it } from 'vitest'

import { referralLocation, referralTarget } from '@/lib/referral-target'

function request(query: string, headers: Record<string, string> = {}, code = 'abc') {
  return new Request(`http://x/r/${code}${query}`, { headers })
}

function withTo(to: string, headers: Record<string, string> = {}) {
  return request(`?to=${encodeURIComponent(to)}`, headers)
}

describe('referralTarget and referralLocation', () => {
  it.each([
    '/en/stories/zytturm',
    '/de/stories/x?y=1',
    '/en',
    '/de',
  ])('[E3.7][AC24] accepts %s unchanged', (to) => {
    expect(referralTarget(to)).toBe(to)
    expect(referralLocation(withTo(to))).toBe(to)
  })

  it.each([
    'https://evil.example/en',
    '//evil.example',
    '/\\evil.example',
    '/\\\\evil.example',
    'javascript:alert(1)',
    '/store/orders',
    '/en@evil.com',
    '/fr/stories/x',
    '/EN/stories',
    '/en/../store/orders',
    '/en/%2e%2e/store',
    '/en/%2E%2E/store',
    '/en/%5cevil',
    '/en/./x',
    '/en/..#x',
    '/de/..#',
    '/en//x',
    '/en/a b',
    '/en/x%0d%0aSet-Cookie:a=b',
    `/en/${'a'.repeat(200)}`,
  ])('[E3.7][AC24] rejects %s and falls back to /en', (to) => {
    expect(referralTarget(to)).toBeNull()
    expect(referralLocation(withTo(to))).toBe('/en')
  })

  it.each([
    ['decoded to //evil.example', '?to=%2F%2Fevil.example'],
    ['double encoded', '?to=%252F%252Fevil.example'],
    ['decoded CRLF', '?to=/en/x%0d%0aSet-Cookie:a=b'],
    ['decoded non-ASCII', '?to=/en/%C3%A9'],
    ['decoded space', '?to=/en/a%20b'],
    ['plus as space', '?to=/en/a+b'],
    ['empty to', '?to='],
    ['no to', ''],
  ])('[E3.7][AC24] raw query %s falls back to /en', (_name, query) => {
    expect(referralLocation(request(query))).toBe('/en')
  })

  it('[E3.7][AC24] accepts a target of exactly 200 characters', () => {
    const to = `/en/${'a'.repeat(196)}`
    expect(referralTarget(to)).toBe(to)
  })

  it('[E3.7][AC24] returns null for a missing target', () => {
    expect(referralTarget(null)).toBeNull()
  })

  it('[E3.7][AC24] falls back to the browser language when there is no target', () => {
    expect(referralLocation(request('', { 'accept-language': 'de-CH' }))).toBe('/de')
  })

  it('[E3.7][AC24] prefers the language cookie over Accept-Language', () => {
    expect(referralLocation(request('', { 'cookie': 'sk_lang=de', 'accept-language': 'en' }))).toBe('/de')
  })

  it('[E3.7][AC24] uses the cookie language when the target is hostile', () => {
    expect(referralLocation(withTo('//evil.example', { cookie: 'sk_lang=de' }))).toBe('/de')
  })

  it('[E3.7][AC24] uses the first to parameter when it is valid', () => {
    expect(referralLocation(request('?to=%2Fen%2Fa&to=%2Fde%2Fb'))).toBe('/en/a')
  })

  it('[E3.7][AC24] falls back when the first to parameter is invalid even if the second is valid', () => {
    expect(referralLocation(request('?to=%2Fstore&to=%2Fen%2Fa'))).toBe('/en')
  })

  it('[E3.7][AC24] gives the same location for a known and an unknown code', () => {
    const to = encodeURIComponent('/de/stories/x')
    expect(referralLocation(request(`?to=${to}`, {}, 'known'))).toBe(referralLocation(request(`?to=${to}`, {}, 'zzz-unknown')))
    expect(referralLocation(request('', {}, 'known'))).toBe(referralLocation(request('', {}, 'zzz-unknown')))
  })
})
