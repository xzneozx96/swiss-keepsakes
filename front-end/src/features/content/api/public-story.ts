import type { PublicLanguage, PublicStory } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { apiOrigin } from '@/lib/api-origin'

/**
 * One published story, as `GET /api/public/stories/{slug}` sends it, in `lang` or in the language that has it. Null when no
 * published version has the slug (the route answers 404). Throws on any other failure, so a failed read is never shown as a missing story.
 */
export async function loadPublicStory(slug: string, lang: PublicLanguage): Promise<PublicStory | null> {
  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicStorySchema } = await import('@sk/api-contract')

  try {
    const story = await answer(createApiClient(apiOrigin()).GET('/api/public/stories/{slug}', { ...timeout(PAGE_READ_TIMEOUT_MS), params: { path: { slug }, query: { lang } } }))

    return publicStorySchema.parse(story)
  }
  catch (error) {
    if (error instanceof ApiProblem && error.status === 404)
      return null
    throw error
  }
}
