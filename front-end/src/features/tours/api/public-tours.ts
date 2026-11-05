import type { PublicLanguage, PublicTourList } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { pagedQueryOptions } from '@/features/data-client/paged-query'
import { queryKeys } from '@/features/data-client/query-keys'
import { apiOrigin } from '@/lib/api-origin'

/** Tours a page of the guest list holds (owner, 05.11.2026). The API allows 20 at most. */
export const TOURS_PAGE_SIZE = 10

/**
 * One page of `GET /api/public/tours`, newest first. Throws when the read fails: the route turns that into the error state and
 * never falls back to demo tours.
 */
export async function loadPublicToursPage(lang: PublicLanguage, { cursor, limit }: { cursor?: string | undefined, limit: number }): Promise<PublicTourList> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicTourListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/tours', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang, limit, ...(cursor ? { cursor } : {}) } } }))

  return publicTourListSchema.parse(list)
}

/** The guest tours list as an infinite query. The language is in the key. The pages stay cached for the way back (ADR-033, section 8). */
export function publicToursQuery(lang: PublicLanguage) {
  return pagedQueryOptions({
    queryKey: [...queryKeys.guestTours, lang],
    read: cursor => loadPublicToursPage(lang, { cursor, limit: TOURS_PAGE_SIZE }),
  })
}
