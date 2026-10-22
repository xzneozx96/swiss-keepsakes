import type { Access } from '@sk/domain/identity'
import type { IdentityUseCases } from '../../../src/modules/identity/adapters/routes.ts'
import { serve } from '@hono/node-server'
import { describe, expect, it } from 'vitest'
import { registerIdentityRoutes } from '../../../src/modules/identity/adapters/routes.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs, strictCommands } from '../../support/guarded-app.ts'
import { createFakeIdentityUseCases } from '../../support/identity-use-cases.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
  superAdmin: { platformAdmin: true, memberships: [] },
}

function post(headers: Record<string, string>, body?: object) {
  return {
    method: 'POST',
    headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }
}

// The routes over the real createApp, with use cases whose answers a test sets.
function setup(overrides: Partial<IdentityUseCases> = {}, commands = guardedCommands) {
  const useCases = { ...createFakeIdentityUseCases(), ...overrides }
  const { app } = createGuardedApp(people, undefined, { ...commands, routes: [routes => registerIdentityRoutes(routes, useCases)] })
  return app
}

const newStore = { slug: 'lucerne-andenken', name: 'Lucerne Andenken', ownerEmail: 'ngoc.tran@example.ch' }

describe('[E2.3] the Idempotency-Key middleware sits after the guards and before the handlers', () => {
  it('[E2.3] an anonymous command gets 401 and an outsider gets 403 before anyone asks for a key', async () => {
    const app = setup({}, strictCommands)
    const open = `/api/store/${lucerne}/open-for-sale`

    expect((await app.request(open, post({}))).status).toBe(401)
    expect((await app.request(open, post(signedInAs('ownerElsewhere')))).status).toBe(403)
    expect((await app.request(open, post(signedInAs('guest')))).status).toBe(403)
    expect((await app.request('/api/admin/stores', post(signedInAs('owner'), newStore))).status).toBe(403)
    expect((await app.request('/api/me/invitations/accept', post({}, { token: 'x'.repeat(20) }))).status).toBe(401)
  })

  it('[E2.3] a member\'s command without a key gets the 400 problem, and the handler does not run', async () => {
    let calls = 0
    const app = setup({ openStoreForSale: async () => {
      calls++
      return { ok: false, reason: 'onboarding-incomplete' }
    } }, strictCommands)

    const response = await app.request(`/api/store/${lucerne}/open-for-sale`, post(signedInAs('owner')))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'idempotency-key-required' })
    expect(calls).toBe(0)
  })

  it('[E2.3] Better Auth\'s routes need no key, and a GET needs none', async () => {
    const app = setup({}, strictCommands)

    expect((await app.request('/api/auth/sign-out', post(signedInAs('owner')))).status).toBe(200)
    expect((await app.request(`/api/store/${lucerne}/onboarding`, { headers: signedInAs('owner') })).status).toBe(200)
  })
})

