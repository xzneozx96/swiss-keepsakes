import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { StorageUnavailableError } from '../../../src/modules/content/ports.ts'
import { createFakeContentUseCases } from '../../support/fake-content-use-cases.ts'
import { mediaDefaults } from '../../support/fake-media.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  return createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] }).app
}

const uploads = `/api/store/${lucerne}/media/uploads`

function post(app: ReturnType<typeof setup>, body: unknown, headers: Record<string, string> = signedInAs('owner')) {
  return app.request(uploads, { method: 'POST', headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
}

const jpeg = { contentType: 'image/jpeg', byteSize: 2_097_152 }

describe('[E2.7] POST /api/store/{storeId}/media/uploads', () => {
  it('[E2.7] answers 200 with the grant, and the use case gets the verified store and the body', async () => {
    const seen: unknown[] = []
    const app = setup({ requestUpload: async (_actor, storeId, input) => {
      seen.push([storeId, input])
      return { ok: true, value: { uploadKey: `${storeId}/k.jpg`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-28T10:15:00.000Z', kind: 'image' } }
    } })

    const response = await post(app, jpeg)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ uploadKey: `${lucerne}/k.jpg`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-28T10:15:00.000Z', kind: 'image' })
    expect(seen).toEqual([[lucerne, jpeg]])
  })

  it('[E2.7] a guest is 401 and staff of another store is 403, and the use case is not called', async () => {
    let calls = 0
    const app = setup({ requestUpload: async () => {
      calls++
      return { ok: false, reason: 'forbidden' }
    } })

    expect((await post(app, jpeg, {})).status).toBe(401)
    expect((await post(app, jpeg, signedInAs('guest'))).status).toBe(403)
    expect((await post(app, jpeg, signedInAs('ownerElsewhere'))).status).toBe(403)
    expect(calls).toBe(0)
  })

  it('[E2.7] an SVG is 422 media-type-not-allowed, an oversize file 422 media-too-large', async () => {
    const app = setup({ requestUpload: async (_a, _s, input) => ({ ok: false, reason: input.contentType === 'image/svg+xml' ? 'type-not-allowed' : 'too-large' }) })

    const svg = await post(app, { contentType: 'image/svg+xml', byteSize: 100 })
    const big = await post(app, { contentType: 'image/png', byteSize: 99_999_999 })

    expect(svg.status).toBe(422)
    expect(await svg.json()).toMatchObject({ type: 'media-type-not-allowed' })
    expect(big.status).toBe(422)
    expect(await big.json()).toMatchObject({ type: 'media-too-large' })
  })

  it.each([
    [{ contentType: 'image/jpeg', byteSize: 0 }],
    [{ contentType: 'image/jpeg', byteSize: 1.5 }],
    [{ contentType: 'image/jpeg', byteSize: -1 }],
    [{ contentType: 'image/jpeg' }],
    [{ byteSize: 10 }],
    [{ ...jpeg, extra: true }],
  ])('[E2.7] the body %j is 400 validation-failed', async (body) => {
    const response = await post(setup(), body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
  })

  it('[E2.7] unconfigured or unreachable storage is 503 storage-unavailable', async () => {
    const app = setup({ requestUpload: async () => {
      throw new StorageUnavailableError('down')
    } })

    const response = await post(app, jpeg)

    expect(response.status).toBe(503)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'storage-unavailable', status: 503 })
  })
})

const confirmPath = `/api/store/${lucerne}/media/confirm`
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'

const processing = { ...mediaDefaults, id: mediaId, storeId: lucerne, kind: 'image', storageKey: `${lucerne}/${mediaId}/original.jpg`, contentType: 'image/jpeg', byteSize: 1000, sha256: 'a'.repeat(64), width: null, height: null, status: 'processing' } as const

function confirm(app: ReturnType<typeof setup>, body: unknown, headers: Record<string, string> = signedInAs('owner')) {
  return app.request(confirmPath, { method: 'POST', headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
}

describe('[E2.7] POST /api/store/{storeId}/media/confirm', () => {
  it('[E2.7] answers 201 with the processing media, and the use case gets the verified store and the key', async () => {
    const seen: unknown[] = []
    const app = setup({ confirmUpload: async (_actor, storeId, input) => {
      seen.push([storeId, input])
      return { ok: true, value: processing }
    } })

    const response = await confirm(app, { uploadKey: `${lucerne}/k.jpg` })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: mediaId, kind: 'image', status: 'processing', contentType: 'image/jpeg', byteSize: 1000, width: null, height: null, publicUrl: null, variants: [] })
    expect(seen).toEqual([[lucerne, { uploadKey: `${lucerne}/k.jpg` }]])
  })

  it('[E2.7] a guest is 401, staff of another store 403, and the use case is not called', async () => {
    let calls = 0
    const app = setup({ confirmUpload: async () => {
      calls++
      return { ok: false, reason: 'forbidden' }
    } })

    expect((await confirm(app, { uploadKey: 'k' }, {})).status).toBe(401)
    expect((await confirm(app, { uploadKey: 'k' }, signedInAs('guest'))).status).toBe(403)
    expect((await confirm(app, { uploadKey: 'k' }, signedInAs('ownerElsewhere'))).status).toBe(403)
    expect(calls).toBe(0)
  })

  it('[E2.7] a type mismatch is 422, a missing upload is 404 upload-missing', async () => {
    const mismatch = await confirm(setup({ confirmUpload: async () => ({ ok: false, reason: 'content-mismatch' }) }), { uploadKey: 'k' })
    const missing = await confirm(setup({ confirmUpload: async () => ({ ok: false, reason: 'upload-missing' }) }), { uploadKey: 'k' })

    expect(mismatch.status).toBe(422)
    expect(await mismatch.json()).toMatchObject({ type: 'media-content-mismatch' })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ type: 'upload-missing' })
  })

  it.each([
    [{}],
    [{ uploadKey: '' }],
    [{ uploadKey: 5 }],
    [{ uploadKey: 'k', extra: true }],
  ])('[E2.7] the body %j is 400 validation-failed', async (body) => {
    const response = await confirm(setup(), body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
  })

  it('[E2.7] unconfigured or unreachable storage is 503 storage-unavailable', async () => {
    const app = setup({ confirmUpload: async () => {
      throw new StorageUnavailableError('down')
    } })

    const response = await confirm(app, { uploadKey: 'k' })

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ type: 'storage-unavailable', status: 503 })
  })
})

