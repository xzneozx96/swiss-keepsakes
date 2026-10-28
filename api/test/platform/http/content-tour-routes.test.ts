import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases, fakeTour } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const tourId = fakeTour.id
const photo = '0190f0c2-0000-7000-8000-0000000000d1'

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

const tours = `/api/store/${lucerne}/tours`
const tour = `${tours}/${tourId}`

function send(app: ReturnType<typeof setup>, method: string, path: string, headers: Record<string, string> = {}, body?: object) {
  return app.request(path, {
    method,
    headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...signedInAs('owner'), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('[E2.6] the tour save: If-Match, ETag and rowVersion', () => {
  it('[E2.6] AC-1 a tour PATCH: stale 412, missing 428, current 200 with the new ETag', async () => {
    let calls = 0
    const app = setup({ saveTour: async (_actor, _storeId, _id, ifMatch) => {
      calls++
      return ifMatch === 2 ? { ok: false, reason: 'stale' } : { ok: true, value: { ...fakeTour, rowVersion: ifMatch + 1 } }
    } })

    const stale = await send(app, 'PATCH', tour, { 'If-Match': '2' }, { stayTag: 'multi_day' })
    const none = await send(app, 'PATCH', tour, {}, { stayTag: 'multi_day' })
    const fresh = await send(app, 'PATCH', tour, { 'If-Match': '3' }, { stayTag: 'multi_day' })

    expect(stale.status).toBe(412)
    expect(stale.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect(none.status).toBe(428)
    expect(await none.json()).toMatchObject({ type: 'precondition-required' })
    expect(calls).toBe(2)
    expect(fresh.status).toBe(200)
    expect(fresh.headers.get('ETag')).toBe('"4"')
    expect(await fresh.json()).toMatchObject({ id: tourId, rowVersion: 4, createdAt: '2026-10-27T08:00:00.000Z', stops: [] })
  })

  it.each(['abc', '*', '0'])('[E2.6] If-Match: %s answers 400 and no tour use case is called', async (header) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: false, reason: 'stale' } as const
    }
    const app = setup({ saveTour: count, publishTour: count, unpublishTour: count })

    for (const [method, path, body] of [['PATCH', tour, {}], ['POST', `${tour}/publish`], ['POST', `${tour}/unpublish`]] as const) {
      const response = await send(app, method, path, { 'If-Match': header }, body)
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ type: 'validation-failed', errors: [{ in: 'header', path: 'If-Match' }] })
    }
    expect(calls).toBe(0)
  })

  it.each([
    ['PATCH', tour, {}],
    ['POST', `${tour}/publish`, undefined],
    ['POST', `${tour}/unpublish`, undefined],
  ] as const)('[E2.6] AC-1 %s %s with no If-Match answers 428 and the use case is not called', async (method, path, body) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: false, reason: 'stale' } as const
    }
    const response = await send(setup({ saveTour: count, publishTour: count, unpublishTour: count }), method, path, {}, body)

    expect(response.status).toBe(428)
    expect(calls).toBe(0)
  })

  it('[E2.6] a tour id that is not a uuid answers 400, not 404 or 500', async () => {
    const app = setup()

    expect((await send(app, 'PATCH', `${tours}/not-a-uuid`, { 'If-Match': '1' }, {})).status).toBe(400)
    expect((await send(app, 'DELETE', `${tours}/not-a-uuid`, { 'If-Match': '1' })).status).toBe(400)
  })
})