describe('[E2.3] the Super Admin\'s routes', () => {
  const asAdmin = { ...signedInAs('superAdmin'), 'Idempotency-Key': 'key-1' }

  it('[E2.3][AC03] create a store: 201 with the store, and the validated body reaches the use case with the actor', async () => {
    const seen: unknown[] = []
    const app = setup({ createStore: async (actor, input, requestId) => {
      seen.push({ actor, input, requestId: typeof requestId })
      return (await createFakeIdentityUseCases().createStore(actor, input, requestId))
    } })

    const response = await app.request('/api/admin/stores', post(asAdmin, newStore))

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ status: 'invited', invitation: { state: 'open' } })
    expect(seen).toEqual([{ actor: { userId: 'superAdmin' }, input: { ...newStore, defaultLanguage: 'en' }, requestId: 'string' }])
  })

  it.each([
    ['a slug with capitals', { ...newStore, slug: 'Lucerne' }],
    ['a slug with a trailing dash', { ...newStore, slug: 'lucerne-' }],
    ['a blank name', { ...newStore, name: '   ' }],
    ['an Owner address that is not an address', { ...newStore, ownerEmail: 'ngoc.tran' }],
    ['a language that is not offered', { ...newStore, language: 'fr' }],
    ['no Owner address', { slug: 'lucerne', name: 'Lucerne' }],
  ])('[E2.3] create a store with %s: 400 and the use case does not run', async (_, body) => {
    let calls = 0
    const app = setup({ createStore: async () => {
      calls++
      return { ok: false, reason: 'slug-taken' }
    } })

    const response = await app.request('/api/admin/stores', post(asAdmin, body))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
    expect(calls).toBe(0)
  })

  it('[E2.3] an Owner address of a Super Admin is a 409 problem with the code owner-is-super-admin', async () => {
    const app = setup({ createStore: async () => ({ ok: false, reason: 'owner-is-super-admin' }) })

    const response = await app.request('/api/admin/stores', post({ ...signedInAs('superAdmin'), 'Idempotency-Key': 'k' }, newStore))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'owner-is-super-admin', status: 409 })
  })

  it('[E2.3] a taken slug is a 409 problem with the code store-slug-taken', async () => {
    const app = setup({ createStore: async () => ({ ok: false, reason: 'slug-taken' }) })

    const response = await app.request('/api/admin/stores', post(asAdmin, newStore))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'store-slug-taken', status: 409 })
  })

  it('[E2.3] the list passes its page and cursor on, and rejects a limit outside 1 to 100', async () => {
    const seen: unknown[] = []
    const app = setup({ listStores: async (page) => {
      seen.push(page)
      return { items: [], nextCursor: null }
    } })
    const cursor = '0190f0c2-0000-7000-8000-0000000000ee'

    expect((await app.request(`/api/admin/stores?limit=5&cursor=${cursor}`, { headers: signedInAs('superAdmin') })).status).toBe(200)
    expect((await app.request('/api/admin/stores', { headers: signedInAs('superAdmin') })).status).toBe(200)
    expect((await app.request('/api/admin/stores?limit=0', { headers: signedInAs('superAdmin') })).status).toBe(400)
    expect((await app.request('/api/admin/stores?limit=101', { headers: signedInAs('superAdmin') })).status).toBe(400)
    expect(seen).toEqual([{ limit: 5, cursor }, { limit: 50 }])
  })

  it.each([
    ['store-not-found', 404, 'not-found'],
    ['invitation-not-found', 404, 'invitation-not-found'],
    ['invitation-already-accepted', 409, 'invitation-already-accepted'],
    ['invitation-revoked', 409, 'invitation-revoked'],
  ] as const)('[E2.3] resend: %s is a %s problem with the code %s', async (reason, status, type) => {
    const app = setup({ resendOwnerInvitation: async () => ({ ok: false, reason }) })

    const response = await app.request(`/api/admin/stores/${lucerne}/owner-invitation/resend`, post(asAdmin, {}))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ type })
  })

  it('[E2.3] resend takes an optional language, and an empty body is fine', async () => {
    const languages: unknown[] = []
    const app = setup({ resendOwnerInvitation: async (actor, storeId, language, requestId) => {
      languages.push(language)
      return createFakeIdentityUseCases().resendOwnerInvitation(actor, storeId, language, requestId)
    } })
    const url = `/api/admin/stores/${lucerne}/owner-invitation/resend`

    expect((await app.request(url, post({ ...asAdmin, 'Idempotency-Key': 'a' }, { language: 'de' }))).status).toBe(200)
    expect((await app.request(url, { method: 'POST', headers: { 'Origin': shopOrigin, ...signedInAs('superAdmin'), 'Idempotency-Key': 'b' } })).status).toBe(200)
    expect((await app.request(url, post({ ...asAdmin, 'Idempotency-Key': 'd' }))).status).toBe(200)
    expect((await app.request(url, post({ ...asAdmin, 'Idempotency-Key': 'c' }, { language: 'fr' }))).status).toBe(400)
    expect(languages).toEqual(['de', undefined, undefined])
  })
})