const readPath = (id: string, store = lucerne) => `/api/store/${store}/media/${id}`

function read(app: ReturnType<typeof setup>, id: string, headers: Record<string, string> = signedInAs('owner')) {
  return app.request(readPath(id), { headers })
}

const ready = { ...processing, status: 'ready', width: 1500, height: 1000 } as const

describe('[E2.7] GET /api/store/{storeId}/media/{mediaId}', () => {
  it('[E2.7] a ready image is 200 with its URL and variants', async () => {
    const app = setup({ getMedia: async () => ({ ok: true, value: ready }) })

    const response = await read(app, mediaId)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: mediaId, status: 'ready', width: 1500, publicUrl: expect.stringContaining(`/media/${lucerne}/${mediaId}/original.jpg`), variants: [{ width: 320 }, { width: 640 }, { width: 1280 }] })
  })

  it('[E2.7] a processing row is 200 even when the storage is not configured', async () => {
    const app = setup({
      getMedia: async () => ({ ok: true, value: processing }),
      publicUrl: () => {
        throw new StorageUnavailableError('not configured')
      },
    })

    const response = await read(app, mediaId)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'processing', publicUrl: null, variants: [] })
  })

  it('[E2.7] a ready row is 503 when the storage cannot give its URL', async () => {
    const app = setup({
      getMedia: async () => ({ ok: true, value: ready }),
      publicUrl: () => {
        throw new StorageUnavailableError('not configured')
      },
    })

    const response = await read(app, mediaId)

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ type: 'storage-unavailable' })
  })

  it('[E2.7] a row of another store is 404, a guest 401, staff of another store 403', async () => {
    const app = setup({ getMedia: async () => ({ ok: false, reason: 'not-found' }) })

    expect((await read(app, mediaId)).status).toBe(404)
    expect((await read(app, mediaId, {})).status).toBe(401)
    expect((await read(app, mediaId, signedInAs('ownerElsewhere'))).status).toBe(403)
  })

  it('[E2.7] an id that is not a UUID is 400', async () => {
    expect((await read(setup(), 'nope')).status).toBe(400)
  })
})
