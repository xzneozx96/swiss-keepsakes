import type { PublicCategory, PublicLanguage, PublicMapItem, PublicTourCard } from '@sk/api-contract'
import type { ServiceTile } from '../lib/service-tiles'

import { apiOrigin } from '@/features/catalog/api/api-origin'
import { timeout } from '@/features/data-client/api-transport'
import { apiEnabled } from '@/lib/api-mode'
import { serviceTiles } from '../lib/service-tiles'

/** What the home's loader read. A read that failed is `null`, so its block shows its own error and the rest of the page stays. */
export interface HomeRead {
  /** The pins of the public map list (the postcards pick the must-visit ones). */
  pins: PublicMapItem[] | null
  /** The top-level map categories, for the food map and the events (the browser does not read the map list again). */
  categories: PublicCategory[] | null
  /** The service tiles, made from the map categories and the pins; null when either read failed. */
  tiles: ServiceTile[] | null
  tours: PublicTourCard[] | null
}

async function read<T>(call: Promise<{ data?: T, response: Response }>): Promise<T | null> {
  try {
    const { data, response } = await call

    return response.ok && data !== undefined ? data : null
  }
  catch {
    return null
  }
}

/**
 * The reads of the home blocks, on the server and in the browser (the server reads the API at its internal address, so the
 * HTML carries the blocks). The reads run in parallel, and each answer is checked for itself.
 */
export async function loadHomeRead(lang: PublicLanguage): Promise<HomeRead> {
  // The demo build has no API: it sends no request and every block is empty, as the guest map is.
  if (!apiEnabled)
    return { pins: [], categories: [], tiles: [], tours: [] }

  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicCategoryListSchema, publicMapSchema, publicTourListSchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const options = () => ({ params: { query: { lang } }, ...timeout() })
  const [map, categories, tours] = await Promise.all([
    read(client.GET('/api/public/map', options())),
    read(client.GET('/api/public/map-categories', options())),
    read(client.GET('/api/public/tours', options())),
  ])
  const pins = publicMapSchema.safeParse(map)
  const mapCategories = publicCategoryListSchema.safeParse(categories)
  const cards = publicTourListSchema.safeParse(tours)

  return {
    pins: pins.success ? pins.data.items : null,
    categories: mapCategories.success ? mapCategories.data.items : null,
    tiles: pins.success && mapCategories.success ? serviceTiles(mapCategories.data.items, pins.data.items, lang) : null,
    tours: cards.success ? cards.data.items : null,
  }
}
