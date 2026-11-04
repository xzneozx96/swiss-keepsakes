import type { PublicLanguage } from '@sk/api-contract'
import { readSiteConfig } from './site-config'

const LANGUAGES: readonly PublicLanguage[] = ['en', 'de']

interface AlternateHeadInput {
  lang: PublicLanguage
  /** The path of this page in a language. */
  path: (lang: PublicLanguage) => string
  title: string
  description: string
  /** The languages the page exists in; a page with one version links no alternate for the other. Default: both. */
  languages?: readonly PublicLanguage[]
  /** A JSON-LD snippet (schema.org), written as a `script` tag of type `application/ld+json`. */
  jsonLd?: Record<string, unknown>
}

/** Title, description, canonical and hreflang (en, de, x-default = en) of a page that exists in both languages (ADR-002). */
export function alternateHead({ lang, path, title, description, languages = LANGUAGES, jsonLd }: AlternateHeadInput) {
  const { siteUrl } = readSiteConfig()
  const href = (l: PublicLanguage) => `${siteUrl}${path(l)}`

  return {
    meta: [{ title }, { name: 'description', content: description }, ...(jsonLd ? [{ 'script:ld+json': jsonLd }] : [])],
    links: [
      { rel: 'canonical', href: href(lang) },
      ...languages.map(l => ({ rel: 'alternate', hrefLang: l, href: href(l) })),
      { rel: 'alternate', hrefLang: 'x-default', href: href(languages.includes('en') ? 'en' : languages[0] ?? lang) },
    ],
  }
}
