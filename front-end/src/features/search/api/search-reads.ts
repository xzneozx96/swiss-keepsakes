import type { PublicLanguage, PublicSearchList, SearchKind } from '@sk/api-contract'
import type { InterestCode } from '@/features/search/components/interest-codes'

import { useInfiniteQuery } from '@tanstack/react-query'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { pagedQueryOptions } from '@/features/data-client/paged-query'
import { queryKeys } from '@/features/data-client/query-keys'
import { apiEnabled } from '@/lib/api-mode'
import { apiOrigin } from '@/lib/api-origin'

/** Hits a page of the search holds (owner, 05.11.2026). The API allows 20 at most. */
export const SEARCH_PAGE_SIZE = 10

/** The longest text the API takes (a longer one is a 400); the field stops there. */
export const SEARCH_QUERY_MAX = 100

/** What is searched: the typed text, or a tapped interest tile when the field is empty. `kind` narrows the hits. */
export interface SearchRequest {
  q: string
  interest?: InterestCode | undefined
  kind?: SearchKind | undefined
}

/**
 * One page of `GET /api/public/search`, best match first, with `total` and the count of every kind. The server does the matching:
 * the browser never holds a list to search (ADR-033, slice 6). A failed read throws.
 */
export async function loadSearchPage(lang: PublicLanguage, { q, interest, kind }: SearchRequest, { cursor, limit = SEARCH_PAGE_SIZE }: { cursor?: string | undefined, limit?: number } = {}): Promise<PublicSearchList> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicSearchListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/search', {
    ...timeout(PAGE_READ_TIMEOUT_MS),
    params: { query: { lang, limit, ...(q ? { q } : {}), ...(interest ? { interest } : {}), ...(kind ? { kind } : {}), ...(cursor ? { cursor } : {}) } },
  }))

  return publicSearchListSchema.parse(list)
}

/** The search as an infinite query. The language, text, interest and kind are in the key, so a change starts again at page 1. */
export function searchPagesQuery(lang: PublicLanguage, request: SearchRequest) {
  return pagedQueryOptions({
    queryKey: [...queryKeys.search.list, lang, request.q, request.interest ?? null, request.kind ?? null],
    read: cursor => loadSearchPage(lang, request, { cursor }),
  })
}

/**
 * The pages of one search. Nothing is read for an empty text without an interest, nor in a build without the API (`apiEnabled`),
 * so those send no request and show no skeleton.
 */
export function useSearchPages(lang: PublicLanguage, request: SearchRequest) {
  return useInfiniteQuery({ ...searchPagesQuery(lang, request), enabled: apiEnabled && (request.q !== '' || request.interest !== undefined) })
}
