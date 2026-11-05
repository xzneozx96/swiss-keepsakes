/** `?start=dates`: Add event opens a new place on the dates step. Read by the editor route's `validateSearch`. */
export const START_STEPS = ['dates'] as const
export type StartStep = typeof START_STEPS[number]

export const PLACES_PATH = '/store/content/places' as const
export const NEW_PLACE_ID = 'new'

/**
 * The pins table's place in the URL: the filter groups, the search and the page (ADR-033). A group is a list of ticked options,
 * none when nothing is ticked; page 1 is no `page`. The server filters, counts and pages.
 */
export interface PlacesSearch {
  status?: string[]
  category?: string[]
  stay?: string[]
  type?: string[]
  q?: string
  page?: number
}

export const PLACES_PAGE_SIZE = 10

function listOf(value: unknown, allowed?: readonly string[]): string[] | undefined {
  const items = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const kept = items.filter((item, index) => item !== '' && items.indexOf(item) === index && (allowed ? allowed.includes(item) : /^[\w-]{1,40}$/.test(item)))

  return kept.length > 0 ? kept.slice(0, 40) : undefined
}

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parsePlacesSearch(search: Record<string, unknown>): PlacesSearch {
  const page = Number(search.page)

  return {
    status: listOf(search.status, ['draft', 'published', 'hidden', 'ended']),
    category: listOf(search.category),
    stay: listOf(search.stay, ['short_stay', 'multi_day', 'both']),
    type: listOf(search.type, ['place', 'event']),
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}