describe('[E2.6] the tour write routes', () => {
  it('[E2.6] creating a tour answers 201 with the tour and ETag "1", and the stops reach the use case in order', async () => {
    const seen: unknown[] = []
    const app = setup({ createTour: async (_actor, storeId, changes) => {
      seen.push(changes)
      return { ok: true, value: { ...fakeTour, storeId } }
    } })

    const response = await send(app, 'POST', tours, {}, { durationMinutes: 90, stops: [{ latitude: 47.05, longitude: 8.3, title: { en: 'Chapel Bridge' }, minutesFromStart: 5 }] })

    expect(response.status).toBe(201)
    expect(response.headers.get('ETag')).toBe('"1"')
    expect(await response.json()).toMatchObject({ storeId: lucerne, status: 'draft', rowVersion: 1, createdAt: '2026-10-27T08:00:00.000Z' })
    expect(seen).toEqual([{ durationMinutes: 90, stops: [{ latitude: 47.05, longitude: 8.3, title: { en: 'Chapel Bridge' }, text: {}, minutesFromStart: 5, mediaId: null, placeId: null }] }])
  })

  it('[E2.6] a stop with neither a title nor a text reaches the use case with empty maps', async () => {
    const seen: unknown[] = []
    const app = setup({ saveTour: async (_actor, _storeId, _id, ifMatch, changes) => {
      seen.push(changes)
      return { ok: true, value: { ...fakeTour, rowVersion: ifMatch + 1 } }
    } })

    const response = await send(app, 'PATCH', tour, { 'If-Match': '1' }, { stops: [{ latitude: 47, longitude: 8 }] })

    expect(response.status).toBe(200)
    expect(seen).toEqual([{ stops: [{ latitude: 47, longitude: 8, title: {}, text: {}, minutesFromStart: null, mediaId: null, placeId: null }] }])
  })

  it('[E2.6] a partial draft reaches the use case partial, so a left-out field is not wiped', async () => {
    const seen: unknown[] = []
    const app = setup({ saveTour: async (_actor, _storeId, _id, ifMatch, changes) => {
      seen.push(changes)
      return { ok: true, value: { ...fakeTour, rowVersion: ifMatch + 1 } }
    } })

    await send(app, 'PATCH', tour, { 'If-Match': '1' }, { draft: { summary: { en: 'Only this' } } })
    await send(app, 'PATCH', tour, { 'If-Match': '1' }, { draft: {} })

    expect(seen).toEqual([{ draft: { summary: { en: 'Only this' } } }, { draft: {} }])
  })

  it.each([
    { draft: { price: 1 } },
    { draft: { sections: [{ id: 'a', heading: {}, body: {}, price: 1 }] } },
  ])('[E2.6] a price key inside a draft %j answers 400', async (body) => {
    expect((await send(setup(), 'PATCH', tour, { 'If-Match': '1' }, body)).status).toBe(400)
    expect((await send(setup(), 'POST', tours, {}, body)).status).toBe(400)
  })

  it('[E2.6] the view lists the stops and both documents with ISO dates', async () => {
    const stop = { id: photo, position: 1, latitude: 47, longitude: 8, title: { en: 'A' }, text: {}, minutesFromStart: null, mediaId: null, placeId: null }
    const doc = { title: { en: 'Walk' }, summary: {}, meetingPoint: {}, sections: [] }
    const app = setup({ saveTour: async () => ({ ok: true, value: { ...fakeTour, rowVersion: 2, stops: [stop], draft: doc } }) })

    const body = await (await send(app, 'PATCH', tour, { 'If-Match': '1' }, {})).json()

    expect(body).toMatchObject({ stops: [stop], draft: doc, published: null, updatedAt: '2026-10-27T08:00:00.000Z' })
  })

  it.each([{ price: 100 }, { departures: [] }, { departure: '2026-11-01' }, { type: 'x' }, { stops: [{ latitude: 47, longitude: 8, price: 1 }] }])('[E2.6] a tour body %j with a price or a departure answers 400', async (body) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: true, value: fakeTour } as const
    }
    const app = setup({ createTour: count, saveTour: count })

    expect((await send(app, 'POST', tours, {}, body)).status).toBe(400)
    expect((await send(app, 'PATCH', tour, { 'If-Match': '1' }, body)).status).toBe(400)
    expect(calls).toBe(0)
  })

  it('[E2.6] publishing answers 200 with status published; a gap answers 422 publish-incomplete naming it', async () => {
    const seen: unknown[] = []
    const app = setup({ publishTour: async (_actor, storeId, id, ifMatch) => {
      seen.push({ storeId, id, ifMatch })
      return ifMatch === 2 ? { ok: false, reason: 'incomplete', gaps: ['pdf'] } : { ok: true, value: { ...fakeTour, status: 'published', rowVersion: ifMatch + 1 } }
    } })

    const published = await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' })
    const incomplete = await send(app, 'POST', `${tour}/publish`, { 'If-Match': '2' })

    expect(published.status).toBe(200)
    expect(published.headers.get('ETag')).toBe('"2"')
    expect(await published.json()).toMatchObject({ status: 'published', rowVersion: 2 })
    expect(incomplete.status).toBe(422)
    expect(await incomplete.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ in: 'body', path: 'pdf' }] })
    expect(seen).toEqual([{ storeId: lucerne, id: tourId, ifMatch: 1 }, { storeId: lucerne, id: tourId, ifMatch: 2 }])
  })

  it('[E2.6][AC68] a publish that renames a live slug answers 409 slug-conflict', async () => {
    const app = setup({ publishTour: async () => ({ ok: false, reason: 'slug-conflict' }) })

    const response = await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' }, { slug: { en: 'renamed' } })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'slug-conflict', status: 409 })
  })

  it('[E2.6][AC30] publish reads an optional slug body: none, a slug for a new language, and nothing else', async () => {
    const seen: unknown[] = []
    const app = setup({ publishTour: async (_actor, _storeId, _id, ifMatch, _requestId, slug) => {
      seen.push(slug)
      return { ok: true, value: { ...fakeTour, status: 'published', rowVersion: ifMatch + 1 } }
    } })

    expect((await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' })).status).toBe(200)
    expect((await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' }, {})).status).toBe(200)
    expect((await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' }, { slug: { de: 'altstadtrundgang' } })).status).toBe(200)
    expect(seen).toEqual([undefined, undefined, { de: 'altstadtrundgang' }])
  })

  it.each([
    ['a malformed slug', { slug: { de: 'Not A Slug' } }],
    ['an empty slug map', { slug: {} }],
    ['an unknown key in the slug', { slug: { fr: 'pont' } }],
    ['an unknown key in the body', { slug: { de: 'ok' }, title: { en: 'x' } }],
  ])('[E2.6][AC68] publish with %s answers 400 and the use case is not called', async (_name, body) => {
    let calls = 0
    const app = setup({ publishTour: async () => {
      calls++
      return { ok: false, reason: 'stale' }
    } })

    const response = await send(app, 'POST', `${tour}/publish`, { 'If-Match': '1' }, body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
    expect(calls).toBe(0)
  })

  it('[E2.6] unpublish answers 200 with status draft, and 409 not-published for a draft', async () => {
    const app = setup({ unpublishTour: async (_actor, _storeId, _id, ifMatch) => ifMatch === 1
      ? { ok: false, reason: 'not-published' }
      : { ok: true, value: { ...fakeTour, rowVersion: ifMatch + 1 } } })

    const ok = await send(app, 'POST', `${tour}/unpublish`, { 'If-Match': '2' })
    const refused = await send(app, 'POST', `${tour}/unpublish`, { 'If-Match': '1' })

    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ status: 'draft', rowVersion: 3 })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'not-published' })
  })

  it('[E2.6][AC79] deleting a published tour answers 409, and a draft one 204 with no body', async () => {
    const app = setup({ deleteTour: async (_actor, _storeId, id) => id === tourId
      ? { ok: true, value: { id } }
      : { ok: false, reason: 'published-cannot-be-deleted' } })

    const removed = await send(app, 'DELETE', tour, { 'If-Match': '1' })
    const refused = await send(app, 'DELETE', `${tours}/${photo}`, { 'If-Match': '1' })

    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe('')
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'published-cannot-be-deleted' })
  })

  it('[E2.6] DELETE with no If-Match answers 428, a stale one 412, and the version reaches the use case', async () => {
    const seen: number[] = []
    const app = setup({ deleteTour: async (_actor, _storeId, id, ifMatch) => {
      seen.push(ifMatch)
      return ifMatch === 2 ? { ok: false, reason: 'stale' } : { ok: true, value: { id } }
    } })

    const missing = await send(app, 'DELETE', tour)
    const stale = await send(app, 'DELETE', tour, { 'If-Match': '2' })
    const removed = await send(app, 'DELETE', tour, { 'If-Match': '3' })

    expect(missing.status).toBe(428)
    expect(await missing.json()).toMatchObject({ type: 'precondition-required' })
    expect(stale.status).toBe(412)
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect(removed.status).toBe(204)
    expect(seen).toEqual([2, 3])
  })

  it('[E2.6] AC-6 a retired PDF answers 422 media-retired and nothing is saved', async () => {
    const saved: unknown[] = []
    const app = setup({ saveTour: async (_actor, _storeId, _id, _ifMatch, changes) => {
      // The use case checks the media before it writes; a retired file refuses with nothing saved.
      if (changes.pdfMediaId === photo)
        return { ok: false, reason: 'media-retired' }
      saved.push(changes)
      return { ok: true, value: fakeTour }
    } })

    const response = await send(app, 'PATCH', tour, { 'If-Match': '1' }, { pdfMediaId: photo })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'media-retired' })
    expect(saved).toEqual([])
  })

  it('[E2.6] a use case that finds no tour answers 404 not-found', async () => {
    const response = await send(setup({ publishTour: async () => ({ ok: false, reason: 'not-found' }) }), 'POST', `${tour}/publish`, { 'If-Match': '1' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'not-found' })
  })
})

