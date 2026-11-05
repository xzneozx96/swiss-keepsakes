import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PublicCategoryList as ContractCategoryList, PublicMap as ContractMap, PublicPin as ContractPin, PublicSearchList as ContractSearchList, PublicStory as ContractStory, PublicStoryList as ContractStoryList, PublicTour as ContractTour, PublicTourList as ContractTourList } from '@sk/api-contract'
import type { ContentLanguage } from '@sk/domain/content'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PublicCategoryList, PublicMap, PublicPin, PublicStory, PublicStoryPage, PublicTour, PublicTourPage } from '../application/public-view.ts'
import type { ListStoriesQuery } from '../application/read-stories.ts'
import type { ListToursQuery } from '../application/read-tours.ts'
import type { PublicSearchPage, SearchPublicQuery } from '../application/search-public.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { MAX_SEARCH_QUERY_LENGTH, pageQuery, publicCategoryListSchema, publicLanguageSchema, publicMapSchema, publicPinSchema, publicSearchListSchema, publicStoryListSchema, publicStorySchema, publicTourListSchema, publicTourSchema, searchKindSchema } from '@sk/api-contract'
import { interestCodes } from '@sk/domain/content'
import { conditionalJson } from '../../../platform/http/conditional-json.ts'
import { cursorProblem, decodeCursor, encodeCursor } from '../../../platform/http/cursor.ts'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { json } from './route-parts.ts'
import { limitWholeList } from '../../../platform/http/whole-list-limits.ts'

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
  searchPublic: (query: SearchPublicQuery) => Promise<PublicSearchPage>
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
  Assert<Same<Omit<PublicSearchPage, 'next'>, Omit<ContractSearchList, 'nextCursor'>>>,
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
// The search pages with a cursor, ranked best first (ADR-033 slice 6). It needs `q` or `interest`: a search never lists everything.
const searchQuery = query.extend({
  ...pageQuery({ defaultLimit: 10 }).shape,
  q: z.string().trim().min(1).max(MAX_SEARCH_QUERY_LENGTH).optional().meta({ description: `The typed text, 1 to ${MAX_SEARCH_QUERY_LENGTH} characters. Accents and Swiss spellings are folded (Loewendenkmal finds Löwendenkmal), and a typo or a part of a word still matches` }),
  interest: z.enum(interestCodes).optional().meta({ description: 'An interest tile the guest tapped on the search screen. Without `q`, the hits come in creation order, newest id first (a `uuidv7`). It is never the saved onboarding answers (ADR-006): the app sends it only for a tapped tile' }),
  kind: searchKindSchema.optional().meta({ description: 'Only this kind of hit. The counts still cover every kind' }),
}).refine(value => value.q !== undefined || value.interest !== undefined, { message: 'Send `q` or `interest`', path: ['q'] })
const searchRoute = createRoute({
  method: 'get',
  path: '/api/public/search',
  request: { query: searchQuery },
  responses: {
    200: { description: 'A page of published titles that match, best first, each as the card its own list shows', headers: cacheHeaders, content: json(publicSearchListSchema) },
    304: notModified,
    ...problemResponses,
  },
})
// The key of a search cursor: the rank as text, the id, the kind.
const searchKey = z.tuple([z.string().regex(/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i), z.uuid(), searchKindSchema])
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

  app.openapi(searchRoute, async (c) => {
    const { lang, limit, cursor, q, interest, kind } = c.req.valid('query')
    // The cursor belongs to this route, language, text, interest and kind.
    const scope = { route: 'public-search', lang, q: q ?? null, interest: interest ?? null, kind: kind ?? null }
    const decoded = cursor === undefined ? undefined : decodeCursor(cursor, scope, searchKey)
    if (decoded && !decoded.ok)
      return cursorProblem(c)
    const found = await useCases.searchPublic({ language: lang, q: q ?? null, interest: interest ?? null, kind, limit, after: decoded?.key })
    return conditionalJson(c, { items: found.items, total: found.total, counts: found.counts, nextCursor: found.next ? encodeCursor(found.next, scope) : null }, publicCacheControl)
  })

  app.openapi(mapCategoriesRoute, async c => conditionalJson(c, limitWholeList(c, 'GET /api/public/map-categories', await useCases.listCategories('map')), publicCacheControl))
  app.openapi(blogCategoriesRoute, async c => conditionalJson(c, limitWholeList(c, 'GET /api/public/blog-categories', await useCases.listCategories('blog')), publicCacheControl))
  app.openapi(mapRoute, async c => conditionalJson(c, limitWholeList(c, 'GET /api/public/map', await useCases.getMap(c.req.valid('query').lang)), publicCacheControl))
}