describe('[E2.3][S8] the accept route', () => {
  const asGuest = { ...signedInAs('guest'), 'Idempotency-Key': 'key-1' }
  const body = { token: 'T0ken-of-the-owner-link-0123456789abcdef' }

  it('[E2.3][S8] answers 200 with the store, the role and the store status', async () => {
    const seen: unknown[] = []
    const app = setup({ acceptInvitation: async (actor, token) => {
      seen.push({ actor, token })
      return { ok: true, storeId: lucerne, role: 'owner', storeStatus: 'onboarding' }
    } })

    const response = await app.request('/api/me/invitations/accept', post(asGuest, body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ storeId: lucerne, role: 'owner', storeStatus: 'onboarding' })
    expect(seen).toEqual([{ actor: { userId: 'guest' }, token: body.token }])
  })

  it.each([
    ['invitation-not-found', 404],
    ['invitation-email-mismatch', 403],
    ['invitation-email-unverified', 403],
    ['invitation-already-accepted', 409],
    ['invitation-expired', 410],
    ['invitation-revoked', 410],
    ['invitation-super-admin', 403],
    ['already-a-member', 409],
  ] as const)('[E2.3][S8] %s is a %s problem with that code, and the body never holds an email address', async (reason, status) => {
    const app = setup({ acceptInvitation: async () => ({ ok: false, reason }) })

    const response = await app.request('/api/me/invitations/accept', post(asGuest, body))
    const text = await response.text()

    expect(response.status).toBe(status)
    expect(JSON.parse(text)).toMatchObject({ type: reason, status })
    expect(text).not.toMatch(/@/)
  })

  it.each([{}, { token: '' }, { token: 'short' }, { token: 7 }])('[E2.3] a body of %j is a 400 and the use case does not run', async (bad) => {
    let calls = 0
    const app = setup({ acceptInvitation: async () => {
      calls++
      return { ok: false, reason: 'invitation-not-found' }
    } })

    expect((await app.request('/api/me/invitations/accept', post(asGuest, bad))).status).toBe(400)
    expect(calls).toBe(0)
  })

  it.each(['owner', 'manager'])('[E2.3] %s, a signed-in user with a store role, may accept an invitation to another store', async (who) => {
    const app = setup()

    expect((await app.request('/api/me/invitations/accept', post({ ...signedInAs(who), 'Idempotency-Key': 'k' }, body))).status).toBe(200)
  })

  it('[E2.3][S8] a Super Admin is refused with invitation-super-admin, and the use case never runs', async () => {
    let calls = 0
    const app = setup({ acceptInvitation: async () => {
      calls++
      return { ok: true, storeId: lucerne, role: 'owner', storeStatus: 'onboarding' }
    } })

    const response = await app.request('/api/me/invitations/accept', post({ ...signedInAs('superAdmin'), 'Idempotency-Key': 'k' }, body))

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'invitation-super-admin', status: 403 })
    expect(calls).toBe(0)
  })
})