describe('[E2.6] AC-7 who may write tours', () => {
  const routes = [
    ['POST', tours, {}],
    ['PATCH', tour, {}],
    ['POST', `${tour}/publish`, undefined],
    ['POST', `${tour}/unpublish`, undefined],
    ['DELETE', tour, undefined],
  ] as const

  it.each(routes)('[E2.6] AC-7 the other store\'s owner, a guest and an anonymous caller get 403, 403 and 401 on %s %s', async (method, path, body) => {
    const calls: string[] = []
    const track = (name: string) => async () => {
      calls.push(name)
      return { ok: false, reason: 'not-found' } as const
    }
    const app = setup({
      createTour: track('create'),
      saveTour: track('save'),
      publishTour: track('publish'),
      unpublishTour: track('unpublish'),
      deleteTour: track('delete'),
    })
    const as = (who: Record<string, string>) => app.request(path, { method, headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', 'If-Match': '1', ...who }, body: body ? JSON.stringify(body) : undefined })

    expect((await as(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await as(signedInAs('guest'))).status).toBe(403)
    expect((await as({})).status).toBe(401)
    expect(calls).toEqual([])
  })

  it.each(['owner', 'manager'])('[E2.6] AC-7 the %s of the store reaches the use case', async (who) => {
    const response = await send(setup(), 'POST', tours, signedInAs(who), {})

    expect(response.status).toBe(201)
  })
})
