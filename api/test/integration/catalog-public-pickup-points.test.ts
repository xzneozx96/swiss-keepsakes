import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaDirectory } from '../../src/modules/catalog/adapters/media-directory.ts'
import { createPickupRepository } from '../../src/modules/catalog/adapters/pickup-repository.ts'
import { createPublicKeepsakeReads } from '../../src/modules/catalog/adapters/public-repository.ts'
import { registerPublicKeepsakeRoutes } from '../../src/modules/catalog/adapters/public-routes.ts'
import { makeGetAvailability, makeGetKeepsake, makeGetPickupPoints, makeListKeepsakes } from '../../src/modules/catalog/index.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { mediaView } from '../../src/modules/content/adapters/media-view.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createFakeStorage } from '../support/fake-storage.ts'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool, db } = testDatabase

afterAll(async () => {
  await pool.end()
})

// The public routes of main.ts: the real reads and the pickup repository (ADR-013, the catalog's own tables).
const storage = createFakeStorage(systemClock)
const contentMedia = createMediaRepository()
const publicDeps = {
  uow: createUnitOfWork(db),
  reads: createPublicKeepsakeReads(),
  media: createMediaDirectory({ findMany: (tx: Parameters<typeof contentMedia.findById>[0], storeId: string, ids: string[]) => contentMedia.findMany(tx, storeId, ids), view: row => mediaView(row, storage.publicUrl) }),
  storeNames: { find: async () => new Map<string, string>() },
  pickups: createPickupRepository(),
}
const publicUseCases = { listKeepsakes: makeListKeepsakes(publicDeps), getKeepsake: makeGetKeepsake(publicDeps), getAvailability: makeGetAvailability(publicDeps), getPickupPoints: makeGetPickupPoints(publicDeps) }
const env = createCatalogHttp(testDatabase, { extraRoutes: [app => registerPublicKeepsakeRoutes(app, publicUseCases)] })

const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const unique = () => randomUUID().slice(0, 8)
const link = (name: string) => `https://www.google.com/maps/place/${name}/@47.0507,8.3068,17z`

interface Point { id: string, name: string, address: string, instructions: string | null, mapsUrl: string, hours: { weekday: number, opens: string, closes: string }[] }

async function setup() {
  const store = await env.storeWithStaff()
  const send = (path: string, method: string, ifMatch?: number, body?: object) => env.call(path, { method, headers: { ...store.owner.headers, ...(ifMatch === undefined ? {} : { 'If-Match': String(ifMatch) }) }, body })
  const places = `/api/store/${store.storeId}/pickup-places`

  async function keepsake(publish = true) {
    const photo = await env.readyPhoto(store.storeId)
    const tag = unique()
    const created = await send(store.products, 'POST', undefined, {
      name: { en: `Knife ${tag}`, de: `Messer ${tag}` },
      text: { en: rich('A red knife.'), de: rich('Ein rotes Messer.') },
      photoIds: [photo],
      options: [],
      variants: [{ skuCode: `PK-${unique()}`, priceRappen: 3900, values: {}, quantity: 3 }],
    })
    expect(created.status, JSON.stringify(await created.clone().json())).toBe(201)
    const product = await created.json() as { id: string }
    if (!publish)
      return { id: product.id, slug: { en: undefined as string | undefined } }
    const published = await send(`${store.products}/${product.id}/publish`, 'POST', 1)
    expect(published.status).toBe(200)
    return { id: product.id, slug: (await published.json() as { slug: { en?: string, de?: string } }).slug }
  }

  async function place(body: { name: { en?: string, de?: string }, hours?: object[], instructions?: object }) {
    const response = await send(places, 'POST', undefined, { address: { en: 'Hertensteinstrasse 1', de: 'Hertensteinstrasse 1 (DE)' }, mapsLink: link(unique()), hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }], ...body })
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(201)
    return await response.json() as { id: string }
  }

  return { ...store, send, places, keepsake, place }
}

async function get(path: string) {
  const response = await env.call(path)
  return { status: response.status, headers: response.headers, text: await response.text() }
}

