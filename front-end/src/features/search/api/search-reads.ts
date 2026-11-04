import type { PublicLanguage, PublicTourCard } from '@sk/api-contract'
import type { SearchKind, SearchSources } from '@/features/search/lib/search'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'
import { loadPublicStories } from '@/features/content/api/public-stories'
import { answer, fromApi, loadClient, timeout } from '@/features/data-client/api-transport'
import { mapQueries } from '@/features/map/api/queries'
import { apiEnabled } from '@/lib/api-mode'

/** The published tours in one language, as `GET /api/public/tours` sends them. A failed read throws. */
export async function fetchTourCards(lang: PublicLanguage): Promise<PublicTourCard[]> {
  const client = await loadClient()
  const { items } = await answer(client.GET('/api/public/tours', { ...timeout(), params: { query: { lang } } }))

  return items
}

const searchQueries = {
  stories: (lang: PublicLanguage) => queryOptions({ ...fromApi, queryKey: ['search', 'stories', lang], queryFn: () => loadPublicStories(lang), enabled: apiEnabled }),
  tours: (lang: PublicLanguage) => queryOptions({ ...fromApi, queryKey: ['search', 'tours', lang], queryFn: () => fetchTourCards(lang), enabled: apiEnabled }),
  keepsakes: (lang: PublicLanguage) => queryOptions({ ...fromApi, queryKey: ['search', 'keepsakes', lang], queryFn: async () => (await fetchKeepsakeList(lang)).items, enabled: apiEnabled }),
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
