import type { PublicLanguage, PublicStoryCard } from '@sk/api-contract'

import { pageVersionRule } from '@/lib/language-routing'

export type PublicCard = Pick<PublicStoryCard, 'id' | 'slug' | 'language' | 'fallback'>

export interface PublishedPages {
  stories: Record<PublicLanguage, PublicCard[]>
  tours: Record<PublicLanguage, PublicCard[]>
}

export interface SitemapEntry {
  path: string
  alternates: { lang: PublicLanguage, path: string }[]
}

const LANGUAGES: readonly PublicLanguage[] = ['en', 'de']
const LIST_SEGMENTS = ['stories', 'tours', 'gifts'] as const
const XML_SPECIALS = /[&<>'"]/g
const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\'': '&apos;', '"': '&quot;' }

function escapeXml(value: string): string {
  return value.replace(XML_SPECIALS, char => XML_ESCAPES[char] ?? char)
}

/** One entry per language that shows the page; `versions` maps each language that has the page to its path. */
function entriesFor(versions: Partial<Record<PublicLanguage, string>>): SitemapEntry[] {
  const available = LANGUAGES.filter(lang => versions[lang] !== undefined)
  const alternates = available.map(lang => ({ lang, path: versions[lang] as string }))

  return alternates
    .filter(({ lang }) => pageVersionRule(available, lang).kind === 'show')
    .map(({ path }) => ({ path, alternates }))
}

function detailEntries(segment: 'stories' | 'tours', cards: Record<PublicLanguage, PublicCard[]>): SitemapEntry[] {
  const groups = new Map<string, Partial<Record<PublicLanguage, string>>>()

  for (const lang of LANGUAGES) {
    for (const card of cards[lang]) {
      if (card.fallback || card.language !== lang)
        continue
      const versions = groups.get(card.id) ?? {}
      versions[lang] = `/${lang}/${segment}/${encodeURIComponent(card.slug)}`
      groups.set(card.id, versions)
    }
  }

  return [...groups.values()].flatMap(entriesFor)
}

/** Every indexable address: homes, the three lists, then story and tour pages. Pins, events and the map are never listed. */
export function buildSitemapEntries(pages: PublishedPages): SitemapEntry[] {
  const statics = [
    entriesFor({ en: '/en', de: '/de' }),
    ...LIST_SEGMENTS.map(segment => entriesFor({ en: `/en/${segment}`, de: `/de/${segment}` })),
  ].flat()

  return [...statics, ...detailEntries('stories', pages.stories), ...detailEntries('tours', pages.tours)]
}

export function sitemapXml(entries: SitemapEntry[], siteUrl: string): string {
  const absolute = (path: string) => escapeXml(`${siteUrl}${path}`)

  const urls = entries.map((entry) => {
    const links = entry.alternates.map(({ lang, path }) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${absolute(path)}"/>`)
    const english = entry.alternates.find(({ lang }) => lang === 'en')
    if (english)
      links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(english.path)}"/>`)

    return `<url><loc>${absolute(entry.path)}</loc>${links.join('')}</url>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`
}

export function robotsTxt({ siteUrl, indexable }: { siteUrl: string, indexable: boolean }): string {
  return indexable
    ? `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n'
}
