import type { PublicKeepsake, PublicKeepsakeAvailability, PublicLanguage, PublicPickupPoints } from '@sk/api-contract'
import { answer, timeout } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { apiOrigin } from '@/lib/api-origin'

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

/** The active pickup points of the store that owns the keepsake, with their weekly hours. Any failure, a 404 too, throws: the sheet then shows an error with a retry. */
export async function fetchPickupPoints(slug: string, lang: PublicLanguage): Promise<PublicPickupPoints> {
  const { createApiClient } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const points = await answer(client.GET('/api/public/keepsakes/{slug}/pickup-points', { ...timeout(), params: { path: { slug }, query: { lang } } }))

  // Not parsed with the contract's strict schema: the page keeps only the fields it reads, so a field the API adds later cannot fail the whole pickup area. The contract test stays strict.
  return {
    items: points.items.map(({ id, name, address, instructions, mapsUrl, hours }) => ({
      id,
      name,
      address,
      instructions,
      mapsUrl,
      hours: hours.map(({ weekday, opens, closes }) => ({ weekday, opens, closes })),
    })),
  }
}
