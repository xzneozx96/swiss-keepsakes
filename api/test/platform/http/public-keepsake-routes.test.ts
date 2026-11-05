import type { PublicKeepsakeUseCases } from '../../../src/modules/catalog/adapters/public-routes.ts'
import type { PublicKeepsakeCard } from '../../../src/modules/catalog/application/public-keepsakes.ts'
import { describe, expect, it } from 'vitest'
import { contractApp, openApiDocument } from '../../../scripts/contract.ts'
import { registerPublicKeepsakeRoutes } from '../../../src/modules/catalog/adapters/public-routes.ts'
import { encodeCursor } from '../../../src/platform/http/cursor.ts'
import { createGuardedApp, guardedCommands, signedInAs } from '../../support/guarded-app.ts'

const id = '0190f0c2-0000-7000-8000-0000000000e1'
const variantId = '0190f0c2-0000-7000-8000-0000000000c1'

const card: PublicKeepsakeCard = { id, slug: 'swiss-knife', name: 'Swiss knife', cover: null, soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

const lastKey = ['2026-11-05T10:00:00.123456Z', id] as const
const asked: unknown[] = []

const useCases: PublicKeepsakeUseCases = {
  listKeepsakes: async (query) => {
    asked.push(query)
    return { items: [card], total: 42, next: query.limit === undefined ? null : lastKey }
  },
  getKeepsake: async slug => (slug === 'swiss-knife'
    ? { ok: true, value: { ...card, description: { type: 'doc', content: [] }, photos: [], options: [], variants: [], otherSlug: null } }
    : { ok: false, reason: 'not-found' }),
  getPickupPoints: async (slug, language) => (slug === 'swiss-knife'
    ? { ok: true, value: { items: [{ id: variantId, name: language === 'de' ? 'Laden' : 'Shop', address: 'Street 1', instructions: null, mapsUrl: 'https://maps.example/a', hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] }] } }
    : { ok: false, reason: 'not-found' }),
  getAvailability: async slug => (slug === 'swiss-knife'
    ? { ok: true, value: { items: [{ variantId, priceRappen: 3900, currency: 'CHF', available: 4 }] } }
    : { ok: false, reason: 'not-found' }),
}

function setup() {
  return createGuardedApp({}, undefined, { ...guardedCommands, routes: [routes => registerPublicKeepsakeRoutes(routes, useCases)] })
}

const paths = ['/api/public/keepsakes', '/api/public/keepsakes/swiss-knife', '/api/public/keepsakes/swiss-knife/availability', '/api/public/keepsakes/swiss-knife/pickup-points']

describe('[E6.4][AC31][AC64] the public keepsake routes: input checks, 404 and the ETag', () => {
  it('[E6.4][AC64] lang=fr and a missing lang are 400 problems, not 500', async () => {
    const { app } = setup()

    for (const path of paths) {
      const wrong = await app.request(`${path}?lang=fr`)
      const missing = await app.request(path)
      expect([wrong.status, missing.status], path).toEqual([400, 400])
      expect(wrong.headers.get('Content-Type')).toBe('application/problem+json')
    }
  })

  it('[E6.4][AC31] AC-4: a slug that is not published, or is archived, is a 404 problem with no cache header, on the detail and on the availability', async () => {
    const { app } = setup()

    for (const path of ['/api/public/keepsakes/draft-one', '/api/public/keepsakes/draft-one/availability', '/api/public/keepsakes/draft-one/pickup-points']) {
      const response = await app.request(`${path}?lang=en`)
      expect(response.status, path).toBe(404)
      expect(response.headers.get('Content-Type')).toBe('application/problem+json')
      expect(response.headers.get('Cache-Control')).toBeNull()
      expect((await response.json() as { type: string }).type).toBe('not-found')
    }
  })

  it('[E6.4] the list and the detail carry Cache-Control max-age=30, the availability max-age=5, each a strong ETag, and a repeat with it is a 304', async () => {
    const { app } = setup()

    for (const [path, cache] of [[paths[0]!, 'max-age=30'], [paths[1]!, 'max-age=30'], [paths[2]!, 'max-age=5'], [paths[3]!, 'max-age=30']] as const) {
      const first = await app.request(`${path}?lang=en`)
      const tag = first.headers.get('ETag')!
      expect(first.status, path).toBe(200)
      expect(first.headers.get('Cache-Control'), path).toBe(cache)
      expect(tag, path).toMatch(/^"[0-9a-f]{64}"$/)
      expect(first.headers.getSetCookie()).toEqual([])

      const again = await app.request(`${path}?lang=en`, { headers: { 'If-None-Match': tag } })
      expect(again.status, path).toBe(304)
      expect(await again.text()).toBe('')
      expect(again.headers.get('Cache-Control')).toBe(cache)

      expect((await app.request(`${path}?lang=en`, { headers: { 'If-None-Match': '"stale"' } })).status).toBe(200)
    }
  })

  it('[E6.4][AC54] AC-1: the list and the detail bodies carry no price field, and the availability does', async () => {
    const { app } = setup()
    const [list, detail, availability] = await Promise.all(paths.map(async path => (await app.request(`${path}?lang=en`)).text()))

    expect(list).not.toMatch(/price|amount|currency|rappen/i)
    expect(detail).not.toMatch(/price|amount|currency|rappen|engrav/i)
    expect(JSON.parse(availability!)).toEqual({ items: [{ variantId, priceRappen: 3900, currency: 'CHF', available: 4 }] })
  })

  it('[E6.4] the routes are anonymous: a signed-in request reads no session and gets no cookie', async () => {
    const { app, calls } = setup()
    const before = calls.readSession

    for (const path of paths) {
      const response = await app.request(`${path}?lang=en`, { headers: signedInAs('someone') })
      expect(response.status, path).toBe(200)
      expect(response.headers.getSetCookie()).toEqual([])
    }
    expect(calls.readSession).toBe(before)
  })
})

