import type { PublicCategory, PublicLanguage, PublicStoryList } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { apiOrigin } from '@/lib/api-origin'

/** Stories a page of the guest list holds (owner, 05.11.2026). The API allows 20 at most. */
export const STORIES_PAGE_SIZE = 10

export interface StoriesPageRequest {
  /** A blog category slug, filtered on the server. */
  category?: string | undefined
  /** The `nextCursor` of the page before. Absent for the first page. */
  cursor?: string | undefined
  limit: number
}

/**
 * One page of `GET /api/public/stories`, newest first, with `total` for the filtered set. Throws when the read fails: the route
 * turns that into the error state and never falls back to demo stories.
 */
export async function loadPublicStoriesPage(lang: PublicLanguage, { category, cursor, limit }: StoriesPageRequest): Promise<PublicStoryList> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicStoryListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/stories', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang, limit, ...(cursor ? { cursor } : {}), ...(category ? { category } : {}) } } }))

  return publicStoryListSchema.parse(list)
}

/** Every blog category, parents first, with both names, as `GET /api/public/blog-categories` sends them. Throws when the read fails; the list then shows without a filter. */
export async function loadBlogCategories(lang: PublicLanguage): Promise<PublicCategory[]> {
  const { createApiClient, publicCategoryListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/blog-categories', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang } } }))

  return publicCategoryListSchema.parse(list).items
}
