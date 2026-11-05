import type { PublicLanguage } from '@sk/api-contract'
import { pagedQueryOptions } from '@/features/data-client/paged-query'
import { queryKeys } from '@/features/data-client/query-keys'
import { loadPublicStoriesPage, STORIES_PAGE_SIZE } from './public-stories'

/**
 * The guest stories list as an infinite query. The language and the category are in the key, so a new category starts at page 1.
 * The pages stay in the cache for the way back to the list (ADR-033, section 8): no `maxPages`.
 */
export function publicStoriesQuery(lang: PublicLanguage, category: string | null) {
  return pagedQueryOptions({
    queryKey: [...queryKeys.guestStories, lang, category],
    read: cursor => loadPublicStoriesPage(lang, { category: category ?? undefined, cursor, limit: STORIES_PAGE_SIZE }),
  })
}
