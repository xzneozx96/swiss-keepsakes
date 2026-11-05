import { readFileSync } from 'node:fs'
import { MAX_OFFSET, MAX_PAGE_LIMIT, numberedPageOf, numberedPageQuery, pageOf, pageQuery, publicCategorySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

describe('[ADR-033] pageQuery', () => {
  it('a route default fills a missing limit, and the query string is coerced', () => {
    const query = pageQuery({ defaultLimit: 10 })

    expect(query.parse({})).toEqual({ limit: 10 })
    expect(query.parse({ limit: '15', cursor: 'abc_-9' })).toEqual({ limit: 15, cursor: 'abc_-9' })
  })

  it('without a default the limit stays absent, so the route can answer the whole list for one release', () => {
    expect(pageQuery().parse({})).toEqual({})
  })

  it.each(['0', '-1', '1.5', 'x', String(MAX_PAGE_LIMIT + 1)])('limit %s is refused, not lowered', (limit) => {
    expect(pageQuery({ defaultLimit: 10 }).safeParse({ limit }).success).toBe(false)
  })

  it('the maximum is 20: 21 is refused', () => {
    expect(MAX_PAGE_LIMIT).toBe(20)
    expect(pageQuery({ defaultLimit: 10 }).safeParse({ limit: '21' }).success).toBe(false)
  })

  it('accepts the maximum limit', () => {
    expect(pageQuery({ defaultLimit: 10 }).parse({ limit: String(MAX_PAGE_LIMIT) }).limit).toBe(MAX_PAGE_LIMIT)
  })

  it('a cursor is URL-safe text of at most 512 characters', () => {
    const query = pageQuery({ defaultLimit: 10 })

    expect(query.safeParse({ cursor: 'a'.repeat(512) }).success).toBe(true)
    expect(query.safeParse({ cursor: 'a'.repeat(513) }).success).toBe(false)
    expect(query.safeParse({ cursor: 'a b' }).success).toBe(false)
    expect(query.safeParse({ cursor: 'a+b/c=' }).success).toBe(false)
  })
})

describe('[ADR-033] pageOf', () => {
  const schema = pageOf(z.object({ id: z.string() }), 'ThingList')

  it('answers items and a nextCursor that is a string or null', () => {
    expect(schema.parse({ items: [{ id: 'a' }], nextCursor: null })).toEqual({ items: [{ id: 'a' }], nextCursor: null })
    expect(schema.parse({ items: [], nextCursor: 'x' }).nextCursor).toBe('x')
    expect(schema.safeParse({ items: [] }).success).toBe(false)
  })

  it('a list that counts adds total, and it is required there', () => {
    const counted = pageOf(z.string(), 'CountedList', { total: z.int().min(0) })

    expect(counted.parse({ items: ['a'], nextCursor: null, total: 1 }).total).toBe(1)
    expect(counted.safeParse({ items: ['a'], nextCursor: null }).success).toBe(false)
  })
})

describe('[ADR-033] numberedPageQuery', () => {
  const query = numberedPageQuery({ q: z.string().optional() })

  it('page 1 and 10 rows by default, coerced from the query string, with the table\'s own filters beside them', () => {
    expect(query.parse({})).toEqual({ page: 1, pageSize: 10 })
    expect(query.parse({ page: '3', pageSize: '20', q: 'x' })).toEqual({ page: 3, pageSize: 20, q: 'x' })
  })

  it.each([{ page: '0' }, { page: '1.5' }, { pageSize: '0' }, { pageSize: '21' }, { pageSize: 'x' }])('%j is refused, not lowered', (input) => {
    expect(query.safeParse(input).success).toBe(false)
  })

  it('a skip of 10,000 rows is allowed and one more is refused on page', () => {
    expect(MAX_OFFSET).toBe(10_000)
    expect(query.safeParse({ page: '1001', pageSize: '10' }).success).toBe(true)
    const refused = query.safeParse({ page: '1002', pageSize: '10' })

    expect(refused.success).toBe(false)
    expect(refused.error?.issues[0]?.path).toEqual(['page'])
    expect(query.safeParse({ page: '501', pageSize: '20' }).success).toBe(true)
    expect(query.safeParse({ page: '502', pageSize: '20' }).success).toBe(false)
  })
})

describe('[ADR-033] numberedPageOf', () => {
  const schema = numberedPageOf(z.string(), 'ThingPage', { counts: z.object({ all: z.int() }) })

  it('answers items, total, page, pageSize and the facet counts, all required', () => {
    const body = { items: ['a'], total: 1, page: 1, pageSize: 10, counts: { all: 1 } }

    expect(schema.parse(body)).toEqual(body)
    expect(schema.safeParse({ ...body, total: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...body, counts: undefined }).success).toBe(false)
  })
})

describe('[ADR-033] a public category carries storyCount', () => {
  const category = { id: '0190a000-0000-7000-8000-000000000001', slug: 'legends', name: { en: 'Legends', de: null }, parentId: null, icon: null, showOnHome: false, position: 1 }

  it('is a count of stories, never negative or fractional', () => {
    expect(publicCategorySchema.parse({ ...category, storyCount: 4 }).storyCount).toBe(4)
    expect(publicCategorySchema.safeParse({ ...category, storyCount: -1 }).success).toBe(false)
    expect(publicCategorySchema.safeParse({ ...category, storyCount: 1.5 }).success).toBe(false)
    expect(publicCategorySchema.safeParse(category).success).toBe(false)
  })
})

// The check of docs/development-rules/shared/lists-and-search.md: a list route pages (cursor or numbered) or is named here with a reason.
interface WholeList { reason: string, expectedSize: string }

/** Lists that stay whole by decision (ADR-033, per-route table). */
const WHOLE_LISTS: Record<string, WholeList> = {
  'GET /api/public/blog-categories': { reason: 'The chips need every category; each carries storyCount (cap 200)', expectedSize: 'tens' },
  'GET /api/public/map-categories': { reason: 'The map and the home need every category (cap 200)', expectedSize: 'tens' },
  'GET /api/public/map': { reason: 'The map needs every pin in view; never cut, warning from 800 pins (ADR-006)', expectedSize: 'hundreds' },
  'GET /api/public/keepsakes/{slug}/pickup-points': { reason: 'The active pickup points of one keepsake (cap 50)', expectedSize: 'under 20' },
  'GET /api/public/keepsakes/{slug}/availability': { reason: 'The variants of one keepsake, all shown on its page (not in the ADR table: judged whole)', expectedSize: 'tens' },
  'GET /api/store/{storeId}/categories/{kind}': { reason: 'A drag-ordered list must be whole (cap 200)', expectedSize: 'tens' },
  'GET /api/store/{storeId}/pickup-places': { reason: 'A drag-ordered list must be whole (cap 50)', expectedSize: 'under 20' },
  'GET /api/store/{storeId}/story-groups/lookup': { reason: 'The stories the editor already references, read by id (at most 50 ids)', expectedSize: 'under 50' },
  'GET /api/store/{storeId}/pins/lookup': { reason: 'The pins the editor already references, read by id or by link host (at most 50 ids, 50 rows)', expectedSize: 'under 50' },
  'GET /api/store/{storeId}/products/lookup': { reason: 'The keepsakes a story already references, read by id (at most 50 ids)', expectedSize: 'under 50' },
  'GET /api/store/{storeId}/products/option-names': { reason: 'The option names the shop already uses, for the name field\'s suggestions (cap 50)', expectedSize: 'tens' },
  'GET /api/store/{storeId}/pins/story-options': { reason: 'Search-as-you-type: q and the first 20 matches, no paging', expectedSize: '20' },
}

/** Lists the ADR makes paged in a later slice. An entry leaves this map when its slice lands (the test below fails when a paged route is still listed). */
const PENDING_SLICES: Record<string, { slice: number, expectedSize: string }> = {}

type Json = Record<string, unknown>
type ListKind = 'cursor' | 'numbered' | 'unpaged'

/** The `METHOD path` of every GET route whose 200 JSON body has an `items` array, with how it pages. */
function listRoutes(spec: Json): Map<string, ListKind> {
  const resolve = (node: unknown): Json | undefined => {
    let current = node as Json | undefined
    while (current && typeof current.$ref === 'string')
      current = (current.$ref as string).split('/').slice(1).reduce<unknown>((at, key) => (at as Json | undefined)?.[key], spec) as Json | undefined
    return current
  }
  const routes = new Map<string, ListKind>()
  for (const [path, methods] of Object.entries(spec.paths as Record<string, Json>)) {
    const get = methods.get as Json | undefined
    const body = resolve(((((get?.responses as Json | undefined)?.['200'] as Json | undefined)?.content as Json | undefined)?.['application/json'] as Json | undefined)?.schema)
    const props = body?.properties as Json | undefined
    const items = resolve(props?.items)
    if (!props || items?.type !== 'array')
      continue
    routes.set(`GET ${path}`, 'nextCursor' in props ? 'cursor' : 'page' in props && 'total' in props ? 'numbered' : 'unpaged')
  }

  return routes
}

const spec = JSON.parse(readFileSync(new URL('../../../packages/api-contract/generated/openapi.json', import.meta.url), 'utf8')) as Json

describe('[ADR-033] every list route pages or is named as a whole list', () => {
  const routes = listRoutes(spec)

  it('finds the list routes', () => {
    expect(routes.get('GET /api/public/stories')).toBe('cursor')
    expect(routes.get('GET /api/public/keepsakes')).toBe('cursor')
    expect(routes.get('GET /api/public/tours')).toBe('cursor')
    expect(routes.get('GET /api/public/search')).toBe('cursor')
    expect(routes.get('GET /api/store/{storeId}/media')).toBe('numbered')
    expect(routes.get('GET /api/store/{storeId}/story-groups')).toBe('numbered')
    expect(routes.get('GET /api/store/{storeId}/pins')).toBe('numbered')
    expect(routes.get('GET /api/store/{storeId}/products')).toBe('numbered')
    expect(routes.get('GET /api/store/{storeId}/inventory')).toBe('numbered')
  })

  it('a list that neither pages nor is in WHOLE_LISTS or PENDING_SLICES fails', () => {
    const unnamed = [...routes].filter(([route, kind]) => kind === 'unpaged' && !(route in WHOLE_LISTS) && !(route in PENDING_SLICES)).map(([route]) => route)

    expect(unnamed).toEqual([])
  })

  it('a named list still exists and is still unpaged, so the maps shrink as the slices land', () => {
    const stale = [...Object.keys(WHOLE_LISTS), ...Object.keys(PENDING_SLICES)].filter(route => routes.get(route) !== 'unpaged')

    expect(stale).toEqual([])
  })

  it('names a reason and a size for every whole list', () => {
    for (const entry of Object.values(WHOLE_LISTS))
      expect(entry.reason.length > 0 && entry.expectedSize.length > 0).toBe(true)
  })

  it('the walk bites: a fake route without paging is reported', () => {
    const fake = { paths: { '/api/fake': { get: { responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Fake' } } } } } } } }, components: { schemas: { Fake: { type: 'object', properties: { items: { type: 'array' } } } } } }

    expect(listRoutes(fake)).toEqual(new Map([['GET /api/fake', 'unpaged']]))
  })
})
