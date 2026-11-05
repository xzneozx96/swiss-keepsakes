/** The states the status chip shows, so a filter option and a chip say the same thing. Archived keepsakes show only when this one is ticked. */
export const STATUS_FILTERS = ['draft', 'published', 'editsNotLive', 'archived'] as const

export type StatusFilter = (typeof STATUS_FILTERS)[number]

export const KEEPSAKES_PAGE_SIZE = 10

/** The most rows the API skips (its `MAX_OFFSET`). */
const MAX_OFFSET = 10_000

/** The last page the API serves at this page size: it refuses a skip over 10,000 rows. A link past it opens here, and the screen moves to the last real page. */
const MAX_PAGE = Math.floor(MAX_OFFSET / KEEPSAKES_PAGE_SIZE) + 1

/**
 * The keepsake table's place in the URL: the ticked statuses, the search and the page (ADR-033). Nothing ticked is no `status`
 * (every keepsake but the archived ones), page 1 is no `page`. The server filters, counts and pages.
 */
export interface KeepsakesSearch {
  status?: StatusFilter[]
  q?: string
  page?: number
}

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parseKeepsakesSearch(search: Record<string, unknown>): KeepsakesSearch {
  const page = Number(search.page)
  const items = typeof search.status === 'string' ? search.status.split(',') : Array.isArray(search.status) ? search.status : []
  const status = STATUS_FILTERS.filter(id => items.includes(id))

  return {
    status: status.length > 0 ? status : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : undefined,
  }
}

export const isFiltered = (search: KeepsakesSearch) => (search.q?.trim() ?? '') !== '' || (search.status?.length ?? 0) > 0