describe('[E2.3][AC03] the Owner\'s onboarding routes', () => {
  const asOwner = { ...signedInAs('owner'), 'Idempotency-Key': 'key-1' }

  it('[E2.3][AC03] the use cases get the verified store id and role, not the raw path parameter', async () => {
    const seen: unknown[] = []
    const app = setup({
      getOnboarding: async (storeId) => {
        seen.push(storeId)
        return createFakeIdentityUseCases().getOnboarding(storeId)
      },
      openStoreForSale: async (actor, storeId) => {
        seen.push({ kind: actor.kind, storeId })
        return { ok: false, reason: 'onboarding-incomplete' }
      },
    })

    await app.request(`/api/store/${lucerne.toUpperCase()}/onboarding`, { headers: signedInAs('owner') })
    await app.request(`/api/store/${lucerne.toUpperCase()}/open-for-sale`, post(asOwner))

    expect(seen).toEqual([lucerne, { kind: 'staff', storeId: lucerne }])
  })

  it('[E2.3][AC03] opening for sale answers 409 onboarding-incomplete while a condition is unmet', async () => {
    const app = setup({ openStoreForSale: async () => ({ ok: false, reason: 'onboarding-incomplete' }) })

    const response = await app.request(`/api/store/${lucerne}/open-for-sale`, post(asOwner))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'onboarding-incomplete' })
  })

  it.each([
    ['forbidden', 403, 'forbidden'],
    ['store-not-found', 404, 'not-found'],
    ['store-not-onboarding', 409, 'store-not-onboarding'],
  ] as const)('[E2.3][AC03] opening for sale: %s is a %s problem with the code %s', async (reason, status, type) => {
    const app = setup({ openStoreForSale: async () => ({ ok: false, reason }) })

    const response = await app.request(`/api/store/${lucerne}/open-for-sale`, post(asOwner))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ type })
  })

  it('[E2.3] the store information needs at least one field, within bounds', async () => {
    const app = setup()
    const patch = (body: object, key: string) => app.request(`/api/store/${lucerne}/information`, { ...post({ ...signedInAs('owner'), 'Idempotency-Key': key }, body), method: 'PATCH' })

    expect((await patch({}, 'a')).status).toBe(400)
    expect((await patch({ name: '  ' }, 'b')).status).toBe(400)
    expect((await patch({ name: 'x'.repeat(121) }, 'c')).status).toBe(400)
    expect((await patch({ defaultLanguage: 'fr' }, 'd')).status).toBe(400)
    expect((await patch({ name: 'Lucerne Andenken' }, 'e')).status).toBe(200)
    expect((await patch({ defaultLanguage: 'de' }, 'f')).status).toBe(200)
  })

  it('[E2.3] a Manager\'s edit that the use case refuses is a 403 problem', async () => {
    const app = setup({ updateStoreInformation: async () => ({ ok: false, reason: 'forbidden' }) })

    const response = await app.request(`/api/store/${lucerne}/information`, { ...post({ ...signedInAs('manager'), 'Idempotency-Key': 'k' }, { name: 'Mine' }), method: 'PATCH' })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'forbidden' })
  })

  it('[E2.3] the onboarding read answers 404 when the store row is missing', async () => {
    const app = setup({ getOnboarding: async () => undefined })

    expect((await app.request(`/api/store/${lucerne}/onboarding`, { headers: signedInAs('manager') })).status).toBe(404)
  })

  it('[E2.3] a Manager of the store may read the checklist', async () => {
    const app = setup()

    const response = await app.request(`/api/store/${lucerne}/onboarding`, { headers: signedInAs('manager') })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ mayOpenForSale: false, conditions: expect.arrayContaining([{ key: 'payment-account', state: 'pending' }]) })
  })
})

