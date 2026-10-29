import type { PublishedPages } from '@/features/seo/lib/sitemap'

import { describe, expect, it } from 'vitest'

import { buildSitemapEntries, robotsTxt, sitemapXml } from '@/features/seo/lib/sitemap'

const SITE = 'https://example.ch'

function card(id: string, slug: string, language: 'en' | 'de', fallback = false) {
  return { id, slug, language, fallback }
}

const pages: PublishedPages = {
  stories: {
    en: [card('a', 'a-en', 'en'), card('b', 'b', 'en')],
    de: [card('a', 'a-de', 'de'), card('b', 'b', 'de', true), card('c', 'c-de', 'de')],
  },
  tours: {
    en: [card('t', 't-en', 'en')],
    de: [card('t', 't-de', 'de')],
  },
}

function entry(path: string) {
  return buildSitemapEntries(pages).find(e => e.path === path)
}

describe('[E3.6][AC61] sitemap entries', () => {
  it('lists each page once per language, homes and lists first', () => {
    const paths = buildSitemapEntries(pages).map(e => e.path)

    expect(paths.slice(0, 8)).toEqual(['/en', '/de', '/en/stories', '/de/stories', '/en/tours', '/de/tours', '/en/gifts', '/de/gifts'])
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toContain('/en/tours/t-en')
    expect(paths).toContain('/de/tours/t-de')
  })

  it('gives a story in both languages en, de and x-default alternates', () => {
    const xml = sitemapXml(buildSitemapEntries(pages), SITE)

    expect(entry('/en/stories/a-en')?.alternates).toEqual([{ lang: 'en', path: '/en/stories/a-en' }, { lang: 'de', path: '/de/stories/a-de' }])
    expect(xml).toContain('<loc>https://example.ch/de/stories/a-de</loc>')
    expect(xml).toContain('hreflang="x-default" href="https://example.ch/en/stories/a-en"')
  })

  it('emits an English-only story once, with en and x-default only', () => {
    const paths = buildSitemapEntries(pages).map(e => e.path)

    expect(paths).toContain('/en/stories/b')
    expect(paths).not.toContain('/de/stories/b')
    expect(entry('/en/stories/b')?.alternates).toEqual([{ lang: 'en', path: '/en/stories/b' }])

    const xml = sitemapXml([entry('/en/stories/b')!], SITE)
    expect(xml.match(/hreflang="/g)).toHaveLength(2)
    expect(xml).toContain('hreflang="en"')
    expect(xml).toContain('hreflang="x-default"')
  })

  it('gives a German-only story a de entry and no x-default', () => {
    const xml = sitemapXml([entry('/de/stories/c-de')!], SITE)

    expect(entry('/de/stories/c-de')?.alternates).toEqual([{ lang: 'de', path: '/de/stories/c-de' }])
    expect(xml).toContain('hreflang="de"')
    expect(xml).not.toContain('x-default')
  })

  it('lists every entry own language among its alternates', () => {
    for (const e of buildSitemapEntries(pages))
      expect(e.alternates.map(a => a.path)).toContain(e.path)
  })

  it('lists only homes, lists and story or tour pages: no query, no other segment', () => {
    const xml = sitemapXml(buildSitemapEntries(pages), SITE)
    const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), m => m[1])
    const allowed = /^https?:\/\/[^/]+\/(en|de)(\/(stories|tours|gifts)(\/[^/?#]+)?)?$/

    expect(locs.length).toBeGreaterThan(0)
    for (const loc of locs)
      expect(loc).toMatch(allowed)
  })

  it('lists two cards with the same id in one language once', () => {
    const twice: PublishedPages = {
      stories: { en: [card('dup', 'first', 'en'), card('dup', 'second', 'en')], de: [] },
      tours: { en: [], de: [] },
    }
    const paths = buildSitemapEntries(twice).map(e => e.path).filter(p => p.startsWith('/en/stories/'))

    expect(paths).toHaveLength(1)
  })

  it('leaves fallback cards out of the other language, the way the API sends them', () => {
    const fallbacks: PublishedPages = {
      stories: { en: [card('f', 'f-en', 'en')], de: [card('f', 'f-en', 'en', true), card('g', 'g-de', 'de', true)] },
      tours: { en: [], de: [] },
    }
    const paths = buildSitemapEntries(fallbacks).map(e => e.path)

    expect(paths).toContain('/en/stories/f-en')
    expect(paths.filter(p => p.startsWith('/de/stories/'))).toEqual([])
  })
})

describe('[E3.6][AC61] sitemap xml', () => {
  it('parses as XML and declares both namespaces', () => {
    const xml = sitemapXml(buildSitemapEntries(pages), SITE)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')

    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })

  it('percent-encodes then XML-escapes a hostile slug', () => {
    const slug = 'a&b\'s é<>"'
    const hostile: PublishedPages = { stories: { en: [card('x', slug, 'en')], de: [] }, tours: { en: [], de: [] } }
    const xml = sitemapXml(buildSitemapEntries(hostile), SITE)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')

    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(xml).toContain('/en/stories/a%26b&apos;s%20%C3%A9%3C%3E%22')
    expect(xml).toContain('&apos;')
    const locs = Array.from(doc.getElementsByTagName('loc'), loc => loc.textContent)
    expect(locs).toContain(`${SITE}/en/stories/${encodeURIComponent(slug)}`)
  })

  it('escapes a siteUrl with special characters', () => {
    const xml = sitemapXml(buildSitemapEntries(pages).slice(0, 1), 'https://x.ch/?a=1&b=2')

    expect(new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror')).toHaveLength(0)
    expect(xml).toContain('&amp;b=2')
  })
})

describe('[E3.6][AC61] robots.txt', () => {
  it('allows crawling and names the sitemap when indexable', () => {
    expect(robotsTxt({ siteUrl: SITE, indexable: true })).toBe(`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
  })

  it('disallows everything with no sitemap line otherwise', () => {
    expect(robotsTxt({ siteUrl: SITE, indexable: false })).toBe('User-agent: *\nDisallow: /\n')
  })
})
