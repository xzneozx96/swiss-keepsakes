import type { PublicKeepsake, PublicKeepsakeAvailability, PublicLanguage } from '@sk/api-contract'
import { ApiProblem } from '@/features/data-client/errors'
import { apiOrigin } from './api-origin'
import { answer, timeout } from '@/features/data-client/api-transport'

/** One published keepsake (text, photos, options, combinations; never a price). Null when there is none; any other failure throws. */
export async function fetchKeepsake(slug: string, lang: PublicLanguage): Promise<PublicKeepsake | null> {
  const { createApiClient, publicKeepsakeSchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())

  try {
    const keepsake = await answer(client.GET('/api/public/keepsakes/{slug}', { ...timeout(), params: { path: { slug }, query: { lang } } }))

    return publicKeepsakeSchema.parse(keepsake)
  }
  catch (error) {
    if (error instanceof ApiProblem && error.status === 404)
      return null
    throw error
  }
}

/** The price and the units of each combination. The only keepsake read with a price, so the browser calls it after the page has loaded. */
export async function fetchAvailability(slug: string, lang: PublicLanguage): Promise<PublicKeepsakeAvailability> {
  const { createApiClient, publicKeepsakeAvailabilitySchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const availability = await answer(client.GET('/api/public/keepsakes/{slug}/availability', { ...timeout(), params: { path: { slug }, query: { lang } } }))

  return publicKeepsakeAvailabilitySchema.parse(availability)
}