describe('[E6.4][AC26] the public pickup points route', () => {
  it('[E6.4][AC26] AC-1: answers the points of the use case in the language asked, with the text cache header', async () => {
    const { app } = setup()

    const response = await app.request('/api/public/keepsakes/swiss-knife/pickup-points?lang=de')

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('max-age=30')
    expect(await response.json()).toEqual({ items: [{ id: variantId, name: 'Laden', address: 'Street 1', instructions: null, mapsUrl: 'https://maps.example/a', hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] }] })
  })
})

describe('[ADR-033] the public keepsake list pages with an opaque cursor', () => {
  it('without limit the use case gets no limit, so the whole list comes for one release', async () => {
    asked.length = 0
    const { app } = setup()

    const response = await app.request('/api/public/keepsakes?lang=en')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ total: 42, nextCursor: null })
    expect(asked).toEqual([{ language: 'en', category: undefined, limit: undefined, after: undefined }])
  })

  it('passes limit and category on, and answers a nextCursor that holds the key but is not it', async () => {
    asked.length = 0
    const { app } = setup()

    const body = await (await app.request('/api/public/keepsakes?lang=de&limit=10&category=knives')).json() as { nextCursor: string, total: number }

    expect(asked).toEqual([{ language: 'de', category: 'knives', limit: 10, after: undefined }])
    expect(body.total).toBe(42)
    expect(body.nextCursor).toMatch(/^[\w-]+$/)
    expect(body.nextCursor).not.toContain(id)
  })

  it('the cursor of one page starts the next, and the use case gets the decoded key', async () => {
    asked.length = 0
    const { app } = setup()
    const first = await (await app.request('/api/public/keepsakes?lang=en&limit=10&category=knives')).json() as { nextCursor: string }

    const second = await app.request(`/api/public/keepsakes?lang=en&limit=10&category=knives&cursor=${first.nextCursor}`)

    expect(second.status).toBe(200)
    expect(asked[1]).toEqual({ language: 'en', category: 'knives', limit: 10, after: [...lastKey] })
  })

  it('limit 21 and limit 0 are 400, not lowered', async () => {
    const { app } = setup()

    for (const limit of ['21', '0'])
      expect((await app.request(`/api/public/keepsakes?lang=en&limit=${limit}`)).status).toBe(400)
  })

  it('a cursor that is garbage, another list\'s, or made for another filter or language is 400 validation-failed on cursor', async () => {
    asked.length = 0
    const { app } = setup()
    const first = await (await app.request('/api/public/keepsakes?lang=en&limit=10&category=knives')).json() as { nextCursor: string }
    const wrongType = encodeCursor(['not a date', id], { route: 'public-keepsakes', lang: 'en', category: null })
    const storyCursor = encodeCursor(lastKey, { route: 'public-stories', lang: 'en', category: null })

    for (const url of [
      '/api/public/keepsakes?lang=en&limit=10&cursor=garbage',
      `/api/public/keepsakes?lang=en&limit=10&cursor=${first.nextCursor}`,
      `/api/public/keepsakes?lang=de&limit=10&category=knives&cursor=${first.nextCursor}`,
      `/api/public/keepsakes?lang=en&limit=10&cursor=${wrongType}`,
      `/api/public/keepsakes?lang=en&limit=10&cursor=${storyCursor}`,
    ]) {
      const response = await app.request(url)

      expect(response.status, url).toBe(400)
      expect(await response.json(), url).toMatchObject({ type: 'validation-failed', errors: [{ in: 'query', path: 'cursor' }] })
    }
    expect(asked).toHaveLength(1)
  })

  it('the contract names limit, cursor and category, and keeps limit optional while the route moves to paging', () => {
    const parameters = (openApiDocument(contractApp()).paths as Record<string, { get: { parameters: { name: string, required?: boolean }[] } }>)['/api/public/keepsakes']!.get.parameters

    expect(parameters.map(p => p.name).sort()).toEqual(['category', 'cursor', 'lang', 'limit'])
    expect(parameters.find(p => p.name === 'limit')?.required).toBeFalsy()
  })
})
