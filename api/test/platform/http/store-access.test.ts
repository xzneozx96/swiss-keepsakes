import type { Outsider } from '../../support/permission-matrix.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { beforeAll, describe, expect, it } from 'vitest'
import { contractApp, openApiDocument } from '../../../scripts/contract.ts'
import { createApp } from '../../../src/platform/http/app.ts'
import { createLogger } from '../../../src/platform/logger.ts'
import { createSigningKey, signToken, testAuthentication } from '../../support/identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'
import { outsiderAnswers, outsiderOutcomes, storeOperations, storeUrl } from '../../support/permission-matrix.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const userIds: Record<Outsider | 'owner' | 'manager', string> = {
  owner: '0190f0c2-0000-7000-8000-0000000000c1',
  manager: '0190f0c2-0000-7000-8000-0000000000c2',
  guest: '0190f0c2-0000-7000-8000-0000000000c3',
  superAdmin: '0190f0c2-0000-7000-8000-0000000000c4',
  ownerElsewhere: '0190f0c2-0000-7000-8000-0000000000c5',
  managerElsewhere: '0190f0c2-0000-7000-8000-0000000000c6',
}
// What the identity tables would hold. Only the owner and the manager belong to Lucerne.
const people = {
  [userIds.owner]: { memberships: [{ storeId: lucerne, role: 'owner' as const }] },
  [userIds.manager]: { memberships: [{ storeId: lucerne, role: 'manager' as const }] },
  [userIds.superAdmin]: { platformAdmin: true },
  [userIds.ownerElsewhere]: { memberships: [{ storeId: zug, role: 'owner' as const }] },
  [userIds.managerElsewhere]: { memberships: [{ storeId: zug, role: 'manager' as const }] },
}

const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
let key: Awaited<ReturnType<typeof createSigningKey>>
beforeAll(async () => {
  key = await createSigningKey()
})

// The app with every route createApp registers, and with test tokens and test people.
function appUnderTest() {
  return createApp(createLogger('silent'), async () => ({ database: true, jobs: true }), testAuthentication([key.jwk], clock, people))
}

const expectedOutcomes = outsiderOutcomes.map(({ who, status, type }) => ({ who, status, type }))

// contractApp() registers the same routes as appUnderTest(), and building it needs no key.
const realOperations = storeOperations(openApiDocument(contractApp()))

describe(`[E2.2][AC02] the generated permission matrix over the real app, ${realOperations.length} /api/store/* operations today`, () => {
  if (realOperations.length === 0)
    it.todo('[E2.2][AC02] no /api/store/* route exists yet. The first one is checked here with no test of its own')
  it.each(realOperations)('[E2.2][AC02] $method $path refuses everyone outside the store', async (operation) => {
    expect(await outsiderAnswers(appUnderTest(), operation, lucerne, key, clock, userIds)).toEqual(expectedOutcomes)
  })
})

describe('[E2.2][AC02] the permission matrix generator', () => {
  it('[E2.2][AC02] takes every method of every path under /api/store/ from an OpenAPI document, and nothing else', () => {
    const fixture = {
      paths: {
        '/healthz': { get: {} },
        '/api/public/stores': { get: {} },
        '/api/stores/{slug}/advice-requests': { post: {} },
        '/api/store/{storeId}': { get: {}, patch: {}, parameters: [], summary: 'Settings' },
        '/api/store/{storeId}/bookings/{id}/no-show': { post: {} },
      },
    }

    expect(storeOperations(fixture)).toEqual([
      { method: 'GET', path: '/api/store/{storeId}' },
      { method: 'PATCH', path: '/api/store/{storeId}' },
      { method: 'POST', path: '/api/store/{storeId}/bookings/{id}/no-show' },
    ])
  })

  it('[E2.2][AC02] puts the store in the store segment and a uuid in every other path parameter', () => {
    expect(storeUrl('/api/store/{storeId}', zug)).toBe(`/api/store/${zug}`)
    expect(storeUrl('/api/store/{storeId}/bookings/{id}/no-show', zug)).toMatch(new RegExp(`^/api/store/${zug}/bookings/[0-9a-f-]{36}/no-show$`))
  })

  // Test-only routes, registered like a module's routes after createApp. They prove the matrix finds and refuses
  // a new route without a test of its own, and that the store's own staff still get through.
  function appWithStoreRoutes() {
    const app = appUnderTest()
    const ok = { 200: { description: 'Done', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } } }
    app.openapi(createRoute({ method: 'get', path: '/api/store/{storeId}/probe', request: { params: z.object({ storeId: z.uuid() }) }, responses: ok }), c => c.json({ ok: true }, 200))
    app.openapi(createRoute({
      method: 'post',
      path: '/api/store/{storeId}/orders/{orderId}/accept',
      request: {
        params: z.object({ storeId: z.uuid(), orderId: z.uuid() }),
        body: { required: true, content: { 'application/json': { schema: z.object({ pickupDate: z.iso.date() }) } } },
      },
      responses: ok,
    }), c => c.json({ ok: true }, 200))
    app.openapi(createRoute({ method: 'delete', path: '/api/store/{storeId}', responses: ok }), c => c.json({ ok: true }, 200))
    return app
  }

  it('[E2.2][AC02] finds the routes a test registers, and every one refuses each outsider before validation', async () => {
    const app = appWithStoreRoutes()
    const operations = storeOperations(openApiDocument(app))

    expect(operations).toEqual([
      { method: 'DELETE', path: '/api/store/{storeId}' },
      { method: 'POST', path: '/api/store/{storeId}/orders/{orderId}/accept' },
      { method: 'GET', path: '/api/store/{storeId}/probe' },
    ])
    for (const operation of operations)
      expect(await outsiderAnswers(app, operation, lucerne, key, clock, userIds), `${operation.method} ${operation.path}`).toEqual(expectedOutcomes)
  })

  it.each(['owner', 'manager'] as const)('[E2.2][AC02] the %s of the store gets past the guard on the same routes', async (member) => {
    const app = appWithStoreRoutes()
    const headers = { 'Authorization': `Bearer ${await signToken(key, clock, { sub: userIds[member] })}`, 'Content-Type': 'application/json' }

    expect((await app.request(storeUrl('/api/store/{storeId}/probe', lucerne), { headers })).status).toBe(200)
    expect((await app.request(storeUrl('/api/store/{storeId}', lucerne), { method: 'DELETE', headers })).status).toBe(200)
    const accept = storeUrl('/api/store/{storeId}/orders/{orderId}/accept', lucerne)
    expect(await (await app.request(accept, { method: 'POST', headers, body: '{}' })).json()).toMatchObject({ type: 'validation-failed' })
    expect((await app.request(accept, { method: 'POST', headers, body: '{"pickupDate":"2026-10-24"}' })).status).toBe(200)
  })
})
