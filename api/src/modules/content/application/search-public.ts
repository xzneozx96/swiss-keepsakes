import type { ContentLanguage, LanguageNotice } from '@sk/domain/content'
import type { ReadDeps, SearchHit, SearchHitKind, SearchKey } from '../read-ports.ts'
import type { PublicMapItem, PublicStoryCard, PublicTourCard } from './public-view.ts'
import { toMapItem, toStoryCard, toTourCardFor } from './public-view.ts'

// The guest search (ADR-033 slice 6): one ranked list over published stories, places, tours and keepsakes. Each module ranks its
// own titles (the keepsakes through the catalog's port, ADR-013); this merges the hits by rank, cuts the page, and builds the card
// each kind's own list shows for the hits that stay.

export interface SearchKeepsakeCard extends LanguageNotice {
  id: string
  slug: string
  name: string
  cover: { url: string, variants: { width: number, url: string }[] } | null
  photos: { url: string, variants: { width: number, url: string }[] }[]
  subtitle: string | null
  storeName: string
  soldOut: boolean
}

// What the catalog gives the search, wired in main.ts from its public read.
export interface SearchKeepsakes {
  // Ranked hits after `after` (none read when `limit` is 0), and how many keepsakes match in all.
  hits: (query: { q: string | null, interest: string | null, limit: number, after?: SearchKey | undefined }) => Promise<{ hits: SearchHit[], count: number }>
  // The cards of these keepsakes in the order of `ids`; one that is no longer published is skipped.
  cards: (ids: string[], language: ContentLanguage) => Promise<SearchKeepsakeCard[]>
}

export interface SearchDeps<T> extends ReadDeps<T> {
  keepsakes: SearchKeepsakes
}

export interface SearchPublicQuery {
  language: ContentLanguage
  q: string | null
  interest: string | null
  kind?: SearchHitKind | undefined
  limit: number
  after?: SearchKey | undefined
}

export type PublicSearchItem
  = | { kind: 'story', card: PublicStoryCard }
    | { kind: 'place', card: PublicMapItem }
    | { kind: 'tour', card: PublicTourCard }
    | { kind: 'keepsake', card: SearchKeepsakeCard }

export interface PublicSearchPage {
  items: PublicSearchItem[]
  total: number
  counts: Record<SearchHitKind, number>
  next: SearchKey | null
}

const KINDS: readonly SearchHitKind[] = ['story', 'place', 'tour', 'keepsake']

// Best rank first, then the id, then the kind, all descending: the order the repositories sort and compare by.
const byRank = (a: SearchHit, b: SearchHit) => Number(b.score) - Number(a.score) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) || (a.kind < b.kind ? 1 : a.kind > b.kind ? -1 : 0)

export function makeSearchPublic<T>({ uow, reads, clock, publicUrl, keepsakes }: SearchDeps<T>) {
  return async ({ language, q, interest, kind, limit, after }: SearchPublicQuery): Promise<PublicSearchPage> => {
    const wanted = kind ? [kind] : KINDS
    const contentKinds = wanted.filter((k): k is 'story' | 'place' | 'tour' => k !== 'keepsake')
    // Each source returns its best `limit + 1` hits after the cursor, so the best `limit + 1` of all of them are among these.
    const [content, kept] = await Promise.all([
      uow.run(tx => reads.searchPublished(tx, { q, interest, kinds: contentKinds, limit, after })),
      keepsakes.hits({ q, interest, limit: wanted.includes('keepsake') ? limit : 0, after }),
    ])
    const ranked = [...content.hits, ...kept.hits].sort(byRank)
    const shown = ranked.slice(0, limit)
    const last = shown.at(-1)
    const next: SearchKey | null = ranked.length > limit && last ? [last.score, last.id, last.kind] : null
    const idsOf = (k: SearchHitKind) => shown.filter(hit => hit.kind === k).map(hit => hit.id)

    const [rows, keepsakeCards] = await Promise.all([
      uow.run(async tx => ({
        stories: await reads.listPublishedStoriesByIds(tx, idsOf('story')),
        pins: await reads.listVisiblePinsByIds(tx, idsOf('place')),
        tours: await reads.listPublishedToursByIds(tx, idsOf('tour')),
      })),
      idsOf('keepsake').length > 0 ? keepsakes.cards(idsOf('keepsake'), language) : Promise.resolve([]),
    ])
    const stories = new Map(rows.stories.map(row => [row.id, row]))
    const pins = new Map(rows.pins.map(row => [row.id, row]))
    const tours = new Map(rows.tours.map(row => [row.id, row]))
    const cards = new Map(keepsakeCards.map(card => [card.id, card]))
    const now = clock.now()

    // A hit whose row is gone or has nothing to show (a place with no slug in its language) is left out; `next` still stands.
    const items = shown.flatMap((hit): PublicSearchItem[] => {
      if (hit.kind === 'story') {
        const row = stories.get(hit.id)
        const card = row && toStoryCard(row, language, publicUrl)
        return card ? [{ kind: 'story', card }] : []
      }
      if (hit.kind === 'place') {
        const row = pins.get(hit.id)
        const card = row && toMapItem(row, language, now, publicUrl)
        return card && card.slug !== null ? [{ kind: 'place', card }] : []
      }
      if (hit.kind === 'tour') {
        const row = tours.get(hit.id)
        const card = row && toTourCardFor(row, language, publicUrl)
        return card ? [{ kind: 'tour', card }] : []
      }
      const card = cards.get(hit.id)
      return card ? [{ kind: 'keepsake', card }] : []
    })
    const counts = { ...content.counts, keepsake: kept.count }
    const total = kind ? counts[kind] : counts.story + counts.place + counts.tour + counts.keepsake

    return { items, total, counts, next }
  }
}
