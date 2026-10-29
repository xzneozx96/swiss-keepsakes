import type { PinListItem } from '@sk/api-contract'
import type { Lang } from './form'

export const NO_CATEGORY = 'none'
export const STATUSES = ['draft', 'published', 'hidden', 'ended'] as const
export const DATE_FILTERS = ['has', 'none'] as const

export interface ListFilters {
  status: string[]
  category: string[]
  stay: string[]
  dates: string[]
  query: string
}

export const noFilters: ListFilters = { status: [], category: [], stay: [], dates: [], query: '' }

/** The title in the dashboard's language, else the other one. `undefined` for a pin with no title yet. */
export function titleOf(item: Pick<PinListItem, 'title'>, language: Lang): string | undefined {
  return item.title[language] ?? item.title[language === 'en' ? 'de' : 'en']
}

/** The languages that carry a title, in the order EN, DE. */
export function languagesOf(item: Pick<PinListItem, 'title'>): Lang[] {
  return (['en', 'de'] as const).filter(lang => (item.title[lang] ?? '') !== '')
}

const matches = (selected: string[], test: (id: string) => boolean) => selected.length === 0 || selected.some(test)

/** Each filter group is an OR among its options; the groups and the search narrow together. */
export function filterItems(items: PinListItem[], filters: ListFilters): PinListItem[] {
  const query = filters.query.trim().toLowerCase()

  return items.filter(item =>
    matches(filters.status, id => item.status === id)
    && matches(filters.category, id => (id === NO_CATEGORY ? item.categoryIds.length === 0 : item.categoryIds.includes(id)))
    && matches(filters.stay, id => item.stayTag === id)
    && matches(filters.dates, id => (id === 'has' ? item.hasDates : !item.hasDates))
    && (query === ''
      || [item.title.en, item.title.de, item.slug?.en, item.slug?.de].some(text => text?.toLowerCase().includes(query))),
  )
}

export function isFiltered(filters: ListFilters) {
  return filters.query.trim() !== '' || filters.status.length + filters.category.length + filters.stay.length + filters.dates.length > 0
}
