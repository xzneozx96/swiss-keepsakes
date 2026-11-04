import type { PublicLanguage } from '@sk/api-contract'

import { alternateHead } from '@/features/seo/lib/page-head'

// The words of `home.title` and `homePage.meta.description`. The head cannot call `t`, and the German dictionary stays a lazy chunk,
// so the two lines are here; tests/home-page.test.tsx keeps them equal to the dictionaries.
const WORDS: Record<PublicLanguage, { title: string, description: string }> = {
  en: {
    title: 'Luzerne, a place you always want to return to',
    description: 'Your first day in Lucerne, sorted: the places we’d show a friend on the map, the practical things to find, and Victorinox keepsakes from the shop.',
  },
  de: {
    title: 'Luzern, ein Ort, an den man immer zurückkehren möchte',
    description: 'Ihr erster Tag in Luzern, erledigt: die Orte, die wir Freunden zeigen, auf der Karte, das Praktische zum Finden und Victorinox-Andenken aus dem Laden.',
  },
}

/** The document head of the home (ADR-002): title, description, its own canonical and the alternate of each language. */
export function homeHead(lang: PublicLanguage) {
  const { title, description } = WORDS[lang]
  const head = alternateHead({ lang, path: l => `/${l}`, title, description })

  return {
    meta: [...head.meta, { property: 'og:title', content: title }, { property: 'og:description', content: description }],
    links: head.links as { rel: string, href: string, hrefLang?: string }[],
  }
}
