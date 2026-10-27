import { describe, expect, it } from 'vitest'

import {
  isLanguage,
  legacyGuestTarget,
  resolveLandingLanguage,
  switchLanguagePath,
} from '@/lib/language-routing'

describe('isLanguage', () => {
  it('accepts only lowercase en and de', () => {
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('de')).toBe(true)
    expect(isLanguage('EN')).toBe(false)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(undefined)).toBe(false)
  })
})

describe('resolveLandingLanguage', () => {
  it('falls back to en with no cookie and no header', () => {
    expect(resolveLandingLanguage({})).toBe('en')
    expect(resolveLandingLanguage({ cookie: null, acceptLanguage: null })).toBe('en')
  })

  it('uses de when Accept-Language starts with de', () => {
    expect(resolveLandingLanguage({ acceptLanguage: 'de-CH' })).toBe('de')
    expect(resolveLandingLanguage({ acceptLanguage: 'DE-ch,en;q=0.8' })).toBe('de')
  })

  it('uses en when the first tag is not de', () => {
    expect(resolveLandingLanguage({ acceptLanguage: 'en-US,de;q=0.8' })).toBe('en')
    expect(resolveLandingLanguage({ acceptLanguage: 'fr' })).toBe('en')
  })

  it('lets a valid cookie win over the header', () => {
    expect(resolveLandingLanguage({ cookie: 'sk_lang=en', acceptLanguage: 'de-CH' })).toBe('en')
    expect(resolveLandingLanguage({ cookie: 'sk_lang=de' })).toBe('de')
  })

  it('ignores a junk cookie value', () => {
    expect(resolveLandingLanguage({ cookie: 'sk_lang=fr' })).toBe('en')
    expect(resolveLandingLanguage({ cookie: 'sk_lang=fr', acceptLanguage: 'de' })).toBe('de')
  })

  it('finds the cookie among others', () => {
    expect(resolveLandingLanguage({ cookie: 'a=1; sk_lang=de; b=2' })).toBe('de')
  })
})

describe('legacyGuestTarget', () => {
  it('prefixes legacy guest paths', () => {
    expect(legacyGuestTarget('/tours', 'de')).toBe('/de/tours')
    expect(legacyGuestTarget('/stories/x', 'en')).toBe('/en/stories/x')
  })

  it('matches the first segment without case and with %XX decoded, and builds the lower-case target', () => {
    expect(legacyGuestTarget('/Stories', 'en')).toBe('/en/stories')
    expect(legacyGuestTarget('/STORIES/a', 'en')).toBe('/en/stories/a')
    expect(legacyGuestTarget('/St%6Fries/a', 'de')).toBe('/de/stories/a')
  })

  it('encodes non-ASCII and whitespace and leaves reserved escapes alone', () => {
    expect(legacyGuestTarget('/stories/café', 'en')).toBe('/en/stories/caf%C3%A9')
    expect(legacyGuestTarget('/stories/€', 'en')).toBe('/en/stories/%E2%82%AC')
    expect(legacyGuestTarget('/gifts/日本', 'de')).toBe('/de/gifts/%E6%97%A5%E6%9C%AC')
    expect(legacyGuestTarget('/stories/a b', 'en')).toBe('/en/stories/a%20b')
    expect(legacyGuestTarget('/stories/a%20b', 'en')).toBe('/en/stories/a%20b')
    expect(legacyGuestTarget('/stories/%2F%2Fevil.com', 'en')).toBe('/en/stories/%2F%2Fevil.com')
  })

  it('returns null for a malformed escape', () => {
    expect(legacyGuestTarget('/st%E0/a', 'en')).toBeNull()
  })

  it('returns null for other paths', () => {
    expect(legacyGuestTarget('/cart', 'en')).toBeNull()
    expect(legacyGuestTarget('/storiesx', 'en')).toBeNull()
  })
})

describe('switchLanguagePath', () => {
  it('replaces the language segment', () => {
    expect(switchLanguagePath('/en/stories/a', 'de')).toBe('/de/stories/a')
    expect(switchLanguagePath('/en', 'de')).toBe('/de')
  })

  it('leaves unprefixed paths unchanged', () => {
    expect(switchLanguagePath('/cart', 'de')).toBe('/cart')
  })
})
