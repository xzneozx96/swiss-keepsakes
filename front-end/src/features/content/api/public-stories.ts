import type { PublicLanguage, PublicStoryCard } from '@sk/api-contract'
import { createIsomorphicFn } from '@tanstack/react-start'
import { serverApiOrigin } from '@/features/seo/api/api-origin'

const TIMEOUT_MS = 5000

// The server reads the API at its internal address; the browser reads it at the page's own origin (tanstack-start.md, rule 4).
const apiOrigin = createIsomorphicFn()
  .server(serverApiOrigin)
  .client(() => window.location.origin)

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
