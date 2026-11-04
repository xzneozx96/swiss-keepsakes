import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PublicKeepsakeAvailability as ContractAvailability, PublicKeepsake as ContractKeepsake, PublicKeepsakeList as ContractList } from '@sk/api-contract'
import type { ContentLanguage } from '@sk/domain/content'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PublicKeepsake, PublicKeepsakeAvailability, PublicKeepsakeList } from '../application/public-keepsakes.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { publicKeepsakeAvailabilitySchema, publicKeepsakeListSchema, publicKeepsakeSchema, publicLanguageSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { availabilityCacheControl, conditionalJson, textCacheControl } from './public-cache.ts'
import { json } from './route-parts.ts'

// What the public keepsake routes call. They take no actor and no store: published keepsakes are public and one list
// covers all stores.
export interface PublicKeepsakeUseCases {
  listKeepsakes: (language: ContentLanguage) => Promise<PublicKeepsakeList>
  getKeepsake: (slug: string, language: ContentLanguage) => Promise<Result<PublicKeepsake>>
  getAvailability: (slug: string, language: ContentLanguage) => Promise<Result<PublicKeepsakeAvailability>>
}

// The application types and the contract types must stay the same shape: a price added to the list or the detail on one
// side fails the build here until the other side and the contract change on purpose.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<_T extends true> = never
export type PublicKeepsakeTypesMatchContract = [
  Assert<Same<PublicKeepsakeList, ContractList>>,
  Assert<Same<PublicKeepsake, ContractKeepsake>>,
  Assert<Same<PublicKeepsakeAvailability, ContractAvailability>>,
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

const listRoute = publicGet('/api/public/keepsakes', 'The published keepsakes, newest first. No price and no stock figure', publicKeepsakeListSchema, textCacheControl)
const detailRoute = publicGet('/api/public/keepsakes/{slug}', 'One published keepsake: text, photos, options and the combinations for sale. No price and no stock figure', publicKeepsakeSchema, textCacheControl, slugParams)
const availabilityRoute = publicGet('/api/public/keepsakes/{slug}/availability', 'The price and the units of each combination for sale. The only public keepsake read with a price', publicKeepsakeAvailabilitySchema, availabilityCacheControl, slugParams)

// Anonymous: no guard sits on /api/public. An unpublished or archived keepsake is a 404.
export function registerPublicKeepsakeRoutes(app: OpenAPIHono<AppEnv>, useCases: PublicKeepsakeUseCases): void {
  app.openapi(listRoute, async c => conditionalJson(c, await useCases.listKeepsakes(c.req.valid('query').lang), textCacheControl))

  app.openapi(detailRoute, async (c) => {
    const result = await useCases.getKeepsake(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, textCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(availabilityRoute, async (c) => {
    const result = await useCases.getAvailability(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, availabilityCacheControl) : problem(c, failureProblem(result))
  })
}
