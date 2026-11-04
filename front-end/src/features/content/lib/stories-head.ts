import type { PublicLanguage } from '@sk/api-contract'

import { readSiteConfig } from '@/features/seo/lib/site-config'

// The words of `stories.title` and `stories.intro`. The head cannot call `t`, and the German dictionary stays a lazy chunk,
// so the two lines are here; tests/stories-list-load.test.ts keeps them equal to the dictionaries.
const WORDS: Record<PublicLanguage, { title: string, description: string }> = {
  en: { title: 'Local stories', description: 'Walks, history and the lake, to read before you go.' },
  de: { title: 'Geschichten aus Luzern', description: 'Spaziergänge, Geschichte und der See, zum Lesen vor dem Besuch.' },
}

/** The document head of the stories list (ADR-002): title, description, its own canonical and the alternate of each language. */
export function storiesHead(lang: PublicLanguage) {
  const { siteUrl } = readSiteConfig()
  const { title, description } = WORDS[lang]

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ],
    links: [
      { rel: 'canonical', href: `${siteUrl}/${lang}/stories` },
      { rel: 'alternate', hrefLang: 'en', href: `${siteUrl}/en/stories` },
      { rel: 'alternate', hrefLang: 'de', href: `${siteUrl}/de/stories` },
      { rel: 'alternate', hrefLang: 'x-default', href: `${siteUrl}/en/stories` },
    ] as { rel: string, href: string, hrefLang?: string }[],
  }
}
