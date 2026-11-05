import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PublicCategoryList as ContractCategoryList, PublicMap as ContractMap, PublicPin as ContractPin, PublicStory as ContractStory, PublicStoryList as ContractStoryList, PublicTour as ContractTour, PublicTourList as ContractTourList } from '@sk/api-contract'
import type { ContentLanguage } from '@sk/domain/content'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PublicCategoryList, PublicMap, PublicPin, PublicStory, PublicStoryPage, PublicTour, PublicTourPage } from '../application/public-view.ts'
import type { ListToursQuery } from '../application/read-tours.ts'
import type { ListStoriesQuery } from '../application/read-stories.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { pageQuery, publicCategoryListSchema, publicLanguageSchema, publicMapSchema, publicPinSchema, publicStoryListSchema, publicStorySchema, publicTourListSchema, publicTourSchema } from '@sk/api-contract'
import { conditionalJson } from '../../../platform/http/conditional-json.ts'
import { cursorProblem, decodeCursor, encodeCursor } from '../../../platform/http/cursor.ts'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { json } from './route-parts.ts'

// Cached by the browser for 30 s, then revalidated with the ETag (ADR-006).
const publicCacheControl = 'max-age=30'

// What the public routes call. They take no actor and no store: the content is public and one list covers all stores.
export interface PublicUseCases {
  listStories: (query: ListStoriesQuery) => Promise<PublicStoryPage>
  getStory: (slug: string, language: ContentLanguage) => Promise<Result<PublicStory>>
  getPin: (id: string, language: ContentLanguage) => Promise<Result<PublicPin>>
  listTours: (query: ListToursQuery) => Promise<PublicTourPage>
  getTour: (slug: string, language: ContentLanguage) => Promise<Result<PublicTour>>
  listCategories: (kind: 'map' | 'blog') => Promise<PublicCategoryList>
  getMap: (language: ContentLanguage) => Promise<PublicMap>
}

// The application types and the contract types must stay the same shape: a field added on one side (a price, say)
// fails the build here until the other side and the contract change on purpose.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<_T extends true> = never
export type PublicTypesMatchContract = [
  Assert<Same<Omit<PublicStoryPage, 'next'>, Omit<ContractStoryList, 'nextCursor'>>>,
  Assert<Same<PublicStory, ContractStory>>,
  Assert<Same<PublicPin, ContractPin>>,
  Assert<Same<PublicMap, ContractMap>>,
  Assert<Same<Omit<PublicTourPage, 'next'>, Omit<ContractTourList, 'nextCursor'>>>,
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

// The stories list pages with a cursor (ADR-033). While the route moves to paging, a request without `limit` still gets the whole list.
const storiesQuery = query.extend({
  ...pageQuery().shape,
  category: z.string().min(1).max(120).optional().meta({ description: 'A blog category slug. A parent includes its direct sub-categories. An unknown slug gives an empty list' }),
})
const storiesRoute = createRoute({
  method: 'get',
  path: '/api/public/stories',
  request: { query: storiesQuery },
  responses: {
    200: { description: 'A page of the published stories, newest first by the date of the version shown', headers: cacheHeaders, content: json(publicStoryListSchema) },
    304: notModified,
    ...problemResponses,
  },
})
// The key of a story cursor: the date of the version carried at microsecond precision (UTC), then the group id.
const storyKey = z.tuple([z.iso.datetime({ precision: 6 }), z.uuid()])
const storyRoute = publicGet('/api/public/stories/{slug}', 'One published story', publicStorySchema, slugParams, true)
const pinRoute = publicGet('/api/public/places/{id}', 'The card of one visible pin', publicPinSchema, pinParams, true)
// The tours list pages with a cursor too (ADR-033). Same transition rule as the stories: no `limit` still gets the whole list.
const toursRoute = createRoute({
  method: 'get',
  path: '/api/public/tours',
  request: { query: query.extend(pageQuery().shape) },
  responses: {
    200: { description: 'A page of the published tour guides, newest first', headers: cacheHeaders, content: json(publicTourListSchema) },
    304: notModified,
    ...problemResponses,
  },
})
// The key of a tour cursor: the tour id.
const tourKey = z.tuple([z.uuid()])
const tourRoute = publicGet('/api/public/tours/{slug}', 'One published tour guide', publicTourSchema, slugParams, true)
const mapCategoriesRoute = publicGet('/api/public/map-categories', 'Every map category, parents first', publicCategoryListSchema)
const blogCategoriesRoute = publicGet('/api/public/blog-categories', 'Every blog category, parents first', publicCategoryListSchema)
const mapRoute = publicGet('/api/public/map', 'The visible pins of all stores, newest first. Cached 60 s on the server', publicMapSchema)

// Anonymous: no guard sits on /api/public, and a stranger sees only published content. The handlers read no store.
export function registerPublicRoutes(app: OpenAPIHono<AppEnv>, useCases: PublicUseCases): void {
  app.openapi(storiesRoute, async (c) => {
    const { lang, limit, cursor, category } = c.req.valid('query')
    // The cursor belongs to this route, language and filter, and to nothing else.
    const scope = { route: 'public-stories', lang, category: category ?? null }
    const decoded = cursor === undefined ? undefined : decodeCursor(cursor, scope, storyKey)
    if (decoded && !decoded.ok)
      return cursorProblem(c)
    const found = await useCases.listStories({ language: lang, category, limit, after: decoded?.key })
    return conditionalJson(c, { items: found.items, total: found.total, nextCursor: found.next ? encodeCursor(found.next, scope) : null }, publicCacheControl)
  })

  app.openapi(storyRoute, async (c) => {
    const result = await useCases.getStory(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, publicCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(pinRoute, async (c) => {
    const result = await useCases.getPin(c.req.valid('param').id, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, publicCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(toursRoute, async (c) => {
    const { lang, limit, cursor } = c.req.valid('query')
    const scope = { route: 'public-tours', lang }
    const decoded = cursor === undefined ? undefined : decodeCursor(cursor, scope, tourKey)
    if (decoded && !decoded.ok)
      return cursorProblem(c)
    const found = await useCases.listTours({ language: lang, limit, after: decoded?.key })
    return conditionalJson(c, { items: found.items, total: found.total, nextCursor: found.next ? encodeCursor(found.next, scope) : null }, publicCacheControl)
  })

  app.openapi(tourRoute, async (c) => {
    const result = await useCases.getTour(c.req.valid('param').slug, c.req.valid('query').lang)
    return result.ok ? conditionalJson(c, result.value, publicCacheControl) : problem(c, failureProblem(result))
  })

  app.openapi(mapCategoriesRoute, async c => conditionalJson(c, await useCases.listCategories('map'), publicCacheControl))
  app.openapi(blogCategoriesRoute, async c => conditionalJson(c, await useCases.listCategories('blog'), publicCacheControl))
  app.openapi(mapRoute, async c => conditionalJson(c, await useCases.getMap(c.req.valid('query').lang), publicCacheControl))
}
