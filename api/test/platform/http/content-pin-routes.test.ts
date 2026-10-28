import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases, fakePin } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const pinId = '0190f0c2-0000-7000-8000-0000000000a1'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  return app
}

const pins = `/api/store/${lucerne}/pins`
const pin = `${pins}/${pinId}`

function send(app: ReturnType<typeof setup>, method: string, path: string, headers: Record<string, string> = {}, body?: object) {
  return app.request(path, {
    method,
    headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...signedInAs('owner'), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('[E2.6] the pin save: If-Match, ETag and rowVersion', () => {
  it('[E2.6] AC-1 PATCH with If-Match 3 answers 200, ETag "4" and rowVersion 4', async () => {
    const seen: unknown[] = []
    const app = setup({ savePin: async (actor, storeId, id, ifMatch, changes, requestId) => {
      seen.push({ kind: actor.kind, storeId, id, ifMatch, changes, requestId: typeof requestId })
      return { ok: true, value: { ...fakePin, rowVersion: ifMatch + 1 } }
    } })

    const response = await send(app, 'PATCH', pin, { 'If-Match': '3' }, { title: { en: 'Chapel Bridge' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('ETag')).toBe('"4"')
    expect(await response.json()).toMatchObject({ id: pinId, rowVersion: 4, createdAt: '2026-10-27T08:00:00.000Z', firstPublishedAt: null })
    expect(seen).toEqual([{ kind: 'staff', storeId: lucerne, id: pinId, ifMatch: 3, changes: { title: { en: 'Chapel Bridge' } }, requestId: 'string' }])
  })

  it.each(['"3"', 'W/"3"'])('[E2.6] AC-1 If-Match %s is read as version 3', async (header) => {
    const app = setup()

    const response = await send(app, 'PATCH', pin, { 'If-Match': header }, {})

    expect(response.status).toBe(200)
    expect(response.headers.get('ETag')).toBe('"4"')
  })

  it('[E2.6] AC-1 PATCH with If-Match 2 answers 412 application/problem+json type precondition-failed', async () => {
    const app = setup({ savePin: async () => ({ ok: false, reason: 'stale' }) })

    const response = await send(app, 'PATCH', pin, { 'If-Match': '2' }, { title: { en: 'x' } })

    expect(response.status).toBe(412)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'precondition-failed', status: 412 })
  })

  it.each([
    ['PATCH', pin, {}],
    ['POST', `${pin}/publish`, undefined],
    ['POST', `${pin}/hide`, undefined],
    ['DELETE', pin, undefined],
  ])('[E2.6] AC-1 %s %s with no If-Match answers 428 type precondition-required and the use case is not called', async (method, path, body) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: false, reason: 'stale' } as const
    }
    const app = setup({ savePin: count, publishPin: count, hidePin: count, deletePin: count })

    const response = await send(app, method, path, {}, body)

    expect(response.status).toBe(428)
    expect(await response.json()).toMatchObject({ type: 'precondition-required', status: 428 })
    expect(calls).toBe(0)
  })

  it.each(['abc', '*', '0', '-1', '1.5', '3, 4'])('[E2.6] If-Match: %s answers 400 validation-failed and the use case is not called', async (header) => {
    let calls = 0
    const app = setup({ savePin: async () => {
      calls++
      return { ok: false, reason: 'stale' }
    } })

    const response = await send(app, 'PATCH', pin, { 'If-Match': header }, {})

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed', errors: [{ in: 'header', path: 'If-Match' }] })
    expect(calls).toBe(0)
  })

  it('[E2.6] a pin id that is not a uuid answers 400, not 404 or 500', async () => {
    const app = setup()

    expect((await send(app, 'PATCH', `${pins}/not-a-uuid`, { 'If-Match': '1' }, {})).status).toBe(400)
    expect((await send(app, 'DELETE', `${pins}/not-a-uuid`, { 'If-Match': '1' })).status).toBe(400)
  })
})

