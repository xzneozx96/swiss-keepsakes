import type { PublicLanguage, PublicSearchItem, PublicSearchList, SearchKind } from '@sk/api-contract'

// The server matches and ranks (GET /api/public/search, ADR-033 slice 6). This maps a hit to the row the screen draws, and the
// counts the server sends to the filter. A hit holds no price (AC54): the keepsake card has a sold-out flag only.

export type { SearchKind }

export type SearchLink
  = | { to: '/$lang/map', params: { lang: PublicLanguage }, search: { place: string } }
    | { to: '/$lang/stories/$slug' | '/$lang/tours/$slug' | '/$lang/gifts/$slug', params: { lang: PublicLanguage, slug: string } }

export interface SearchResult {
  key: string
  kind: SearchKind
  title: string
  /** An address, when the card carries one (stories, places, keepsakes). */
  photoUrl: string | null
  /** A media key, when the card carries one (stories and tours without a ready cover). */
  photoKey: string | null
  link: SearchLink
}

/** The row of a hit, or null for a place that has no page on the map (the server leaves those out; this keeps the type honest). */
export function toResult(item: PublicSearchItem): SearchResult | null {
  switch (item.kind) {
    case 'place': {
      const { card } = item
      return card.slug === null
        ? null
        : { key: `place:${card.id}`, kind: 'place', title: card.title, photoUrl: card.photoUrl, photoKey: null, link: { to: '/$lang/map', params: { lang: card.language }, search: { place: card.slug } } }
    }
    case 'story': {
      const { card } = item
      return { key: `story:${card.id}`, kind: 'story', title: card.title, photoUrl: card.cover?.variants[0]?.url ?? card.cover?.url ?? null, photoKey: card.cover ? null : card.coverKey, link: { to: '/$lang/stories/$slug', params: { lang: card.language, slug: card.slug } } }
    }
    case 'tour': {
      const { card } = item
      return { key: `tour:${card.id}`, kind: 'tour', title: card.title, photoUrl: card.cover?.variants[0]?.url ?? card.cover?.url ?? null, photoKey: card.cover ? null : card.coverKey, link: { to: '/$lang/tours/$slug', params: { lang: card.language, slug: card.slug } } }
    }
    case 'keepsake': {
      const { card } = item
      return { key: `keepsake:${card.id}`, kind: 'keepsake', title: card.name, photoUrl: card.cover?.variants[0]?.url ?? card.cover?.url ?? null, photoKey: null, link: { to: '/$lang/gifts/$slug', params: { lang: card.language, slug: card.slug } } }
    }
  }
}

const kindOrder: readonly SearchKind[] = ['place', 'story', 'tour', 'keepsake']

export interface KindFilterItem { kind: 'all' | SearchKind, count: number }

/** All plus each kind that has hits, with the server's counts; null when one kind or none has hits, as a filter would do nothing. */
export function kindFilter(counts: PublicSearchList['counts']): KindFilterItem[] | null {
  const present = kindOrder.map(kind => ({ kind, count: counts[kind] })).filter(item => item.count > 0)

  return present.length > 1 ? [{ kind: 'all', count: present.reduce((sum, item) => sum + item.count, 0) }, ...present] : null
}
