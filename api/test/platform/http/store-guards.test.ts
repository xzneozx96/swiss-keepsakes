import type { Access } from '@sk/domain/identity'
import type { AppEnv } from '../../../src/platform/http/app.ts'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { contractApp, generatedDir, openApiDocument } from '../../../scripts/contract.ts'
import { createGuardedApp, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'
import { callAs, expectedOutsiderAnswers, missingFromMatrix, outsiderAnswers, refusedToTheOwner, storeOperations, storeOperationsOutsideGuard, storeParametersOutsideGuard, storeUrl, unlistedStoreRoutes } from '../../support/permission-matrix.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  guest: noAccess,
  // A Super Admin who is also the owner of Lucerne still gets no store role.
  superAdmin: { platformAdmin: true, memberships: [{ storeId: lucerne, role: 'owner' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  managerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'manager' }] },
  both: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }] },
}

const asOutsiders = {
  anonymous: {},
  guest: signedInAs('guest'),
  superAdmin: signedInAs('superAdmin'),
  ownerElsewhere: signedInAs('ownerElsewhere'),
  managerElsewhere: signedInAs('managerElsewhere'),
}

const ok = { 200: { description: 'Done', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } } }

// Test-only routes registered the way a module registers its own, after createApp.
function setup() {
  const { app, calls } = createGuardedApp(people)
  const handled: string[] = []
  app.openapi(createRoute({ method: 'get', path: '/api/store/{storeId}/probe', request: { params: z.object({ storeId: z.uuid() }) }, responses: ok }), (c) => {
    handled.push('probe')
    return c.json({ ok: true }, 200)
  })
  app.openapi(createRoute({
    method: 'post',
    path: '/api/store/{storeId}/orders/{orderId}/accept',
    request: {
      params: z.object({ storeId: z.uuid(), orderId: z.uuid() }),
      body: { required: true, content: { 'application/json': { schema: z.object({ pickupDate: z.iso.date() }) } } },
    },
    responses: ok,
  }), (c) => {
    handled.push('accept')
    return c.json({ ok: true }, 200)
  })
  app.openapi(createRoute({ method: 'delete', path: '/api/store/{storeId}', request: { params: z.object({ storeId: z.uuid() }) }, responses: ok }), (c) => {
    handled.push('delete')
    return c.json({ ok: true }, 200)
  })
  return { app, calls, handled }
}

const asOwner = { who: 'owner', headers: signedInAs('owner') }

