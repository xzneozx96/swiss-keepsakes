import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import type { MediaListQuery } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases, fakeMedia } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  return createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] }).app
}

const base = `/api/store/${lucerne}/media`
const headers = (who = 'owner') => ({ 'Origin': shopOrigin, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...signedInAs(who) })
function send(app: ReturnType<typeof setup>, method: string, path: string, body?: unknown, who = 'owner') {
  return app.request(`${base}${path}`, { method, headers: method === 'GET' ? signedInAs(who) : headers(who), body: body === undefined ? undefined : JSON.stringify(body) })
}

describe('[E4.11][AC51] GET /media', () => {
  it('[E4.11][AC51] parses the filters into the query the use case gets, and answers the page with its counts', async () => {
    const seen: MediaListQuery[] = []
    const app = setup({ listMedia: async (_actor, _store, query) => {
      seen.push(query)
      return { ok: true, value: { rows: [{ ...fakeMedia, status: 'ready', width: 1500, height: 1000, usage: { pages: 3, published: 2, drafts: 1 } }], total: 31, kinds: { image: 31, audio: 2, pdf: 1 }, uses: { unused: 4, drafts: 5, published: 22 }, statuses: { processing: 0, ready: 30, retired: 1 } } }
    } })

    const response = await send(app, 'GET', '?kind=image&q=sunrise&use=unused,drafts&status=ready&page=2&pageSize=24')

    expect(response.status).toBe(200)
    expect(seen).toEqual([{ kind: 'image', q: 'sunrise', use: ['unused', 'drafts'], status: ['ready'], page: 2, pageSize: 24 }])
    expect(await response.json()).toMatchObject({
      total: 31,
      page: 2,
      pageSize: 24,
      kinds: { image: 31, audio: 2, pdf: 1 },
      uses: { unused: 4, drafts: 5, published: 22 },
      statuses: { ready: 30, retired: 1 },
      items: [{ id: fakeMedia.id, name: 'file.jpg', fileName: 'file.jpg', version: 1, usage: { pages: 3, published: 2, drafts: 1 }, publicUrl: expect.stringContaining('/media/') }],
    })
  })

  it('[E4.11][AC51] defaults to the photos, ten to a page', async () => {
    const seen: MediaListQuery[] = []
    const app = setup({ listMedia: async (_actor, _store, query) => {
      seen.push(query)
      return { ok: true, value: { rows: [], total: 0, kinds: { image: 0, audio: 0, pdf: 0 }, uses: { unused: 0, drafts: 0, published: 0 }, statuses: { processing: 0, ready: 0, retired: 0 } } }
    } })
    expect((await send(app, 'GET', '')).status).toBe(200)
    expect(seen).toEqual([{ kind: 'image', use: [], status: [], page: 1, pageSize: 10 }])
  })

  it.each(['?kind=video', '?use=never', '?status=gone', '?pageSize=500', '?page=0'])('[E4.11][AC51] %s is 400', async (query) => {
    expect((await send(setup(), 'GET', query)).status).toBe(400)
  })

  it('[E4.11][AC51] a guest is 401 and staff of another store 403', async () => {
    expect((await setup().request(base)).status).toBe(401)
    expect((await send(setup(), 'GET', '', undefined, 'ownerElsewhere')).status).toBe(403)
  })
})

describe('[E4.11][AC51] PATCH /media/{id}', () => {
  it('[E4.11][AC51] sets the name and description and answers the file', async () => {
    const seen: unknown[] = []
    const app = setup({ describeMedia: async (_actor, _store, id, changes) => {
      seen.push([id, changes])
      return { ok: true, value: { ...fakeMedia, id, name: changes.name ?? 'x', alt: changes.alt ?? {} } }
    } })
    const response = await send(app, 'PATCH', `/${mediaId}`, { name: '  Bridge at dawn ', alt: { en: 'The bridge' } })
    expect(response.status).toBe(200)
    expect(seen).toEqual([[mediaId, { name: 'Bridge at dawn', alt: { en: 'The bridge' } }]])
    expect(await response.json()).toMatchObject({ name: 'Bridge at dawn', alt: { en: 'The bridge' } })
  })

  it.each([{ name: '' }, { name: '   ' }, {}, { name: 'a', price: 1 }])('[E4.11][AC51] the body %j is 400 and the use case is not called', async (body) => {
    let calls = 0
    const app = setup({ describeMedia: async () => {
      calls++
      return { ok: false, reason: 'not-found' }
    } })
    const response = await send(app, 'PATCH', `/${mediaId}`, body)
    expect(response.status).toBe(400)
    expect(calls).toBe(0)
  })

  it('[E4.11][AC51] a blank name says what to do', async () => {
    const response = await send(setup(), 'PATCH', `/${mediaId}`, { name: '' })
    expect(JSON.stringify(await response.json())).toContain('Give the file a name.')
  })

  it('[E4.11][AC51] a retired file is 409 media-already-retired', async () => {
    const app = setup({ describeMedia: async () => ({ ok: false, reason: 'media-already-retired' }) })
    const response = await send(app, 'PATCH', `/${mediaId}`, { name: 'x' })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'media-already-retired' })
  })
})

