import type { PublicCategory, PublicLanguage, PublicMapItem, PublicStoryCard } from '@sk/api-contract'
import type { HomeRoute } from '../lib/demo-routes'
import type { ServiceTile } from '../lib/service-tiles'

import { loadPublicStories } from '@/features/content/api/public-stories'
import { answer, timeout } from '@/features/data-client/api-transport'
import { apiEnabled } from '@/lib/api-mode'
import { apiOrigin } from '@/lib/api-origin'
import { serviceTiles } from '../lib/service-tiles'

/** What the home's loader read. A read that failed is `null`, so its block shows its own error and the rest of the page stays. */
export interface HomeRead {
  /** The pins of the public map list (the postcards pick the must-visit ones). */
  pins: PublicMapItem[] | null
  /** The top-level map categories, for the food map and the events (the browser does not read the map list again). */
  categories: PublicCategory[] | null
  /** The service tiles, made from the map categories and the pins; null when either read failed. */
  tiles: ServiceTile[] | null
  /** The published tours, or the demo tours while the API has none (until release 2b). */
  tours: HomeRoute[] | null
  /** The published stories, newest first (the stories block shows the first three). */
  stories: PublicStoryCard[] | null
}

/** A failed read is null, so its block shows its own error. */
function read<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T | null> {
  return answer(call).catch(() => null)
}

/** The demo route cards, loaded only when needed: the tour data is long, so it stays out of the home's first load. */
async function demoTours(lang: PublicLanguage): Promise<HomeRoute[]> {
  const { demoRoutes } = await import('../lib/demo-routes')

  return demoRoutes(lang)
}

/**
 * The reads of the home blocks, on the server and in the browser (the server reads the API at its internal address, so the
 * HTML carries the blocks). The reads run in parallel, and each answer is checked for itself.
 */
export async function loadHomeRead(lang: PublicLanguage): Promise<HomeRead> {
  // The demo build has no API: it sends no request and every block is empty, as the guest map is, except the demo routes.
  if (!apiEnabled)
    return { pins: [], categories: [], tiles: [], tours: await demoTours(lang), stories: [] }

  // The contract package carries Zod, so it loads with the first read and not with the first paint.
  const { createApiClient, publicCategoryListSchema, publicMapSchema, publicTourListSchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const options = () => ({ params: { query: { lang } }, ...timeout() })
  const [map, categories, tours, stories] = await Promise.all([
    read(client.GET('/api/public/map', options())),
    read(client.GET('/api/public/map-categories', options())),
    read(client.GET('/api/public/tours', options())),
    loadPublicStories(lang).catch(() => null),
  ])
  const pins = publicMapSchema.safeParse(map)
  const mapCategories = publicCategoryListSchema.safeParse(categories)
  const cards = publicTourListSchema.safeParse(tours)

  return {
    pins: pins.success ? pins.data.items : null,
    categories: mapCategories.success ? mapCategories.data.items : null,
    tiles: pins.success && mapCategories.success ? serviceTiles(mapCategories.data.items, pins.data.items, lang) : null,
    tours: cards.success ? (cards.data.items.length > 0 ? cards.data.items : await demoTours(lang)) : null,
    stories,
  }
}