describe('[E2.10][AC02] the guard of /api/store/{storeId}/*', () => {
  it('[E2.10][AC02] a member of another store gets 403, an anonymous request gets 401, and no handler runs', async () => {
    const { app, handled } = setup()
    const probe = storeUrl('/api/store/{storeId}/probe', lucerne)

    const anonymous = await app.request(probe)
    const elsewhere = await app.request(probe, { headers: signedInAs('ownerElsewhere') })

    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toMatchObject({ type: 'unauthenticated' })
    expect(elsewhere.status).toBe(403)
    expect(elsewhere.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await elsewhere.json()).toMatchObject({ type: 'forbidden', status: 403 })
    expect(handled).toEqual([])
  })

  it.each(['owner', 'manager', 'both'])('[E2.10][AC02] the member %s of the store passes', async (who) => {
    const { app, handled } = setup()
    const response = await app.request(storeUrl('/api/store/{storeId}/probe', lucerne), { headers: signedInAs(who) })

    expect(response.status).toBe(200)
    expect(handled).toEqual(['probe'])
  })

  it('[E2.10][AC02] a person who belongs to two stores passes in each and not in a third', async () => {
    const { app } = setup()
    const third = '0190f0c2-0000-7000-8000-00000000000c'

    expect((await app.request(storeUrl('/api/store/{storeId}/probe', zug), { headers: signedInAs('both') })).status).toBe(200)
    expect((await app.request(storeUrl('/api/store/{storeId}/probe', third), { headers: signedInAs('both') })).status).toBe(403)
  })

  it('[E2.10][AC02] an upper-case store id finds the member\'s own store, and still refuses the member of another', async () => {
    const { app } = setup()
    const upper = `/api/store/${lucerne.toUpperCase()}/probe`

    expect((await app.request(upper, { headers: signedInAs('owner') })).status).toBe(200)
    expect((await app.request(upper, { headers: signedInAs('ownerElsewhere') })).status).toBe(403)
  })

  it.each(['lucerne', '0190f0c2-0000-7000-8000-00000000000', `${lucerne}-extra`, '%20'])('[E2.10][AC02] the store id %j is not a uuid, so even a member gets 403 and no handler runs', async (id) => {
    const { app, handled } = setup()
    const response = await app.request(`/api/store/${id}/probe`, { headers: signedInAs('owner') })

    expect(response.status).toBe(403)
    expect(handled).toEqual([])
  })

  it('[E2.10][AC02] the path of the store itself, with nothing after the id, is guarded too', async () => {
    const { app } = setup()
    const path = storeUrl('/api/store/{storeId}', lucerne)
    const asDelete = (headers: Record<string, string>) => app.request(path, { method: 'DELETE', headers: { Origin: shopOrigin, ...headers } })

    expect((await asDelete({})).status).toBe(401)
    expect((await asDelete(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await asDelete(signedInAs('owner'))).status).toBe(200)
  })

  it('[E2.10][AC02] an outsider gets 403 before the body is validated, a member gets the validation problem', async () => {
    const { app } = setup()
    const accept = storeUrl('/api/store/{storeId}/orders/{orderId}/accept', lucerne)
    const post = (headers: Record<string, string>) => app.request(accept, { method: 'POST', headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...headers }, body: '{}' })

    expect((await post(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await post(asOwner.headers)).status).toBe(400)
  })

  it('[E2.10][AC02] a plain app.get under /api/store/{storeId}/ is guarded as well', async () => {
    const { app } = setup()
    app.get('/api/store/:storeId/plain', c => c.json({ ok: true }))

    expect((await app.request(storeUrl('/api/store/{storeId}/plain', lucerne), { headers: signedInAs('ownerElsewhere') })).status).toBe(403)
    expect((await app.request(storeUrl('/api/store/{storeId}/plain', lucerne), { headers: signedInAs('owner') })).status).toBe(200)
  })
})

describe('[E2.10][AC02] the guard hands the handler the verified store id and role', () => {
  it.each([['owner', 'owner'], ['manager', 'manager']])('[E2.10][AC02] %s: c.get("store") holds the lower-case id and the %s role, even when the path says upper case', async (who, role) => {
    const { app } = setup()
    app.get('/api/store/:storeId/whoami', c => c.json({ store: c.get('store'), raw: c.req.param('storeId') }))

    const response = await app.request(`/api/store/${lucerne.toUpperCase()}/whoami`, { headers: signedInAs(who) })

    expect(await response.json()).toEqual({ store: { storeId: lucerne, role }, raw: lucerne.toUpperCase() })
  })

  it('[E2.10][AC02] a member of two stores gets the role of the store in the path', async () => {
    const { app } = setup()
    app.get('/api/store/:storeId/whoami', c => c.json(c.get('store')))

    expect(await (await app.request(`/api/store/${lucerne}/whoami`, { headers: signedInAs('both') })).json()).toEqual({ storeId: lucerne, role: 'owner' })
    expect(await (await app.request(`/api/store/${zug}/whoami`, { headers: signedInAs('both') })).json()).toEqual({ storeId: zug, role: 'manager' })
  })
})

describe('[E2.10] the guard of /api/admin/*', () => {
  function adminApp() {
    const { app } = createGuardedApp(people)
    app.get('/api/admin/stores', c => c.json({ ok: true }))
    return app
  }

  it('[E2.10] an anonymous request gets 401', async () => {
    const response = await adminApp().request('/api/admin/stores')

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ type: 'unauthenticated' })
  })

  it.each(['guest', 'owner', 'manager', 'both'])('[E2.10] %s gets 403, a store owner included', async (who) => {
    const response = await adminApp().request('/api/admin/stores', { headers: signedInAs(who) })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'forbidden' })
  })

  it('[E2.10] a row in platform_admins passes, and its owner role in a store opens no store route', async () => {
    const app = adminApp()
    const { app: withStore } = setup()

    expect((await app.request('/api/admin/stores', { headers: signedInAs('superAdmin') })).status).toBe(200)
    expect((await withStore.request(storeUrl('/api/store/{storeId}/probe', lucerne), { headers: signedInAs('superAdmin') })).status).toBe(403)
  })
})

