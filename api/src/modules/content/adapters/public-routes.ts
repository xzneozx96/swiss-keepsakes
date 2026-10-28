import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PublicCategoryList as ContractCategoryList, PublicMap as ContractMap, PublicPin as ContractPin, PublicStory as ContractStory, PublicStoryList as ContractStoryList, PublicTour as ContractTour, PublicTourList as ContractTourList } from '@sk/api-contract'
import type { ContentLanguage } from '@sk/domain/content'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PublicCategoryList, PublicMap, PublicPin, PublicStory, PublicStoryList, PublicTour, PublicTourList } from '../application/public-view.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { publicCategoryListSchema, publicLanguageSchema, publicMapSchema, publicPinSchema, publicStoryListSchema, publicStorySchema, publicTourListSchema, publicTourSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { conditionalJson } from './public-cache.ts'
import { json } from './route-parts.ts'

// What the public routes call. They take no actor and no store: the content is public and one list covers all stores.
export interface PublicUseCases {
  listStories: (language: ContentLanguage) => Promise<PublicStoryList>
  getStory: (slug: string, language: ContentLanguage) => Promise<Result<PublicStory>>
  getPin: (id: string, language: ContentLanguage) => Promise<Result<PublicPin>>
  listTours: (language: ContentLanguage) => Promise<PublicTourList>
  getTour: (slug: string, language: ContentLanguage) => Promise<Result<PublicTour>>
  listCategories: (kind: 'map' | 'blog') => Promise<PublicCategoryList>
  getMap: (language: ContentLanguage) => Promise<PublicMap>
}

// The application types and the contract types must stay the same shape: a field added on one side (a price, say)
// fails the build here until the other side and the contract change on purpose.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<_T extends true> = never
export type PublicTypesMatchContract = [
  Assert<Same<PublicStoryList, ContractStoryList>>,
  Assert<Same<PublicStory, ContractStory>>,
  Assert<Same<PublicPin, ContractPin>>,
  Assert<Same<PublicMap, ContractMap>>,
  Assert<Same<PublicTourList, ContractTourList>>,
  Assert<Same<PublicTour, ContractTour>>,
  Assert<Same<PublicCategoryList, ContractCategoryList>>,
]

const query = z.object({ lang: publicLanguageSchema.meta({ description: 'The language asked for. An item that has no version in it comes back in the other language, marked `fallback`' }) })
const slugParams = z.object({ slug: z.string().min(1) })
const pinParams = z.object({ id: z.uuid() })

const cacheHeaders = {
  ...requestIdHeader,
  'Cache-Control': { description: '`max-age=30`', schema: { type: 'string' } },
  'ETag': { description: 'A strong tag of the body. Send it back in If-None-Match', schema: { type: 'string' } },
} as const

const notModified = { description: 'The If-None-Match tag still matches. No body', headers: cacheHeaders } as const

function publicGet<S extends z.ZodType, P extends z.ZodObject | undefined = undefined>(path: string, description: string, schema: S, params?: P, notFound = false) {
  return createRoute({
    method: 'get',
    path,
    request: { query, ...(params ? { params } : {}) } as { query: typeof query, params: P extends z.ZodObject ? P : never },
    responses: {
      200: { description, headers: cacheHeaders, content: json(schema) },
      304: notModified,
      ...(notFound ? { 404: { ...problemResponses.default, description: 'No such published item' } } : {}),
      ...problemResponses,
    },
  })
}

const storiesRoute = publicGet('/api/public/stories', 'The published stories, newest first', publicStoryListSchema)
const storyRoute = publicGet('/api/public/stories/{slug}', 'One published story', publicStorySchema, slugParams, true)
const pinRoute = publicGet('/api/public/places/{id}', 'The card of one visible pin', publicPinSchema, pinParams, true)
const toursRoute = publicGet('/api/public/tours', 'The published tour guides', publicTourListSchema)
const tourRoute = publicGet('/api/public/tours/{slug}', 'One published tour guide', publicTourSchema, slugParams, true)
const mapCategoriesRoute = publicGet('/api/public/map-categories', 'Every map category, parents first', publicCategoryListSchema)
const blogCategoriesRoute = publicGet('/api/public/blog-categories', 'Every blog category, parents first', publicCategoryListSchema)
const mapRoute = publicGet('/api/public/map', 'The visible pins of all stores, newest first. Cached 60 s on the server', publicMapSchema)

// Anonymous: no guard sits on /api/public, and a stranger sees only published content. The handlers read no store.
export function registerPublicRoutes(app: OpenAPIHono<AppEnv>, useCases: PublicUseCases): void {
  // `authenticate` appends the Set-Cookie of a session Better Auth renewed. A public answer is the same for everyone
  // and may be cached, so it never carries a cookie: drop it here, for the 200, the 304 and the problems alike.
  app.use('/api/public/*', async (c, next) => {
    await next()
    if (c.req.method === 'GET')
      c.res.headers.delete('Set-Cookie')
  })

  app.openapi(storiesRoute, async c => conditionalJson(c, await useCases.listStories(c.req.valid('query').lang)))

  app.openapi(storyRoute, async (c) => {
    const result = await useCases.getStory(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value) : problem(c, failureProblem(result))
  })

  app.openapi(pinRoute, async (c) => {
    const result = await useCases.getPin(c.req.valid('param').id, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value) : problem(c, failureProblem(result))
  })

  app.openapi(toursRoute, async c => conditionalJson(c, await useCases.listTours(c.req.valid('query').lang)))

  app.openapi(tourRoute, async (c) => {
    const result = await useCases.getTour(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value) : problem(c, failureProblem(result))
  })

  app.openapi(mapCategoriesRoute, async c => conditionalJson(c, await useCases.listCategories('map')))
  app.openapi(blogCategoriesRoute, async c => conditionalJson(c, await useCases.listCategories('blog')))
  app.openapi(mapRoute, async c => conditionalJson(c, await useCases.getMap(c.req.valid('query').lang)))
}
