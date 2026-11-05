import type { PublicKeepsakeList, PublicLanguage } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { apiOrigin } from '@/lib/api-origin'

/** Keepsakes a page of the guest list holds (owner, 05.11.2026). The API allows 20 at most. */
export const KEEPSAKES_PAGE_SIZE = 10

export interface KeepsakesPageRequest {
  /** A product category slug, filtered on the server. */
  category?: string | undefined
  /** The `nextCursor` of the page before. Absent for the first page. */
  cursor?: string | undefined
  limit: number
}

/**
 * One page of `GET /api/public/keepsakes`, newest first, with `total` for the filtered set. A failed read throws; the route
 * turns that into its error state.
 */
export async function loadKeepsakesPage(lang: PublicLanguage, { category, cursor, limit }: KeepsakesPageRequest): Promise<PublicKeepsakeList> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicKeepsakeListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/keepsakes', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang, limit, ...(cursor ? { cursor } : {}), ...(category ? { category } : {}) } } }))

  return publicKeepsakeListSchema.parse(list)
}