describe('[E2.10] /api/me still answers staff and the Super Admin, who are guests too', () => {
  it.each(['guest', 'owner', 'both', 'superAdmin'])('[E2.10] %s gets their guest profile', async (who) => {
    const { app } = createGuardedApp(people)
    const response = await app.request('/api/me', { headers: signedInAs(who) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ guestId: `guest-of-${who}` })
  })

  it('[E2.4] /api/me lists the caller\'s memberships with the store status, and a guest\'s is empty without a read', async () => {
    const { app, calls } = createGuardedApp(people)
    const stores = async (who: string) => ((await (await app.request('/api/me', { headers: signedInAs(who) })).json()) as { stores: unknown[] }).stores

    expect(await stores('guest')).toEqual([])
    expect(calls.listMyStores).toBe(0)
    expect(await stores('owner')).toEqual([{ storeId: lucerne, role: 'owner', status: 'live' }])
    expect(await stores('both')).toEqual([{ storeId: lucerne, role: 'owner', status: 'live' }, { storeId: zug, role: 'manager', status: 'live' }])
    expect(await stores('ownerElsewhere')).toEqual([{ storeId: zug, role: 'owner', status: 'live' }])
  })

  it('[E2.10] an anonymous request still gets 401', async () => {
    const { app } = createGuardedApp(people)

    expect((await app.request('/api/me')).status).toBe(401)
  })

  it('[E2.10] every path under /api/me/ is guarded as well: anonymous gets 401 before the route or the 404', async () => {
    const { app } = createGuardedApp(people)
    app.get('/api/me/bookings', c => c.json({ guest: c.get('guest') }))

    for (const path of ['/api/me/bookings', '/api/me/nothing-here', '/api/me/a/b/c']) {
      const response = await app.request(path)
      expect(response.status, path).toBe(401)
      expect(await response.json()).toMatchObject({ type: 'unauthenticated' })
    }
    expect(await (await app.request('/api/me/bookings', { headers: signedInAs('owner') })).json()).toEqual({ guest: { userId: 'owner', guestId: 'guest-of-owner' } })
  })
})

// The routes createApp registers itself, with no test route added. A module that registers its routes in
// createApp joins this run at once, with no test of its own.
const { app: realApp } = createGuardedApp(people)
const realDocument = openApiDocument(realApp)
const realOperations = storeOperations(realDocument)
// The same builder the generated client comes from, and the committed document CI compares it with.
const contractOperations = storeOperations(openApiDocument(contractApp()))
const committedOperations = storeOperations(JSON.parse(await readFile(join(generatedDir, 'openapi.json'), 'utf8')) as { paths: Record<string, object> })

describe(`[E2.10][AC02] the generated permission matrix over createApp's own routes, ${realOperations.length} /api/store/* operations today`, () => {
  // The only state in which this describe may hold a todo: the contract has no /api/store/* operation either.
  // The first one added to createApp, and so to the contract, makes the todo vanish and the matrix run it, with
  // no edit here. A route that reaches the contract but not this inventory fails the equality tests below.
  if (realOperations.length === 0 && contractOperations.length === 0 && committedOperations.length === 0)
    it.todo('[E2.10][AC02] no /api/store/* route exists yet. The first one is checked here with no test of its own')
  it('[E2.10][AC02] the matrix inventory is the contract\'s: every /api/store/* operation of the contract, built and committed, is in it', () => {
    expect(missingFromMatrix(contractOperations, realOperations), 'The contract has a store operation that the matrix would not call').toEqual([])
    expect(missingFromMatrix(committedOperations, realOperations), 'The committed openapi.json has a store operation that the matrix would not call').toEqual([])
    expect(realOperations).toEqual(contractOperations)
  })
  it('[E2.10][AC02] every store route createApp serves is in the document and starts with the store id', () => {
    expect(unlistedStoreRoutes(realApp, realDocument), 'A store route was registered without app.openapi(), so the matrix cannot call it').toEqual([])
    expect(storeOperationsOutsideGuard(realOperations)).toEqual([])
    expect(storeParametersOutsideGuard(realApp, realDocument)).toEqual([])
  })
  it.each(realOperations)('[E2.10][AC02] $method $path refuses each outsider and lets the store\'s owner through', async (operation) => {
    expect(await outsiderAnswers(realApp, operation, lucerne, asOutsiders, shopOrigin)).toEqual(expectedOutsiderAnswers)
    expect(refusedToTheOwner(await callAs(realApp, operation, lucerne, asOwner, shopOrigin))).toBe(false)
  })
})

