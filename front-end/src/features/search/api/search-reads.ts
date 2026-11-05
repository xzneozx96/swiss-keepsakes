import type { PublicLanguage, PublicTourCard } from '@sk/api-contract'
import type { SearchKind, SearchSources } from '@/features/search/lib/search'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { allKeepsakes } from '@/features/catalog/api/keepsake-list-query'
import { loadPublicStories } from '@/features/content/api/public-stories'
import { answer, fromApi, timeout } from '@/features/data-client/api-transport'
import { readAllPages } from '@/features/data-client/paged-query'
import { queryKeys } from '@/features/data-client/query-keys'
import { mapQueries } from '@/features/map/api/queries'
import { apiEnabled } from '@/lib/api-mode'
import { apiOrigin } from '@/lib/api-origin'

/** Every published tour in one language, read page by page (ADR-033: search keeps its loop until slice 6). A failed read throws. */
async function fetchTourCards(lang: PublicLanguage): Promise<PublicTourCard[]> {
  const { createApiClient, MAX_PAGE_LIMIT } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())

  return readAllPages(cursor => answer(client.GET('/api/public/tours', { ...timeout(), params: { query: { lang, limit: MAX_PAGE_LIMIT, ...(cursor ? { cursor } : {}) } } })), `Tours in ${lang}`)
}

const searchQueries = {
  stories: (lang: PublicLanguage) => queryOptions({ ...fromApi, queryKey: [...queryKeys.search.stories, lang], queryFn: () => loadPublicStories(lang), enabled: apiEnabled }),
  tours: (lang: PublicLanguage) => queryOptions({ ...fromApi, queryKey: [...queryKeys.search.tours, lang], queryFn: () => fetchTourCards(lang), enabled: apiEnabled }),
  keepsakes: (lang: PublicLanguage) => queryOptions({ ...allKeepsakes(lang), enabled: apiEnabled }),
}

/**
 * The four lists the search reads, each on its own so one failed read leaves the others (`failed` names it). The pins are
 * the cached map read (ADR-006). `isLoading` is true only while a read is in flight. Like the pins read, the three lists wait for the API (`apiEnabled`), so a build without it sends no request, shows no skeleton and no failure notice.
 */
export function useSearchSources(lang: PublicLanguage) {
  const stories = useQuery(searchQueries.stories(lang))
  const pins = useQuery(mapQueries.pins(lang))
  const tours = useQuery(searchQueries.tours(lang))
  const keepsakes = useQuery(searchQueries.keepsakes(lang))
  const sources: SearchSources = { stories: stories.data ?? [], pins: pins.data ?? [], tours: tours.data ?? [], keepsakes: keepsakes.data ?? [] }
  const failed: SearchKind[] = [
    ...(pins.isError ? ['place' as const] : []),
    ...(stories.isError ? ['story' as const] : []),
    ...(tours.isError ? ['tour' as const] : []),
    ...(keepsakes.isError ? ['keepsake' as const] : []),
  ]

  return { sources, failed, isLoading: stories.isLoading || pins.isLoading || tours.isLoading || keepsakes.isLoading }
}
