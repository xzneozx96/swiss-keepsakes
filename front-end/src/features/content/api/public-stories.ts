import type { PublicCategory, PublicLanguage, PublicStoryCard } from '@sk/api-contract'
import { apiOrigin } from '@/features/catalog/api/api-origin'

const TIMEOUT_MS = 5000

/**
 * The published stories in one language, newest first, as `GET /api/public/stories` sends them. Throws when the read
 * fails: the route turns that into the error state and never falls back to demo stories.
 */
export async function loadPublicStories(lang: PublicLanguage): Promise<PublicStoryCard[]> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicStoryListSchema } = await import('@sk/api-contract')
  const { data, response } = await createApiClient(apiOrigin()).GET('/api/public/stories', {
    params: { query: { lang } },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok)
    throw new Error(`Stories answered ${response.status}`)

  return publicStoryListSchema.parse(data).items
}

/** Every blog category, parents first, with both names, as `GET /api/public/blog-categories` sends them. Throws when the read fails; the list then shows without a filter. */
export async function loadBlogCategories(lang: PublicLanguage): Promise<PublicCategory[]> {
  const { createApiClient, publicCategoryListSchema } = await import('@sk/api-contract')
  const { data, response } = await createApiClient(apiOrigin()).GET('/api/public/blog-categories', {
    params: { query: { lang } },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok)
    throw new Error(`Blog categories answered ${response.status}`)

  return publicCategoryListSchema.parse(data).items
}
