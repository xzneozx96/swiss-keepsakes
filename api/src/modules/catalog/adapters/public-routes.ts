import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PublicKeepsakeAvailability as ContractAvailability, PublicKeepsake as ContractKeepsake, PublicKeepsakeList as ContractList, PublicPickupPoints as ContractPickupPoints } from '@sk/api-contract'
import type { ContentLanguage } from '@sk/domain/content'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { ListKeepsakesQuery, PublicKeepsake, PublicKeepsakeAvailability, PublicKeepsakePage, PublicPickupPoints } from '../application/public-keepsakes.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { pageQuery, publicKeepsakeAvailabilitySchema, publicKeepsakeListSchema, publicKeepsakeSchema, publicLanguageSchema, publicPickupPointsSchema } from '@sk/api-contract'
import { conditionalJson } from '../../../platform/http/conditional-json.ts'
import { cursorProblem, decodeCursor, encodeCursor } from '../../../platform/http/cursor.ts'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { json } from './route-parts.ts'
import { limitWholeList } from '../../../platform/http/whole-list-limits.ts'

// The text reads are cached for 30 s; the availability read for 5 s only, so a sell-out shows soon (ADR-006).
const textCacheControl = 'max-age=30'
const availabilityCacheControl = 'max-age=5'

// What the public keepsake routes call. They take no actor and no store: published keepsakes are public and one list
// covers all stores.
export interface PublicKeepsakeUseCases {
  listKeepsakes: (query: ListKeepsakesQuery) => Promise<PublicKeepsakePage>
  getKeepsake: (slug: string, language: ContentLanguage) => Promise<Result<PublicKeepsake>>
  getAvailability: (slug: string, language: ContentLanguage) => Promise<Result<PublicKeepsakeAvailability>>
  getPickupPoints: (slug: string, language: ContentLanguage) => Promise<Result<PublicPickupPoints>>
}

// The application types and the contract types must stay the same shape: a price added to the list or the detail on one
// side fails the build here until the other side and the contract change on purpose.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<_T extends true> = never
export type PublicKeepsakeTypesMatchContract = [
  Assert<Same<Omit<PublicKeepsakePage, 'next'>, Omit<ContractList, 'nextCursor'>>>,
  Assert<Same<PublicKeepsake, ContractKeepsake>>,
  Assert<Same<PublicKeepsakeAvailability, ContractAvailability>>,
  Assert<Same<PublicPickupPoints, ContractPickupPoints>>,
]

const query = z.object({ lang: publicLanguageSchema.meta({ description: 'The language asked for. A keepsake that has no version in it comes back in the other language, marked `fallback`' }) })
const slugParams = z.object({ slug: z.string().min(1).meta({ description: 'The slug of either language' }) })

function cacheHeaders(cacheControl: string) {
  return ({
    ...requestIdHeader,
    'Cache-Control': { description: `\`${cacheControl}\``, schema: { type: 'string' } },
    'ETag': { description: 'A strong tag of the body. Send it back in If-None-Match', schema: { type: 'string' } },
  }) as const
}

function publicGet<S extends z.ZodType, P extends z.ZodObject | undefined = undefined>(path: string, description: string, schema: S, cacheControl: string, params?: P) {
  return createRoute({
    method: 'get',
    path,
    request: { query, ...(params ? { params } : {}) } as { query: typeof query, params: P extends z.ZodObject ? P : never },
    responses: {
      200: { description, headers: cacheHeaders(cacheControl), content: json(schema) },
      304: { description: 'The If-None-Match tag still matches. No body', headers: cacheHeaders(cacheControl) },
      ...(params ? { 404: { ...problemResponses.default, description: 'No such published keepsake' } } : {}),
      ...problemResponses,
    },
  })
}

// The keepsake list pages with a cursor (ADR-033). While the route moves to paging, a request without `limit` still gets the whole list.
const listQuery = query.extend({
  ...pageQuery().shape,
  category: z.string().min(1).max(120).optional().meta({ description: 'A product category slug. A parent includes its direct sub-categories. An unknown slug gives an empty list' }),
})
const listRoute = createRoute({
  method: 'get',
  path: '/api/public/keepsakes',
  request: { query: listQuery },
  responses: {
    200: { description: 'A page of the published keepsakes, newest first. No price and no stock figure', headers: cacheHeaders(textCacheControl), content: json(publicKeepsakeListSchema) },
    304: { description: 'The If-None-Match tag still matches. No body', headers: cacheHeaders(textCacheControl) },
    ...problemResponses,
  },
})
// The key of a keepsake cursor: `created_at` at microsecond precision (UTC), then the product id.
const listKey = z.tuple([z.iso.datetime({ precision: 6 }), z.uuid()])
const detailRoute = publicGet('/api/public/keepsakes/{slug}', 'One published keepsake: text, photos, options and the combinations for sale. No price and no stock figure', publicKeepsakeSchema, textCacheControl, slugParams)
const availabilityRoute = publicGet('/api/public/keepsakes/{slug}/availability', 'The price and the units of each combination for sale. The only public keepsake read with a price', publicKeepsakeAvailabilitySchema, availabilityCacheControl, slugParams)
const pickupPointsRoute = publicGet('/api/public/keepsakes/{slug}/pickup-points', 'The active pickup points of the store that owns the keepsake, by the merchant\'s order. No store id, pin, position, archived flag or row version', publicPickupPointsSchema, textCacheControl, slugParams)

// Anonymous: no guard sits on /api/public. An unpublished or archived keepsake is a 404.
export function registerPublicKeepsakeRoutes(app: OpenAPIHono<AppEnv>, useCases: PublicKeepsakeUseCases): void {
  app.openapi(listRoute, async (c) => {
    const { lang, limit, cursor, category } = c.req.valid('query')
    // The cursor belongs to this route, language and filter, and to nothing else.
    const scope = { route: 'public-keepsakes', lang, category: category ?? null }
    const decoded = cursor === undefined ? undefined : decodeCursor(cursor, scope, listKey)
    if (decoded && !decoded.ok)
      return cursorProblem(c)
    const found = await useCases.listKeepsakes({ language: lang, category, limit, after: decoded?.key })
    return conditionalJson(c, { items: found.items, total: found.total, nextCursor: found.next ? encodeCursor(found.next, scope) : null }, textCacheControl)
  })

  app.openapi(detailRoute, async (c) => {
    const result = await useCases.getKeepsake(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, textCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(availabilityRoute, async (c) => {
    const result = await useCases.getAvailability(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, limitWholeList(c, 'GET /api/public/keepsakes/{slug}/availability', result.value), availabilityCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(pickupPointsRoute, async (c) => {
    const result = await useCases.getPickupPoints(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, limitWholeList(c, 'GET /api/public/keepsakes/{slug}/pickup-points', result.value), textCacheControl) : problem(c, failureProblem(result))
  })
}
