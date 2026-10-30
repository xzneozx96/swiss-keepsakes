import type { Product } from '@sk/api-contract'

/** The three states the status chip shows, so a filter option and a chip say the same thing. */
export const STATUS_FILTERS = ['draft', 'published', 'editsNotLive'] as const

export type StatusFilter = (typeof STATUS_FILTERS)[number]

export interface KeepsakeFilters {
  status: StatusFilter[]
  query: string
}

export const noFilters: KeepsakeFilters = { status: [], query: '' }

type Filterable = Pick<Product, 'status' | 'hasUnpublishedEdits'> & { name: { en?: string, de?: string } }

export function statusFilterOf(keepsake: Pick<Product, 'status' | 'hasUnpublishedEdits'>): StatusFilter {
  if (keepsake.status === 'draft')
    return 'draft'

  return keepsake.hasUnpublishedEdits ? 'editsNotLive' : 'published'
}

/** The status options are an OR among themselves; the search (the name in either language) narrows together with them. */
export function filterKeepsakes<T extends Filterable>(items: T[], filters: KeepsakeFilters): T[] {
  const query = filters.query.trim().toLowerCase()

  return items.filter(item =>
    (filters.status.length === 0 || filters.status.includes(statusFilterOf(item)))
    && (query === '' || [item.name.en, item.name.de].some(name => name?.toLowerCase().includes(query))),
  )
}

export function isFiltered(filters: KeepsakeFilters) {
  return filters.query.trim() !== '' || filters.status.length > 0
}