describe('[E2.10][AC02] the generated permission matrix, over the app that serves the requests', () => {
  it('[E2.10][AC02] takes every method of every path under /api/store/ from an OpenAPI document, and nothing else', () => {
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

  it('[E2.10][AC02] puts the store in the store segment and a uuid in every other path parameter', () => {
    expect(storeUrl('/api/store/{storeId}', zug)).toBe(`/api/store/${zug}`)
    expect(storeUrl('/api/store/{storeId}/bookings/{id}/no-show', zug)).toMatch(new RegExp(`^/api/store/${zug}/bookings/[0-9a-f-]{36}/no-show$`))
  })

  it('[E2.10][AC02] every /api/store/* operation of the app refuses each outsider and lets the store\'s owner through', async () => {
    const { app } = setup()
    const document = openApiDocument(app)
    const operations = storeOperations(document)

    expect(operations).toHaveLength(3 + realOperations.length)
    expect(unlistedStoreRoutes(app, document), 'A store route was registered without app.openapi(), so the matrix cannot call it').toEqual([])
    expect(storeOperationsOutsideGuard(operations), 'A route under /api/store/ must start with /api/store/{storeId}').toEqual([])
    for (const operation of operations) {
      expect(await outsiderAnswers(app, operation, lucerne, asOutsiders, shopOrigin), `${operation.method} ${operation.path}`).toEqual(expectedOutsiderAnswers)
      expect(refusedToTheOwner(await callAs(app, operation, lucerne, asOwner, shopOrigin)), `${operation.method} ${operation.path} refused its own owner`).toBe(false)
    }
  })

  it('[E2.10][AC02] fails on a store route registered with a plain app.get, which the document lacks', () => {
    const { app } = setup()
    app.get('/api/store/:storeId/plain', c => c.json({ ok: true }))
    app.post('/api/store/:storeId/plain-post', c => c.json({ ok: true }))

    expect(unlistedStoreRoutes(app, openApiDocument(app))).toEqual(['GET /api/store/{storeId}/plain', 'POST /api/store/{storeId}/plain-post'])
  })

  it('[E2.10][AC02] fails on a store operation whose path does not start with the store id', () => {
    const operations = storeOperations({ paths: { '/api/store/settings': { get: {} }, '/api/store/{storeId}/orders': { get: {} } } })

    expect(storeOperationsOutsideGuard(operations)).toEqual([{ method: 'GET', path: '/api/store/settings' }])
  })

  it('[E2.10][AC02] reports an app whose store routes have no guard, so the matrix can fail', async () => {
    const unguarded = new OpenAPIHono<AppEnv>()
    unguarded.get('/api/store/:storeId/probe', c => c.json({ ok: true }))
    const answers = await outsiderAnswers(unguarded, { method: 'GET', path: '/api/store/{storeId}/probe' }, lucerne, asOutsiders, shopOrigin)

    expect(answers.map(({ status }) => status)).toEqual([200, 200, 200, 200, 200])
    expect(answers).not.toEqual(expectedOutsiderAnswers)
  })
})

describe('[E2.10][AC02] the matrix inventory rules fail on what could hide a route', () => {
  it('[E2.10][AC02] reports a contract operation that the inventory lacks, which is what keeps the matrix from staying empty', () => {
    const contract = storeOperations({ paths: { '/api/store/{storeId}/orders': { get: {}, post: {} } } })

    expect(missingFromMatrix(contract, [])).toEqual(['GET /api/store/{storeId}/orders', 'POST /api/store/{storeId}/orders'])
    expect(missingFromMatrix(contract, contract.slice(0, 1))).toEqual(['POST /api/store/{storeId}/orders'])
    expect(missingFromMatrix(contract, contract)).toEqual([])
  })

  it.each(['all', 'get', 'post', 'delete'] as const)('[E2.10][AC02] fails on a store route registered with app.%s, which the document lacks (all answers every method)', (method) => {
    const { app } = setup()
    app[method]('/api/store/:storeId/plain', c => c.json({ ok: true }))

    expect(unlistedStoreRoutes(app, openApiDocument(app))).toEqual([`${method.toUpperCase()} /api/store/{storeId}/plain`])
  })

  it('[E2.10][AC02] does not report the store guard itself, and does report any other middleware under /api/store/', () => {
    const { app } = setup()
    expect(unlistedStoreRoutes(app, openApiDocument(app))).toEqual([])

    app.use('/api/store/:storeId/orders/*', async (_c, next) => next())
    expect(unlistedStoreRoutes(app, openApiDocument(app))).toEqual(['ALL /api/store/{storeId}/orders/*'])
  })

  it.each([
    ['/api/me/stores/:storeId/orders', '/api/me/stores/{storeId}/orders'],
    ['/api/admin/stores/:store_id', '/api/admin/stores/{store_id}'],
    ['/api/orders/:storeId', '/api/orders/{storeId}'],
  ])('[E2.10][AC02] fails on %s, a store id parameter outside /api/store/{storeId}', (route, reported) => {
    const { app } = setup()
    app.get(route, c => c.json({ ok: true }))

    expect(storeParametersOutsideGuard(app, openApiDocument(app))).toEqual([reported])
  })

  it('[E2.10][AC02] allows the public /api/stores/{slug}/* routes, which carry a slug and no store guard', () => {
    const { app } = setup()
    app.post('/api/stores/:slug/advice-requests', c => c.json({ ok: true }))

    expect(storeParametersOutsideGuard(app, openApiDocument(app))).toEqual([])
  })
})
