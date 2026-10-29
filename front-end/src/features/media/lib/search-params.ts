import type { MediaKind } from '@sk/domain/content'

export const MEDIA_KINDS = ['image', 'audio', 'pdf'] as const satisfies readonly MediaKind[]
export const USE_FILTERS = ['unused', 'drafts', 'published'] as const
export const STATUS_FILTERS = ['processing', 'ready', 'retired'] as const

export type UseFilter = (typeof USE_FILTERS)[number]
export type StatusFilter = (typeof STATUS_FILTERS)[number]

/** A page of the photo wall is four rows of six on a laptop and eight rows of three on a phone. */
export const WALL_PAGE_SIZE = 24
export const LIST_PAGE_SIZE = 10

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

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parseMediaSearch(search: Record<string, unknown>): MediaSearch {
  const page = Number(search.page)

  return {
    kind: MEDIA_KINDS.find(kind => kind === search.kind),
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    use: listOf(search.use, USE_FILTERS),
    status: listOf(search.status, STATUS_FILTERS),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export const pageSizeOf = (kind: MediaKind) => (kind === 'image' ? WALL_PAGE_SIZE : LIST_PAGE_SIZE)