describe('[E2.4][AC02] the Owner\'s member routes', () => {
  const asOwner = { ...signedInAs('owner'), 'Idempotency-Key': 'key-1' }
  const invitationId = '0190f0c2-0000-7000-8000-00000000000c'
  const memberId = '0190f0c2-0000-7000-8000-00000000000d'
  const invitations = `/api/store/${lucerne}/member-invitations`

  it('[E2.4][AC02] the use cases get the verified store id and the staff actor, not the raw path parameter', async () => {
    const seen: unknown[] = []
    const fake = createFakeIdentityUseCases()
    const app = setup({
      listMembers: async (actor, storeId) => {
        seen.push(['list', actor.kind, storeId])
        return fake.listMembers(actor, storeId)
      },
      inviteManager: async (actor, storeId, input) => {
        seen.push(['invite', actor.kind, storeId, input])
        return fake.inviteManager(actor, storeId, input, null)
      },
      removeMember: async (actor, storeId, id) => {
        seen.push(['remove', actor.kind, storeId, id])
        return { ok: true }
      },
    })

    await app.request(`/api/store/${lucerne.toUpperCase()}/members`, { headers: signedInAs('owner') })
    await app.request(`/api/store/${lucerne.toUpperCase()}/member-invitations`, post(asOwner, { email: 'lena.meier@example.ch', language: 'de' }))
    await app.request(`/api/store/${lucerne.toUpperCase()}/members/${memberId}`, { method: 'DELETE', headers: { Origin: shopOrigin, ...asOwner } })

    expect(seen).toEqual([['list', 'staff', lucerne], ['invite', 'staff', lucerne, { email: 'lena.meier@example.ch', language: 'de' }], ['remove', 'staff', lucerne, memberId]])
  })

  it('[E2.4][AC02] each route answers 403 with the forbidden code when the use case refuses, so a Manager gets the problem and not the data', async () => {
    const refuse = { ok: false, reason: 'forbidden' } as const
    const app = setup({ listMembers: async () => refuse, inviteManager: async () => refuse, resendManagerInvitation: async () => refuse, revokeInvitation: async () => refuse, removeMember: async () => refuse })
    const asManager = { ...signedInAs('manager'), 'Idempotency-Key': 'key-m' }

    const responses = await Promise.all([
      app.request(`/api/store/${lucerne}/members`, { headers: asManager }),
      app.request(invitations, post(asManager, { email: 'a@example.ch' })),
      app.request(`${invitations}/${invitationId}/resend`, post(asManager)),
      app.request(`${invitations}/${invitationId}/revoke`, post(asManager)),
      app.request(`/api/store/${lucerne}/members/${memberId}`, { method: 'DELETE', headers: { Origin: shopOrigin, ...asManager } }),
    ])

    expect(responses.map(response => response.status)).toEqual([403, 403, 403, 403, 403])
    for (const response of responses)
      expect(await response.json()).toMatchObject({ type: 'forbidden' })
  })

  it('[E2.4] an invitation answers 201, and removing a member answers 204 with no body', async () => {
    const app = setup()

    const created = await app.request(invitations, post(asOwner, { email: 'lena.meier@example.ch' }))
    const removed = await app.request(`/api/store/${lucerne}/members/${memberId}`, { method: 'DELETE', headers: { Origin: shopOrigin, ...asOwner } })

    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({ email: 'lena.meier@example.ch', state: 'open' })
    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe('')
  })

  it.each([
    ['already-a-member', 409],
    ['manager-is-super-admin', 409],
    ['invitation-already-open', 409],
    ['store-not-found', 404],
  ] as const)('[E2.4] inviting: %s is a %s problem', async (reason, status) => {
    const app = setup({ inviteManager: async () => ({ ok: false, reason }) })

    const response = await app.request(invitations, post(asOwner, { email: 'a@example.ch' }))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ type: reason === 'store-not-found' ? 'not-found' : reason })
  })

  it.each([
    ['resend', 'invitation-not-found', 404],
    ['resend', 'invitation-already-accepted', 409],
    ['resend', 'invitation-revoked', 409],
    ['revoke', 'invitation-not-found', 404],
    ['revoke', 'invitation-already-accepted', 409],
    ['revoke', 'invitation-revoked', 409],
  ] as const)('[E2.4] %s: %s is a %s problem', async (action, reason, status) => {
    const refusal = async () => ({ ok: false, reason }) as const
    const app = setup({ resendManagerInvitation: refusal, revokeInvitation: refusal })

    const response = await app.request(`${invitations}/${invitationId}/${action}`, post(asOwner))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ type: reason })
  })

  it('[E2.4] removing: a member of another store is a 404, an Owner is a 409 cannot-remove-owner', async () => {
    const missing = setup({ removeMember: async () => ({ ok: false, reason: 'member-not-found' }) })
    const owner = setup({ removeMember: async () => ({ ok: false, reason: 'cannot-remove-owner' }) })
    const remove = { method: 'DELETE', headers: { Origin: shopOrigin, ...asOwner } }

    const absent = await missing.request(`/api/store/${lucerne}/members/${memberId}`, remove)
    expect([absent.status, (await absent.json() as { type: string }).type]).toEqual([404, 'member-not-found'])
    const refusal = await owner.request(`/api/store/${lucerne}/members/${memberId}`, remove)
    expect(refusal.status).toBe(409)
    expect(await refusal.json()).toMatchObject({ type: 'cannot-remove-owner' })
  })

  it.each([{}, { email: 'not-an-email' }, { email: 'a@example.ch', language: 'fr' }])('[E2.4] an invitation body of %j is a 400 and the use case does not run', async (bad) => {
    let calls = 0
    const app = setup({ inviteManager: async () => {
      calls++
      return { ok: false, reason: 'forbidden' }
    } })

    expect((await app.request(invitations, post(asOwner, bad))).status).toBe(400)
    expect(calls).toBe(0)
  })

  it('[E2.4] a resend takes an optional language, and an empty body is fine', async () => {
    const languages: unknown[] = []
    const fake = createFakeIdentityUseCases()
    const app = setup({ resendManagerInvitation: async (actor, storeId, id, language) => {
      languages.push(language)
      return fake.resendManagerInvitation(actor, storeId, id, language, null)
    } })
    const url = `${invitations}/${invitationId}/resend`

    expect((await app.request(url, post({ ...asOwner, 'Idempotency-Key': 'a' }, { language: 'de' }))).status).toBe(200)
    expect((await app.request(url, { method: 'POST', headers: { 'Origin': shopOrigin, ...signedInAs('owner'), 'Idempotency-Key': 'b' } })).status).toBe(200)
    expect((await app.request(url, post({ ...asOwner, 'Idempotency-Key': 'c' }, { language: 'fr' }))).status).toBe(400)
    expect(languages).toEqual(['de', undefined])
  })

  it('[E2.4][AC02] a member of another store gets the guard\'s 403 on every member route, before the use case or the key check', async () => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: true } as const
    }
    const app = setup({ removeMember: count }, strictCommands)
    const other = signedInAs('ownerElsewhere')

    expect((await app.request(`/api/store/${lucerne}/members`, { headers: other })).status).toBe(403)
    expect((await app.request(invitations, post(other, { email: 'a@example.ch' }))).status).toBe(403)
    expect((await app.request(`${invitations}/${invitationId}/revoke`, post(other))).status).toBe(403)
    expect((await app.request(`/api/store/${lucerne}/members/${memberId}`, { method: 'DELETE', headers: { Origin: shopOrigin, ...other } })).status).toBe(403)
    expect(calls).toBe(0)
  })
})

describe('[E2.4] an optional-body command over the real HTTP server', () => {
  it('[E2.4] a resend with the JSON Content-Type and no body is a 200 on the node server, for the Owner invitation and the Manager invitation', async () => {
    const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerIdentityRoutes(routes, createFakeIdentityUseCases())] })
    const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 })
    await new Promise(resolve => server.once('listening', resolve))
    const { port } = server.address() as { port: number }
    try {
      const resend = (path: string, user: string) => fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', 'Cookie': `sk-test-user=${user}` } })

      const manager = await resend(`/api/store/${lucerne}/member-invitations/0190f0c2-0000-7000-8000-00000000000c/resend`, 'owner')
      const admin = await resend(`/api/admin/stores/${lucerne}/owner-invitation/resend`, 'superAdmin')

      expect([manager.status, admin.status]).toEqual([200, 200])
    }
    finally {
      await new Promise(resolve => server.close(resolve))
    }
  })
})
