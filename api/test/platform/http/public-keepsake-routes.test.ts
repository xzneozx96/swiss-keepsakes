import type { PublicKeepsakeUseCases } from '../../../src/modules/catalog/adapters/public-routes.ts'
import type { PublicKeepsakeCard } from '../../../src/modules/catalog/application/public-keepsakes.ts'
import { describe, expect, it } from 'vitest'
import { registerPublicKeepsakeRoutes } from '../../../src/modules/catalog/adapters/public-routes.ts'
import { createGuardedApp, guardedCommands, signedInAs } from '../../support/guarded-app.ts'

const id = '0190f0c2-0000-7000-8000-0000000000e1'
const variantId = '0190f0c2-0000-7000-8000-0000000000c1'

const card: PublicKeepsakeCard = { id, slug: 'swiss-knife', name: 'Swiss knife', cover: null, soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

const useCases: PublicKeepsakeUseCases = {
  listKeepsakes: async () => ({ items: [card] }),
  getKeepsake: async slug => (slug === 'swiss-knife'
    ? { ok: true, value: { ...card, description: { type: 'doc', content: [] }, photos: [], options: [], variants: [], otherSlug: null } }
    : { ok: false, reason: 'not-found' }),
  getAvailability: async slug => (slug === 'swiss-knife'
    ? { ok: true, value: { items: [{ variantId, priceRappen: 3900, currency: 'CHF', available: 4 }] } }
    : { ok: false, reason: 'not-found' }),
}

function setup() {
  return createGuardedApp({}, undefined, { ...guardedCommands, routes: [routes => registerPublicKeepsakeRoutes(routes, useCases)] })
}

const paths = ['/api/public/keepsakes', '/api/public/keepsakes/swiss-knife', '/api/public/keepsakes/swiss-knife/availability']

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

    for (const path of ['/api/public/keepsakes/draft-one', '/api/public/keepsakes/draft-one/availability']) {
      const response = await app.request(`${path}?lang=en`)
      expect(response.status, path).toBe(404)
      expect(response.headers.get('Content-Type')).toBe('application/problem+json')
      expect(response.headers.get('Cache-Control')).toBeNull()
      expect((await response.json() as { type: string }).type).toBe('not-found')
    }
  })

  it('[E6.4] the list and the detail carry Cache-Control max-age=30, the availability max-age=5, each a strong ETag, and a repeat with it is a 304', async () => {
    const { app } = setup()

    for (const [path, cache] of [[paths[0]!, 'max-age=30'], [paths[1]!, 'max-age=30'], [paths[2]!, 'max-age=5']] as const) {
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