describe('[E4.11][AC51] POST /media/{id}/replace', () => {
  it('[E4.11][AC51] answers the file at its next version', async () => {
    const response = await send(setup(), 'POST', `/${mediaId}/replace`, { uploadKey: `${lucerne}/k.jpg`, fileName: 'sunrise.jpg' })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: mediaId, version: 2 })
  })

  it.each([
    ['media-kind-mismatch', 422],
    ['media-not-ready', 409],
    ['media-already-retired', 409],
    ['media-too-large', 422],
  ] as const)('[E4.11][AC51] %s is %i', async (type, status) => {
    const reason = type === 'media-too-large' ? 'too-large' : type
    const app = setup({ replaceMedia: async () => ({ ok: false, reason }) })
    const response = await send(app, 'POST', `/${mediaId}/replace`, { uploadKey: 'k' })
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ type })
  })
})

describe('[E4.11][AC51] POST /media/{id}/retire', () => {
  it('[E4.11][AC51] a file in use is 409 media-in-use with the page count', async () => {
    const app = setup({ retireLibraryMedia: async () => ({ ok: false, reason: 'media-in-use', pages: 3 }) })
    const response = await send(app, 'POST', `/${mediaId}/retire`)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'media-in-use', pages: 3 })
  })

  it('[E4.11][AC51] a retire the database refuses (a page took the file a moment ago) is media-in-use too', async () => {
    const app = setup({ retireLibraryMedia: async () => ({ ok: false, reason: 'in-use' }) })
    const response = await send(app, 'POST', `/${mediaId}/retire`)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'media-in-use' })
  })

  it('[E4.11][AC51] a retired file is answered with its status', async () => {
    const response = await send(setup(), 'POST', `/${mediaId}/retire`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: mediaId, status: 'retired' })
  })

  it('[E4.11][AC51] a guest is 401 and staff of another store 403', async () => {
    expect((await send(setup(), 'POST', `/${mediaId}/retire`, undefined, 'guest')).status).toBe(403)
    expect((await send(setup(), 'POST', `/${mediaId}/retire`, undefined, 'ownerElsewhere')).status).toBe(403)
  })
})

describe('[E4.11][AC51] GET /media/{id}/uses', () => {
  it('[E4.11][AC51] answers the published and draft pages with thumbnails', async () => {
    const app = setup({ getMediaUses: async () => ({ ok: true, value: {
      published: [{ pageKind: 'story', pageId: mediaId, language: 'en', title: { en: 'Lucerne in a day' }, role: 'cover', published: true, thumbnailMediaId: fakeMedia.id }],
      drafts: [{ pageKind: 'keepsake', pageId: mediaId, language: null, title: { en: 'Fondue set' }, role: 'photo', published: false, thumbnailMediaId: null }],
      thumbnails: new Map([[fakeMedia.id, { storageKey: 'k/original.jpg', width: 1500 }]]),
    } }) })
    const response = await send(app, 'GET', `/${mediaId}/uses`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      published: [{ pageKind: 'story', language: 'en', role: 'cover', thumbnailUrl: expect.stringContaining('k/w320.webp') }],
      drafts: [{ pageKind: 'keepsake', title: { en: 'Fondue set' }, thumbnailUrl: null }],
    })
  })
})

describe('[E4.11][AC51] every library route checks who asks', () => {
  const routes = [
    ['GET', ''],
    ['GET', `/${mediaId}/uses`],
    ['PATCH', `/${mediaId}`],
    ['POST', `/${mediaId}/replace`],
    ['POST', `/${mediaId}/retire`],
  ] as const
  const bodies: Record<string, unknown> = { PATCH: { name: 'x' }, POST: { uploadKey: 'k' } }

  it.each(routes)('[E4.11][AC51] %s %s: a guest and staff of another store are 403', async (method, path) => {
    expect((await send(setup(), method, path, bodies[method], 'guest')).status).toBe(403)
    expect((await send(setup(), method, path, bodies[method], 'ownerElsewhere')).status).toBe(403)
  })

  it.each(routes)('[E4.11][AC51] %s %s: a request with no session is 401', async (method, path) => {
    const noSession = { 'Origin': shopOrigin, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }
    const response = await setup().request(`${base}${path}`, { method, headers: noSession, body: method === 'GET' ? undefined : JSON.stringify(bodies[method]) })
    expect(response.status).toBe(401)
  })
})