describe('[E6.4][AC26][AC64] the public pickup points read', () => {
  it('[E6.4][AC26] AC-1: 3 active points and 1 archived one: the 3 come back in the merchant\'s order with nothing internal', async () => {
    const s = await setup()
    const made = await s.keepsake()
    const first = await s.place({ name: { en: 'First shop', de: 'Erster Laden' }, instructions: { en: 'Ring the bell' } })
    const second = await s.place({ name: { en: 'Second shop' }, hours: [{ weekday: 5, opens: '22:00', closes: '02:00' }] })
    const archived = await s.place({ name: { en: 'Closed shop' } })
    const third = await s.place({ name: { en: 'Third shop' } })
    expect((await s.send(`${s.places}/${archived.id}/archive`, 'POST', 1)).status).toBe(200)
    // The merchant reorders: third, first, second.
    expect((await s.send(`${s.places}/order`, 'PUT', undefined, { ids: [third.id, first.id, second.id] })).status).toBe(200)

    const { status, headers, text } = await get(`/api/public/keepsakes/${made.slug.en}/pickup-points?lang=en`)

    expect(status).toBe(200)
    expect(headers.get('Cache-Control')).toBe('max-age=30')
    const body = JSON.parse(text) as { items: Point[] }
    expect(body.items.map(item => item.id)).toEqual([third.id, first.id, second.id])
    expect(body.items.map(item => item.name)).toEqual(['Third shop', 'First shop', 'Second shop'])
    expect(body.items[1]).toMatchObject({ address: 'Hertensteinstrasse 1', instructions: 'Ring the bell', hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] })
    expect(body.items[1]!.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/place\//)
    expect(body.items[2]!.hours).toEqual([{ weekday: 5, opens: '22:00', closes: '02:00' }])
    expect(body.items[0]!.instructions).toBeNull()
    expect(text).not.toContain(s.storeId)
    expect(text).not.toContain(archived.id)
    expect(text).not.toMatch(/latitude|longitude|position|archived|rowVersion|storeId/i)
    expect(Object.keys(body.items[0]!).sort()).toEqual(['address', 'hours', 'id', 'instructions', 'mapsUrl', 'name'])
  })

  it('[E6.4][AC64] AC-2: a point with an English name only, asked in German, comes back in English', async () => {
    const s = await setup()
    const made = await s.keepsake()
    await s.place({ name: { en: 'English only shop' } })

    const { status, text } = await get(`/api/public/keepsakes/${made.slug.en}/pickup-points?lang=de`)

    expect(status).toBe(200)
    expect((JSON.parse(text) as { items: Point[] }).items.map(item => item.name)).toEqual(['English only shop'])
  })

  it('[E6.4][AC64] AC-2: an unpublished keepsake, an archived one and an unknown slug are a 404 problem', async () => {
    const s = await setup()
    await s.keepsake(false)
    await s.place({ name: { en: 'Some shop' } })
    const published = await s.keepsake()
    expect((await s.send(`${s.products}/${published.id}/unpublish`, 'POST', 2)).status).toBe(200)
    // Archived, as the public keepsake test does it: the status is set directly, the merchant API has no archive for a keepsake here.
    const archived = await s.keepsake()
    await pool.query(`update catalog.products set status = 'archived' where id = $1`, [archived.id])

    // A draft has no slug to ask for, so the cases are an unpublished keepsake, an archived one and an unknown slug.
    for (const slug of [published.slug.en, archived.slug.en, `nothing-${unique()}`]) {
      const response = await get(`/api/public/keepsakes/${slug}/pickup-points?lang=en`)
      expect(response.status, String(slug)).toBe(404)
      expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    }
  })

  it('[E6.4][AC26] a store with no point answers an empty list', async () => {
    const s = await setup()
    const made = await s.keepsake()

    const { status, text } = await get(`/api/public/keepsakes/${made.slug.en}/pickup-points?lang=en`)

    expect(status).toBe(200)
    expect(JSON.parse(text)).toEqual({ items: [] })
  })
})
