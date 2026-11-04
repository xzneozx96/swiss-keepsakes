import type { PublicKeepsakeCard, PublicLanguage, PublicMapItem, PublicStoryCard, PublicTourCard } from '@sk/api-contract'

import { fold } from './fold'

// Search runs in the browser over the lists the app already has (no server search). The lists omit what a guest must
// not see (hidden, draft and expired pins, unpublished and archived keepsakes), and no price is read here (AC54).

export type SearchKind = 'place' | 'story' | 'tour' | 'keepsake'

export interface SearchSources {
  stories: readonly PublicStoryCard[]
  pins: readonly PublicMapItem[]
  tours: readonly PublicTourCard[]
  keepsakes: readonly PublicKeepsakeCard[]
}

export type SearchLink
  = | { to: '/$lang/map', params: { lang: PublicLanguage }, search: { place: string } }
    | { to: '/$lang/stories/$slug' | '/$lang/tours/$slug' | '/$lang/gifts/$slug', params: { lang: PublicLanguage, slug: string } }

export interface SearchResult {
  key: string
  kind: SearchKind
  title: string
  /** An address, when the list carries one (stories, places, keepsakes). */
  photoUrl: string | null
  /** A media key, when the list carries one (tours). */
  photoKey: string | null
  link: SearchLink
  interests: readonly string[]
}

const isLetter = /[\p{L}\p{N}]/u

/**
 * How well a title matches a query; both are folded here. 4 = the title equals the query; 3 = the title starts with the
 * query as a whole word; 2 = the title starts with the query; 1 = a word of the title starts with it; 0 = the query is
 * inside a word; -1 = no match.
 */
export function scoreTitle(title: string, query: string): number {
  const t = fold(title)
  const q = fold(query).trim()
  const at = t.indexOf(q)

  if (!q || at < 0) {
    return -1
  }
  if (t === q) {
    return 4
  }
  if (at === 0) {
    return isLetter.test(t.charAt(q.length)) ? 2 : 3
  }
  for (let i = at; i >= 0; i = t.indexOf(q, i + 1)) {
    if (!isLetter.test(t.charAt(i - 1))) {
      return 1
    }
  }

  return 0
}

function place(p: PublicMapItem): SearchResult | null {
  if (p.slug === null) {
    return null
  }

  return {
    key: `place:${p.id}`,
    kind: 'place',
    title: p.title,
    photoUrl: p.photoUrl,
    photoKey: null,
    link: { to: '/$lang/map', params: { lang: p.language }, search: { place: p.slug } },
    interests: p.interests,
  }
}

function story(s: PublicStoryCard): SearchResult {
  return {
    key: `story:${s.id}`,
    kind: 'story',
    title: s.title,
    photoUrl: s.cover?.variants[0]?.url ?? s.cover?.url ?? null,
    photoKey: s.cover ? null : s.coverKey,
    link: { to: '/$lang/stories/$slug', params: { lang: s.language, slug: s.slug } },
    interests: s.interests,
  }
}

function tour(t: PublicTourCard): SearchResult {
  return {
    key: `tour:${t.id}`,
    kind: 'tour',
    title: t.title,
    photoUrl: null,
    photoKey: t.coverKey,
    link: { to: '/$lang/tours/$slug', params: { lang: t.language, slug: t.slug } },
    interests: t.interests,
  }
}

function keepsake(k: PublicKeepsakeCard): SearchResult {
  return {
    key: `keepsake:${k.id}`,
    kind: 'keepsake',
    title: k.name,
    photoUrl: k.cover?.variants[0]?.url ?? k.cover?.url ?? null,
    photoKey: null,
    link: { to: '/$lang/gifts/$slug', params: { lang: k.language, slug: k.slug } },
    interests: [],
  }
}

const present = <T>(row: T | null): row is T => row !== null

/** Every row a guest can open, in source order: stories, places, tours, keepsakes, each in server order. */
function everything(s: SearchSources): SearchResult[] {
  return [...s.stories.map(story), ...s.pins.map(place).filter(present), ...s.tours.map(tour), ...s.keepsakes.map(keepsake)]
}

/** The rows whose title matches, best match first; equal scores keep the source order. */
export function searchAll(sources: SearchSources, query: string): SearchResult[] {
  return everything(sources)
    .map(row => ({ row, score: scoreTitle(row.title, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ row }) => row)
}

const kindOrder: readonly SearchKind[] = ['place', 'story', 'tour', 'keepsake']

export interface KindFilterItem { kind: 'all' | SearchKind, count: number }

/** All plus each kind present with its count; null when one kind or none is present, as a filter would do nothing. */
export function kindFilter(results: readonly SearchResult[]): KindFilterItem[] | null {
  const counts = kindOrder.map(kind => ({ kind, count: results.filter(r => r.kind === kind).length })).filter(i => i.count > 0)

  return counts.length > 1 ? [{ kind: 'all', count: results.length }, ...counts] : null
}

/** What an interest tile lists: its stories, places and tours; "shopping-keepsakes" also lists every keepsake. */
export function interestResults(sources: SearchSources, interest: string): SearchResult[] {
  return everything(sources).filter(row => row.kind === 'keepsake' ? interest === 'shopping-keepsakes' : row.interests.includes(interest))
}

/** Names that exist in the data, for a query with no match: the first of each kind in turn (places, tours, stories, keepsakes). */
export function suggestNames(sources: SearchSources, limit = 3): string[] {
  const rows = everything(sources)
  const lanes = (['place', 'tour', 'story', 'keepsake'] as const).map(kind => rows.filter(r => r.kind === kind).map(r => r.title))
  const names: string[] = []

  for (let i = 0; names.length < limit && lanes.some(l => i < l.length); i++) {
    for (const lane of lanes) {
      const name = lane[i]

      if (name !== undefined && !names.includes(name) && names.length < limit) {
        names.push(name)
      }
    }
  }

  return names
}
