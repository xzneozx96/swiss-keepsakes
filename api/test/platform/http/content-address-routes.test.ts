import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createAddressRegister } from '../../../src/modules/content/adapters/address-register-fetch.ts'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { makeFindAddressAt } from '../../../src/modules/content/application/find-address-at.ts'
import { createFakeContentUseCases } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

const recorded = readFileSync(new URL('../../fixtures/geo-admin-identify-kapellbruecke.json', import.meta.url), 'utf8')
const pin = 'lat=47.0516489&lng=8.3075351'

type FetchAnswer = Response | Error | 'hang'

// The real use case and adapter over a fetch that gives one answer and records what it was asked.
function setup(answer: FetchAnswer, timeoutMs = 3000) {
  const asked: { url: string, redirect: string | undefined }[] = []
  const fetchStub: typeof fetch = (input, init) => {
    asked.push({ url: String(input instanceof Request ? input.url : input), redirect: init?.redirect })
    if (answer === 'hang')
      return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)))
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)
  }
  const useCases: ContentUseCases = { ...createFakeContentUseCases(), findAddressAt: makeFindAddressAt({ register: createAddressRegister(fetchStub), timeoutMs }) }
  const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  const get = (query: string = pin, who: string | null = 'owner', storeId = lucerne) =>
    app.request(`/api/store/${storeId}/address-at${query === '' ? '' : `?${query}`}`, { headers: who === null ? {} : signedInAs(who) })
  return { asked, get }
}

describe('gET /api/store/{storeId}/address-at', () => {
  it('answers the address of the nearest building of the register, asking only geo.admin.ch', async () => {
    const s = setup(new Response(recorded, { status: 200 }))

    const response = await s.get()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', formatted: 'Kapellbrücke 1, 6004 Luzern' })
    expect(s.asked).toHaveLength(1)
    expect(new URL(s.asked[0]!.url).host).toBe('api3.geo.admin.ch')
    expect(s.asked[0]!.redirect).toBe('manual')
  })

  it('a manager may use it too', async () => {
    expect((await setup(new Response(recorded)).get(pin, 'manager')).status).toBe(200)
  })

  it('answers 404 address-not-found when no building stands within 50 m', async () => {
    const response = await setup(new Response(JSON.stringify({ results: [] }))).get('lat=47.0&lng=8.3')

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'address-not-found', status: 404 })
  })

  it.each([
    ['a failed request', new Error('connect ECONNREFUSED')],
    ['a 500', new Response('oops', { status: 500 })],
    ['a body that is not JSON', new Response('<html>')],
  ])('answers 503 address-lookup-unavailable for %s', async (_name, answer) => {
    const response = await setup(answer).get()

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ type: 'address-lookup-unavailable', status: 503 })
  })

  it('answers 503 address-lookup-unavailable when the register does not answer in time', async () => {
    const response = await setup('hang', 30).get()

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ type: 'address-lookup-unavailable' })
  })

  it.each([
    ['no position', ''],
    ['no longitude', 'lat=47.05'],
    ['a latitude that is not a number', 'lat=north&lng=8.3'],
    ['a position in Paris', 'lat=48.85&lng=2.35'],
    ['a position in the sea', 'lat=0&lng=0'],
  ])('[E7] %s is 400 validation-failed and nothing is fetched', async (_name, query) => {
    const s = setup(new Response(recorded))

    const response = await s.get(query)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
    expect(s.asked).toEqual([])
  })

  it.each([
    ['anonymous', null, 401],
    ['guest', 'guest', 403],
    ['a member of another store', 'ownerElsewhere', 403],
  ])('%s is refused and nothing is fetched', async (_name, who, status) => {
    const s = setup(new Response(recorded))
    const response = await s.get(pin, who)

    expect(response.status).toBe(status)
    expect(s.asked).toEqual([])
  })
})
