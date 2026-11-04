import type { PublicCategory, PublicLanguage, PublicStoryCard } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { apiOrigin } from '@/lib/api-origin'

/**
 * The published stories in one language, newest first, as `GET /api/public/stories` sends them. Throws when the read
 * fails: the route turns that into the error state and never falls back to demo stories.
 */
export async function loadPublicStories(lang: PublicLanguage): Promise<PublicStoryCard[]> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicStoryListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/stories', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang } } }))

  return publicStoryListSchema.parse(list).items
}

/** Every blog category, parents first, with both names, as `GET /api/public/blog-categories` sends them. Throws when the read fails; the list then shows without a filter. */
export async function loadBlogCategories(lang: PublicLanguage): Promise<PublicCategory[]> {
  const { createApiClient, publicCategoryListSchema } = await import('@sk/api-contract')
  const list = await answer(createApiClient(apiOrigin()).GET('/api/public/blog-categories', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { query: { lang } } }))

  return publicCategoryListSchema.parse(list).items
}
