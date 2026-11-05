import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import type { WholeListRoute } from '../../../src/platform/http/whole-list-limits.ts'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { WHOLE_LIST_LIMITS, limitWholeList } from '../../../src/platform/http/whole-list-limits.ts'
import { createLogger } from '../../../src/platform/logger.ts'
import { createFakeContentUseCases } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands } from '../../support/guarded-app.ts'

interface Line { level: number, event?: string, route?: string, storeId?: string, count?: number }

function capture() {
  const lines: Line[] = []
  return { logger: createLogger('info', { write: line => lines.push(JSON.parse(line) as Line) }), lines }
}

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ n: index }))

// The helper on its own: a route name, a store id in the path, and `count` rows.
async function answer(route: WholeListRoute, count: number) {
  const { logger, lines } = capture()
  const app = new Hono<any>()
  app.use(async (c, next) => {
    c.set('logger', logger)
    await next()
  })
  app.get('/store/:storeId/list', c => c.json(limitWholeList(c, route, { items: rows(count) })))
  const body = await (await app.request('/store/lucerne/list')).json() as { items: unknown[] }
  return { body, lines }
}

describe('[ADR-033] limitWholeList', () => {
  it.each(Object.entries(WHOLE_LIST_LIMITS).filter(([, limit]) => limit.warnAt !== null))('%s warns from its threshold and not below', async (route, limit) => {
    const below = await answer(route as WholeListRoute, limit.warnAt! - 1)
    const at = await answer(route as WholeListRoute, limit.warnAt!)

    expect(below.lines).toEqual([])
    expect(at.lines).toMatchObject([{ level: 40, event: 'list.near-cap', route, storeId: 'lucerne', count: limit.warnAt }])
  })

  it.each(Object.entries(WHOLE_LIST_LIMITS).filter(([, limit]) => limit.cap !== null))('%s answers the first rows and logs an error above its cap, and is whole at the cap', async (route, limit) => {
    const full = await answer(route as WholeListRoute, limit.cap!)
    const over = await answer(route as WholeListRoute, limit.cap! + 1)

    expect(full.body.items).toHaveLength(limit.cap!)
    expect(full.lines.map(line => line.event)).toEqual(['list.near-cap'])
    expect(over.body.items).toEqual(rows(limit.cap!))
    expect(over.lines).toMatchObject([{ level: 50, event: 'list.over-cap', route, storeId: 'lucerne', count: limit.cap! + 1 }])
  })

  it('a body with two arrays is counted together and cut in key order', async () => {
    const { logger, lines } = capture()
    const app = new Hono<any>()
    app.use(async (c, next) => {
      c.set('logger', logger)
      await next()
    })
    app.get('/store/:storeId/uses', c => c.json(limitWholeList(c, 'GET /api/store/{storeId}/media/{mediaId}/uses', { published: rows(150), drafts: rows(60) })))
    const body = await (await app.request('/store/lucerne/uses')).json() as { published: unknown[], drafts: unknown[] }

    expect([body.published.length, body.drafts.length]).toEqual([150, 50])
    expect(lines).toMatchObject([{ level: 50, event: 'list.over-cap', count: 210 }])
  })

  it('a list with no cap is never cut, and one with no threshold is never logged', async () => {
    const availability = await answer('GET /api/public/keepsakes/{slug}/availability', 500)
    const options = await answer('GET /api/store/{storeId}/pins/story-options', 500)

    expect(availability.body.items).toHaveLength(500)
    expect(options.body.items).toHaveLength(500)
    expect(options.lines).toEqual([])
  })

  it('the warning starts at 80 % of every cap', () => {
    for (const [route, limit] of Object.entries(WHOLE_LIST_LIMITS)) {
      if (limit.cap !== null)
        expect(limit.warnAt, route).toBe(limit.cap * 0.8)
    }
  })
})

function setup(overrides: Partial<ContentUseCases>) {
  const { logger, lines } = capture()
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  const { app } = createGuardedApp({}, logger, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  return { app, lines }
}

describe('[ADR-033] the public lists through their routes', () => {
  const pins = (count: number) => ({ items: Array.from({ length: count }, (_, index) => ({ id: String(index) })) }) as never

  it('the map never cuts a pin: 2,000 pins are all answered, and the warning is logged', async () => {
    const { app, lines } = setup({ getMap: async () => pins(2000) })

    const response = await app.request('/api/public/map?lang=en')

    expect(response.status).toBe(200)
    expect((await response.json() as { items: unknown[] }).items).toHaveLength(2000)
    expect(lines.filter(line => line.event?.startsWith('list.'))).toMatchObject([{ level: 40, event: 'list.near-cap', route: 'GET /api/public/map', count: 2000 }])
  })

  it('the map is quiet at 799 pins and warns at 800', async () => {
    const quiet = setup({ getMap: async () => pins(799) })
    const loud = setup({ getMap: async () => pins(800) })

    await quiet.app.request('/api/public/map?lang=en')
    await loud.app.request('/api/public/map?lang=en')

    expect(quiet.lines.filter(line => line.event?.startsWith('list.'))).toEqual([])
    expect(loud.lines.filter(line => line.event?.startsWith('list.'))).toMatchObject([{ event: 'list.near-cap', count: 800 }])
  })

  it('the category lists are cut at 200 and log an error', async () => {
    const { app, lines } = setup({ listCategories: async () => pins(201) })

    const response = await app.request('/api/public/blog-categories?lang=en')

    expect((await response.json() as { items: unknown[] }).items).toHaveLength(200)
    expect(lines.filter(line => line.event?.startsWith('list.'))).toMatchObject([{ level: 50, event: 'list.over-cap', route: 'GET /api/public/blog-categories', count: 201 }])
  })
})
