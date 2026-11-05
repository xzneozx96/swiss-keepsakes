import type { MediaKind } from '@sk/domain/content'

export const MEDIA_KINDS = ['image', 'audio', 'pdf'] as const satisfies readonly MediaKind[]
export const USE_FILTERS = ['unused', 'drafts', 'published'] as const
export const STATUS_FILTERS = ['processing', 'ready', 'retired'] as const

export type UseFilter = (typeof USE_FILTERS)[number]
export type StatusFilter = (typeof STATUS_FILTERS)[number]

/** A page of the photo wall: 20 files (ADR-033 amendment: 20 is the most a page holds; it was 24). */
export const WALL_PAGE_SIZE = 20
export const LIST_PAGE_SIZE = 20

export const MEDIA_PATH = '/store/content/media'

export interface MediaSearch {
  kind?: MediaKind
  q?: string
  use?: UseFilter[]
  status?: StatusFilter[]
  page?: number
}

function listOf<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  const items = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : []
  const kept = allowed.filter(item => items.includes(item))

  return kept.length ? kept : undefined
}

/** The most rows the API skips (its `MAX_OFFSET`). */
const MAX_OFFSET = 10_000

/** The last page the API serves at this page size: it refuses a skip over 10,000 rows. A link past it opens here, and the screen moves to the last real page. */
const maxPageOf = (pageSize: number) => Math.floor(MAX_OFFSET / pageSize) + 1

export const pageSizeOf = (kind: MediaKind) => (kind === 'image' ? WALL_PAGE_SIZE : LIST_PAGE_SIZE)

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parseMediaSearch(search: Record<string, unknown>): MediaSearch {
  const page = Number(search.page)
  const kind = MEDIA_KINDS.find(item => item === search.kind)

  return {
    kind,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    use: listOf(search.use, USE_FILTERS),
    status: listOf(search.status, STATUS_FILTERS),
    page: Number.isInteger(page) && page > 1 ? Math.min(page, maxPageOf(pageSizeOf(kind ?? 'image'))) : undefined,
  }
}
