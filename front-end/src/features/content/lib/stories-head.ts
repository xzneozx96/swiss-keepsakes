import type { PublicLanguage } from '@sk/api-contract'

import { alternateHead } from '@/features/seo/lib/page-head'

// The words of `stories.title` and `stories.intro`. The head cannot call `t`, and the German dictionary stays a lazy chunk,
// so the two lines are here; tests/stories-list-load.test.ts keeps them equal to the dictionaries.
const WORDS: Record<PublicLanguage, { title: string, description: string }> = {
  en: { title: 'Local stories', description: 'Walks, history and the lake, to read before you go.' },
  de: { title: 'Geschichten aus Luzern', description: 'Spaziergänge, Geschichte und der See, zum Lesen vor dem Besuch.' },
}

/** The document head of the stories list (ADR-002): title, description, its own canonical and the alternate of each language. */
export function storiesHead(lang: PublicLanguage) {
  const { title, description } = WORDS[lang]
  const head = alternateHead({ lang, path: l => `/${l}/stories`, title, description })

  return {
    meta: [...head.meta, { property: 'og:title', content: title }, { property: 'og:description', content: description }],
    links: head.links as { rel: string, href: string, hrefLang?: string }[],
  }
}
