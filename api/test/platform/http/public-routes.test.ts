import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { contractApp, openApiDocument } from '../../../scripts/contract.ts'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, signedInAs } from '../../support/guarded-app.ts'

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  return createGuardedApp({}, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] }).app
}

const pinId = '0190f0c2-0000-7000-8000-0000000000a1'
const listPaths = ['/api/public/stories', '/api/public/tours', '/api/public/map-categories', '/api/public/blog-categories', '/api/public/map']
const detailPaths = [`/api/public/stories/old-town`, `/api/public/tours/old-town`, `/api/public/places/${pinId}`]

describe('[E2.12] the public routes: input checks and the ETag', () => {
  it('[E2.12] lang=fr, a missing lang and a malformed place id are 400 problems, not 500', async () => {
    const app = setup()

    for (const path of [...listPaths, ...detailPaths]) {
      const wrong = await app.request(`${path}?lang=fr`)
      const missing = await app.request(path)
      expect(wrong.status, path).toBe(400)
      expect(missing.status, path).toBe(400)
      expect(wrong.headers.get('Content-Type')).toBe('application/problem+json')
    }
    const badId = await app.request('/api/public/places/not-a-uuid?lang=en')
    expect(badId.status).toBe(400)
    expect((await badId.json() as { type: string }).type).toBe('validation-failed')
  })

  it('[E2.12] a 200 carries Cache-Control exactly max-age=30 and a strong quoted ETag, and a repeat with it is 304 with no body', async () => {
    const app = setup()

    for (const path of listPaths) {
      const first = await app.request(`${path}?lang=en`)
      const tag = first.headers.get('ETag')!
      expect(first.status, path).toBe(200)
      expect(first.headers.get('Cache-Control'), path).toBe('max-age=30')
      expect(tag, path).toMatch(/^"[0-9a-f]{64}"$/)
      expect(first.headers.get('Set-Cookie')).toBeNull()

      const again = await app.request(`${path}?lang=en`, { headers: { 'If-None-Match': tag } })
      expect(again.status, path).toBe(304)
      expect(await again.text()).toBe('')
      expect(again.headers.get('ETag')).toBe(tag)
      expect(again.headers.get('Cache-Control')).toBe('max-age=30')

      const other = await app.request(`${path}?lang=en`, { headers: { 'If-None-Match': '"stale"' } })
      expect(other.status).toBe(200)
    }
  })

  it('[E2.12] a detail 200 is conditional too, and an unknown item is a 404 problem', async () => {
    const app = setup({ getStory: async () => ({ ok: true, value: { id: pinId, slug: 'old-town', title: 'Old town', excerpt: '', readMinutes: 1, coverKey: null, stayTag: 'both', interests: [], categories: [], publishedAt: '2090-01-01T00:00:00.000Z', language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'], authorName: '', body: { type: 'doc', content: [] } } }) })

    const found = await app.request('/api/public/stories/old-town?lang=en')
    const again = await app.request('/api/public/stories/old-town?lang=en', { headers: { 'If-None-Match': found.headers.get('ETag')! } })
    const missing = await setup().request(`/api/public/places/${pinId}?lang=en`)

    expect(found.status).toBe(200)
    expect(again.status).toBe(304)
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Content-Type')).toBe('application/problem+json')
    expect(missing.headers.get('Cache-Control')).toBeNull()
  })

  it('[E2.12] the routes are anonymous and take no store, so a request without a session is served', async () => {
    const app = setup()

    const anonymous = await app.request('/api/public/map?lang=de')
    const signedIn = await app.request('/api/public/map?lang=de', { headers: signedInAs('someone') })

    expect(anonymous.status).toBe(200)
    expect(signedIn.status).toBe(200)
  })
})

const moneyKey = /price|amount|cost|fee|currency|money/i

interface Node { [key: string]: unknown }

// Every property name reachable from a schema, following $ref into components.
function schemaKeys(node: unknown, components: Record<string, unknown>, seen = new Set<string>()): string[] {
  if (Array.isArray(node))
    return node.flatMap(child => schemaKeys(child, components, seen))
  if (typeof node !== 'object' || node === null)
    return []
  const object = node as Node
  if (typeof object.$ref === 'string') {
    const name = object.$ref.replace('#/components/schemas/', '')
    if (seen.has(name))
      return []
    seen.add(name)
    return schemaKeys(components[name], components, seen)
  }
  const properties = (typeof object.properties === 'object' && object.properties !== null ? Object.keys(object.properties) : [])
  return [...properties, ...Object.values(object).flatMap(child => schemaKeys(child, components, seen))]
}

describe('[E2.12] the generated document for the public routes', () => {
  const document = openApiDocument(contractApp())
  const paths = ['/api/public/stories', '/api/public/stories/{slug}', '/api/public/places/{id}', '/api/public/tours', '/api/public/tours/{slug}', '/api/public/map-categories', '/api/public/blog-categories', '/api/public/map']

  it('[E2.12] all 8 public paths are present, hold no store, and declare 200, 304 and a problem default', () => {
    // /api/public/invitations/preview is an identity POST, not one of these reads.
    const present = Object.entries(document.paths ?? {}).filter(([path, item]) => path.startsWith('/api/public/') && 'get' in item).map(([path]) => path)

    expect(present.sort()).toEqual([...paths].sort())
    for (const path of paths) {
      const operation = (document.paths as Record<string, { get: { responses: Record<string, unknown> } }>)[path]!.get
      expect(path).not.toContain('store')
      expect(Object.keys(operation.responses), path).toEqual(expect.arrayContaining(['200', '304', 'default']))
    }
  })

  it('[E2.12][AC54] no response schema of a public route has a price-shaped property', () => {
    const components = (document.components?.schemas ?? {}) as Record<string, unknown>
    const operations = paths.map(path => (document.paths as Record<string, { get: { responses: Record<string, Record<string, unknown>> } }>)[path]!.get)

    const all = operations.flatMap(operation => schemaKeys(operation.responses['200'], components))

    expect(all.length).toBeGreaterThan(40)
    expect(all.filter(key => moneyKey.test(key))).toEqual([])
  })
})

describe('[E2.12] a renewed session cookie never rides on a public read', () => {
  const renewed = 'better-auth.session_token=renewed; Path=/; HttpOnly'
  const { app, calls } = createGuardedApp({ someone: noAccess }, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, createFakeContentUseCases())] }, renewed)

  it('[E2.12] the 200 and the 304 of /api/public/map carry no Set-Cookie, and /api/me still passes it', async () => {
    const first = await app.request('/api/public/map?lang=en', { headers: signedInAs('someone') })
    const again = await app.request('/api/public/map?lang=en', { headers: { ...signedInAs('someone'), 'If-None-Match': first.headers.get('ETag')! } })
    const notFound = await app.request(`/api/public/places/${pinId}?lang=en`, { headers: signedInAs('someone') })
    const me = await app.request('/api/me', { headers: signedInAs('someone') })

    expect(first.status).toBe(200)
    expect(again.status).toBe(304)
    expect(notFound.status).toBe(404)
    expect(first.headers.getSetCookie()).toEqual([])
    const head = await app.request('/api/public/map?lang=en', { method: 'HEAD', headers: signedInAs('someone') })
    const headAgain = await app.request('/api/public/map?lang=en', { method: 'HEAD', headers: { ...signedInAs('someone'), 'If-None-Match': first.headers.get('ETag')! } })
    expect([head.status, headAgain.status]).toEqual([200, 304])
    expect(head.headers.getSetCookie()).toEqual([])
    expect(headAgain.headers.getSetCookie()).toEqual([])
    expect(again.headers.getSetCookie()).toEqual([])
    expect(notFound.headers.getSetCookie()).toEqual([])
    expect(me.headers.getSetCookie()).toEqual([renewed])
  })

  it('[E2.12][G-S5-PUBLICAUTH] a GET or HEAD of any public route reads no session, and /api/me does', async () => {
    const before = calls.readSession

    for (const path of [...listPaths, ...detailPaths]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await app.request(`${path}?lang=en`, { method, headers: signedInAs('someone') })
        expect(response.status, `${method} ${path}`).toBeLessThan(500)
      }
    }
    expect(calls.readSession).toBe(before)

    await app.request('/api/me', { headers: signedInAs('someone') })
    expect(calls.readSession).toBe(before + 1)
  })
})