describe('[E2.6][AC68] the body has no type and no price', () => {
  it.each([{ type: 'shop' }, { price: 12 }, { title: { en: 'x' }, unknown: 1 }])('[E2.6][AC68] a POST body with type or price answers 400 validation-failed: %j', async (body) => {
    let calls = 0
    const app = setup({ createPin: async () => {
      calls++
      return { ok: false, reason: 'forbidden' }
    } })

    const response = await send(app, 'POST', pins, {}, body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
    expect(calls).toBe(0)
  })

  it('[E2.6][AC68] a PATCH body with a price answers 400 too', async () => {
    const response = await send(setup(), 'PATCH', pin, { 'If-Match': '1' }, { price: 1 })

    expect(response.status).toBe(400)
  })

  it('[E2.6] a date sent with no times reaches the use case with startTime null and endTime null', async () => {
    const seen: unknown[] = []
    const app = setup({ createPin: async (_actor, storeId, changes) => {
      seen.push(changes.dates)
      return { ok: true, value: { ...fakePin, storeId } }
    } })

    const response = await send(app, 'POST', pins, {}, { dates: [{ firstDay: '2026-12-01', lastDay: '2026-12-02' }] })

    expect(response.status).toBe(201)
    expect(seen).toEqual([[{ firstDay: '2026-12-01', lastDay: '2026-12-02', startTime: null, endTime: null }]])
  })

  it('[E2.6] a valid create answers 201 with the pin and ETag "1"', async () => {
    const response = await send(setup(), 'POST', pins, {}, { title: { en: 'Chapel Bridge' } })

    expect(response.status).toBe(201)
    expect(response.headers.get('ETag')).toBe('"1"')
    expect(await response.json()).toMatchObject({ storeId: lucerne, status: 'draft', rowVersion: 1 })
  })
})

describe('[E2.6] publish, hide and delete answer the editor in its own words', () => {
  it('[E2.6][AC68] a publish that lacks a slug answers 422 publish-incomplete naming slug', async () => {
    const app = setup({ publishPin: async () => ({ ok: false, reason: 'incomplete', gaps: ['slug'] }) })

    const response = await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ in: 'body', path: 'slug' }] })
  })

  it('[E2.6][AC68] a publish that renames a live slug answers 409 slug-conflict', async () => {
    const app = setup({ publishPin: async () => ({ ok: false, reason: 'slug-conflict' }) })

    const response = await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' }, { slug: { en: 'renamed' } })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'slug-conflict', status: 409 })
  })

  it('[E2.6][AC30] publish reads an optional slug body: none, a slug for a new language, and nothing else', async () => {
    const seen: unknown[] = []
    const app = setup({ publishPin: async (_actor, _storeId, _id, ifMatch, _requestId, slug) => {
      seen.push(slug)
      return { ok: true, value: { ...fakePin, status: 'published', rowVersion: ifMatch + 1 } }
    } })

    expect((await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' })).status).toBe(200)
    expect((await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' }, {})).status).toBe(200)
    expect((await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' }, { slug: { de: 'kapellbruecke' } })).status).toBe(200)
    expect(seen).toEqual([undefined, undefined, { de: 'kapellbruecke' }])
  })

  it.each([
    ['a malformed slug', { slug: { de: 'Not A Slug' } }],
    ['an empty slug map', { slug: {} }],
    ['an unknown key in the slug', { slug: { fr: 'pont' } }],
    ['an unknown key in the body', { slug: { de: 'ok' }, title: { en: 'x' } }],
  ])('[E2.6][AC68] publish with %s answers 400 and the use case is not called', async (_name, body) => {
    let calls = 0
    const app = setup({ publishPin: async () => {
      calls++
      return { ok: false, reason: 'stale' }
    } })

    const response = await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' }, body)

    expect(response.status).toBe(400)
    expect(calls).toBe(0)
  })

  it('[E2.6] publish and hide answer 200 with the new status and ETag', async () => {
    const app = setup()

    const published = await send(app, 'POST', `${pin}/publish`, { 'If-Match': '1' })
    const hidden = await send(app, 'POST', `${pin}/hide`, { 'If-Match': '2' })

    expect(await published.json()).toMatchObject({ status: 'published', rowVersion: 2 })
    expect(published.headers.get('ETag')).toBe('"2"')
    expect(await hidden.json()).toMatchObject({ status: 'hidden', rowVersion: 3 })
    expect(hidden.headers.get('ETag')).toBe('"3"')
  })

  it('[E2.6][AC79] DELETE of a published pin answers 409 published-cannot-be-deleted with the editor message', async () => {
    const app = setup({ deletePin: async () => ({ ok: false, reason: 'published-cannot-be-deleted' }) })

    const response = await send(app, 'DELETE', pin, { 'If-Match': '1' })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'published-cannot-be-deleted', title: 'A published item cannot be deleted. Hide it instead.' })
  })

  it('[E2.6] DELETE with If-Match 3 passes the version to the use case and answers 204 with no body', async () => {
    const seen: number[] = []
    const app = setup({ deletePin: async (_actor, _storeId, id, ifMatch) => {
      seen.push(ifMatch)
      return { ok: true, value: { id } }
    } })

    const response = await send(app, 'DELETE', pin, { 'If-Match': '3' })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(seen).toEqual([3])
  })

  it('[E2.6] DELETE with a stale If-Match answers 412 precondition-failed', async () => {
    const app = setup({ deletePin: async () => ({ ok: false, reason: 'stale' }) })

    const response = await send(app, 'DELETE', pin, { 'If-Match': '2' })

    expect(response.status).toBe(412)
    expect(await response.json()).toMatchObject({ type: 'precondition-failed', status: 412 })
  })

  it('[E2.6] a use case that finds no pin answers 404 not-found', async () => {
    const app = setup({ hidePin: async () => ({ ok: false, reason: 'not-found' }) })

    const response = await send(app, 'POST', `${pin}/hide`, { 'If-Match': '1' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'not-found' })
  })
})

describe('[E2.6] AC-7 who may write', () => {
  const routes = [
    ['POST', pins, {}],
    ['PATCH', pin, {}],
    ['POST', `${pin}/publish`, undefined],
    ['POST', `${pin}/hide`, undefined],
    ['DELETE', pin, undefined],
  ] as const

  it.each(routes)('[E2.6] AC-7 a member of another store, a user with no membership and an anonymous caller get 403, 403 and 401 on %s %s', async (method, path, body) => {
    const calls: string[] = []
    const track = (name: string) => async () => {
      calls.push(name)
      return { ok: false, reason: 'not-found' } as const
    }
    const app = setup({ createPin: track('create'), savePin: track('save'), publishPin: track('publish'), hidePin: track('hide'), deletePin: track('delete') })
    const as = (who: Record<string, string>) => app.request(path, { method, headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', 'If-Match': '1', ...who }, body: body ? JSON.stringify(body) : undefined })

    expect((await as(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await as(signedInAs('guest'))).status).toBe(403)
    expect((await as({})).status).toBe(401)
    expect(calls).toEqual([])
  })

  it.each(['owner', 'manager'])('[E2.6] AC-7 the %s of the store reaches the use case', async (who) => {
    const response = await send(setup(), 'POST', pins, signedInAs(who), {})

    expect(response.status).toBe(201)
  })
})
