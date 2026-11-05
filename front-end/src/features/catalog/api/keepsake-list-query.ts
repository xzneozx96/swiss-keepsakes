import type { PublicLanguage } from '@sk/api-contract'
import { queryOptions } from '@tanstack/react-query'
import { fromApi } from '@/features/data-client/api-transport'
import { pagedQueryOptions } from '@/features/data-client/paged-query'
import { queryKeys } from '@/features/data-client/query-keys'
import { KEEPSAKES_PAGE_SIZE, loadAllKeepsakes, loadKeepsakesPage } from './keepsakes'

// The keys are not under the merchant prefix, so a merchant change never refetches the guest lists.

/**
 * The guest keepsake list as an infinite query. The language and the category are in the key, so a new category starts at page 1.
 * The pages stay in the cache for the way back to the list (ADR-033, section 8): no `maxPages`.
 */
export function publicKeepsakesQuery(lang: PublicLanguage, category: string | null) {
  return pagedQueryOptions({
    queryKey: [...queryKeys.keepsakes.publicList, 'list', lang, category],
    read: cursor => loadKeepsakesPage(lang, { category: category ?? undefined, cursor, limit: KEEPSAKES_PAGE_SIZE }),
  })
}

/**
 * The first page of the guest list, for the blocks that show a few keepsakes (the home showcase, the tour block). One cache entry per
 * language and limit; each takes what it needs with `select`. They never read a second page.
 */
export function firstKeepsakes(lang: PublicLanguage, limit: number = KEEPSAKES_PAGE_SIZE) {
  return queryOptions({ ...fromApi, queryKey: [...queryKeys.keepsakes.publicList, 'first', lang, limit], queryFn: () => loadKeepsakesPage(lang, { limit }) })
}

/** Every published keepsake, for the search until it moves to the server (ADR-033, slice 6). */
export function allKeepsakes(lang: PublicLanguage) {
  return queryOptions({ ...fromApi, queryKey: [...queryKeys.keepsakes.publicList, 'all', lang], queryFn: () => loadAllKeepsakes(lang) })
}
