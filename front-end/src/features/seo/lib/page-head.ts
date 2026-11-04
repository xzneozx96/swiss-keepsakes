import type { PublicLanguage } from '@sk/api-contract'
import { readSiteConfig } from './site-config'

const LANGUAGES: readonly PublicLanguage[] = ['en', 'de']

interface AlternateHeadInput {
  lang: PublicLanguage
  /** The path of this page in a language. */
  path: (lang: PublicLanguage) => string
  title: string
  description: string
}

/** Title, description, canonical and hreflang (en, de, x-default = en) of a page that exists in both languages (ADR-002). */
export function alternateHead({ lang, path, title, description }: AlternateHeadInput) {
  const { siteUrl } = readSiteConfig()
  const href = (l: PublicLanguage) => `${siteUrl}${path(l)}`

  return {
    meta: [{ title }, { name: 'description', content: description }],
    links: [
      { rel: 'canonical', href: href(lang) },
      ...LANGUAGES.map(l => ({ rel: 'alternate', hrefLang: l, href: href(l) })),
      { rel: 'alternate', hrefLang: 'x-default', href: href('en') },
    ],
  }
}
