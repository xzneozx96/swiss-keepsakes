import { describe, expect, it } from 'vitest'
import { deviceClassOf, referrerClassOf } from '@/lib/analytics/source'

const SITE = 'swiss-keepsakes.ch'

describe('[E8.7][AC37][AC60][AC-4] referrerClassOf', () => {
  const table: Array<[string, string | undefined, string, string]> = [
    ['https://www.google.com/', undefined, 'none', 'search'],
    ['', '?utm_medium=partner', 'none', 'partner'],
    ['https://www.instagram.com/', undefined, 'none', 'social'],
    ['', undefined, 'none', 'direct'],
    ['https://blog.example/', undefined, 'none', 'other'],
  ]

  it.each(table)('referrer %j with query %j is %s', (referrer, search, _label, expected) => {
    expect(referrerClassOf({ referrer, search, siteHost: SITE })).toBe(expected)
  })

  it.each([
    'https://www.google.ch/search?q=luzern',
    'https://google.co.uk/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://www.ecosia.org/',
    'https://search.yahoo.com/',
    'https://www.qwant.com/',
    'https://www.startpage.com/',
  ])('search engine %s is search', (referrer) => {
    expect(referrerClassOf({ referrer, siteHost: SITE })).toBe('search')
  })

  it.each([
    'https://l.facebook.com/l.php',
    'https://www.facebook.com/',
    'https://x.com/',
    'https://twitter.com/',
    'https://t.co/abc',
    'https://www.linkedin.com/',
    'https://www.tiktok.com/',
    'https://www.youtube.com/',
    'https://www.pinterest.com/',
    'https://www.reddit.com/',
    'https://web.whatsapp.com/',
  ])('social host %s is social', (referrer) => {
    expect(referrerClassOf({ referrer, siteHost: SITE })).toBe('social')
  })

  it('does not take a look-alike host for a search engine or a social network', () => {
    expect(referrerClassOf({ referrer: 'https://notgoogle.com/', siteHost: SITE })).toBe('other')
    expect(referrerClassOf({ referrer: 'https://google.com.evil.example/', siteHost: SITE })).toBe('other')
    expect(referrerClassOf({ referrer: 'https://fakex.com/', siteHost: SITE })).toBe('other')
    expect(referrerClassOf({ referrer: 'https://instagram.com.evil.example/', siteHost: SITE })).toBe('other')
  })

  it('reads utm_medium=partner and utm_source=partner case-insensitively', () => {
    expect(referrerClassOf({ referrer: '', search: '?utm_source=partner', siteHost: SITE })).toBe('partner')
    expect(referrerClassOf({ referrer: '', search: '?utm_medium=Partner', siteHost: SITE })).toBe('partner')
    expect(referrerClassOf({ referrer: '', search: 'utm_source=PARTNER&x=1', siteHost: SITE })).toBe('partner')
  })

  it('lets a partner tag win over the referrer', () => {
    expect(referrerClassOf({ referrer: 'https://www.google.com/', search: '?utm_medium=partner', siteHost: SITE })).toBe('partner')
  })

  it('ignores other utm values', () => {
    expect(referrerClassOf({ referrer: '', search: '?utm_medium=email&utm_source=newsletter', siteHost: SITE })).toBe('direct')
    expect(referrerClassOf({ referrer: '', search: '?utm_source=partners', siteHost: SITE })).toBe('direct')
  })

  it('counts the same site, with or without www, as direct', () => {
    expect(referrerClassOf({ referrer: `https://${SITE}/en`, siteHost: SITE })).toBe('direct')
    expect(referrerClassOf({ referrer: `https://www.${SITE}/en`, siteHost: SITE })).toBe('direct')
    expect(referrerClassOf({ referrer: `https://${SITE}/en`, siteHost: `www.${SITE}` })).toBe('direct')
  })

  it('counts a missing, null or unparsable referrer as direct', () => {
    expect(referrerClassOf({ siteHost: SITE })).toBe('direct')
    expect(referrerClassOf({ referrer: null, siteHost: SITE })).toBe('direct')
    expect(referrerClassOf({ referrer: 'not a url', siteHost: SITE })).toBe('direct')
  })
})

describe('[E8.7][AC37][AC60][AC-4] deviceClassOf', () => {
  it.each([
    [320, 'phone'],
    [639, 'phone'],
    [640, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1920, 'desktop'],
  ])('width %i is %s', (width, expected) => {
    expect(deviceClassOf({ width })).toBe(expected)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('width %s is other', (width) => {
    expect(deviceClassOf({ width })).toBe('other')
  })

  it('is other when the width is not a number', () => {
    expect(deviceClassOf({ width: undefined as unknown as number })).toBe('other')
  })
})
