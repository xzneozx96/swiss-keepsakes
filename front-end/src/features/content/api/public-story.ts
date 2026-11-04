import type { PublicLanguage, PublicStory } from '@sk/api-contract'
import { createIsomorphicFn } from '@tanstack/react-start'
import { serverApiOrigin } from '@/features/seo/api/api-origin'

const TIMEOUT_MS = 5000

// The server reads the API at its internal address; the browser reads it at the page's own origin (tanstack-start.md, rule 4).
const apiOrigin = createIsomorphicFn()
  .server(serverApiOrigin)
  .client(() => window.location.origin)

/**
 * One published story, as `GET /api/public/stories/{slug}` sends it, in `lang` or in the language that has it. Null when no
 * published version has the slug (the route answers 404). Throws on any other failure, so a failed read is never shown as a missing story.
 */
export async function loadPublicStory(slug: string, lang: PublicLanguage): Promise<PublicStory | null> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicStorySchema } = await import('@sk/api-contract')
  const { data, response } = await createApiClient(apiOrigin()).GET('/api/public/stories/{slug}', {
    params: { path: { slug }, query: { lang } },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (response.status === 404)
    return null
  if (!response.ok)
    throw new Error(`Story answered ${response.status}`)

  return publicStorySchema.parse(data)
}
