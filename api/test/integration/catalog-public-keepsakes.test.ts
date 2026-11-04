import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaDirectory } from '../../src/modules/catalog/adapters/media-directory.ts'
import { createPublicKeepsakeReads } from '../../src/modules/catalog/adapters/public-repository.ts'
import { registerPublicKeepsakeRoutes } from '../../src/modules/catalog/adapters/public-routes.ts'
import { makeGetAvailability, makeGetKeepsake, makeListKeepsakes } from '../../src/modules/catalog/index.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { mediaView } from '../../src/modules/content/adapters/media-view.ts'
import { createStockRepository } from '../../src/modules/inventory/adapters/stock-repository.ts'
import { makeStockLevels } from '../../src/modules/inventory/index.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createFakeStorage } from '../support/fake-storage.ts'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

// Sign-ins and writes are slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

// The run has its own database (global-setup.ts), dropped at the end, so the rows this file inserts need no cleanup of
// their own. Every assertion names a keepsake by its id, so the other tests of the file do not disturb it.
const testDatabase = openTestDatabase()
const { pool, db } = testDatabase

afterAll(async () => {
  await pool.end()
})

// The public routes of main.ts: the real reads, the media directory and the inventory stock port (ADR-013).
const storage = createFakeStorage(systemClock)
const contentMedia = createMediaRepository()
const stockRepository = createStockRepository()
const publicDeps = {
  uow: createUnitOfWork(db),
  reads: createPublicKeepsakeReads(),
  media: createMediaDirectory({ findById: (tx: Parameters<typeof contentMedia.findById>[0], storeId: string, id: string) => contentMedia.findById(tx, storeId, id), view: row => mediaView(row, storage.publicUrl) }),
  stockLevels: { levels: makeStockLevels({ stock: stockRepository }) },
}
const publicUseCases = { listKeepsakes: makeListKeepsakes(publicDeps), getKeepsake: makeGetKeepsake(publicDeps), getAvailability: makeGetAvailability(publicDeps) }
const env = createCatalogHttp(testDatabase, { extraRoutes: [app => registerPublicKeepsakeRoutes(app, publicUseCases)] })

const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const sizeOption = { ref: 'size', name: { en: 'Size', de: 'Grösse' }, values: [{ ref: 's', label: { en: 'Small', de: 'Klein' } }, { ref: 'l', label: { en: 'Large', de: 'Gross' } }, { ref: 'x', label: { en: 'XL', de: 'XL' } }] }
const unique = () => randomUUID().slice(0, 8)

interface Made { id: string, slug: { en?: string, de?: string }, skuIds: string[], photos: string[], storeId: string }
interface Variant { value: 's' | 'l' | 'x', price: number, quantity: number, status?: 'published' | 'draft' }

async function setup() {
  const store = await env.storeWithStaff()
  const send = (path: string, method: string, ifMatch?: number, body?: object) => env.call(path, { method, headers: { ...store.owner.headers, ...(ifMatch === undefined ? {} : { 'If-Match': String(ifMatch) }) }, body })

  // A published keepsake of the store with these variants. `languages` says which texts it has.
  async function keepsake(variants: Variant[], options: { languages?: ('en' | 'de')[], publish?: boolean, photos?: number } = {}): Promise<Made> {
    const languages = options.languages ?? ['en', 'de']
    const photos: string[] = []
    for (let index = 0; index < (options.photos ?? 1); index++)
      photos.push(await env.readyPhoto(store.storeId))
    const tag = unique()
    const name = Object.fromEntries(languages.map(l => [l, `${l === 'en' ? 'Knife' : 'Messer'} ${tag}`]))
    const text = Object.fromEntries(languages.map(l => [l, rich(l === 'en' ? 'A red knife.' : 'Ein rotes Messer.')]))
    const created = await send(store.products, 'POST', undefined, {
      name,
      text,
      photoIds: photos,
      options: [sizeOption],
      variants: variants.map(v => ({ skuCode: `PK-${unique()}`, priceRappen: v.price, values: { size: v.value }, quantity: v.quantity })),
    })
    expect(created.status, JSON.stringify(await created.clone().json())).toBe(201)
    const product = await created.json() as { id: string, variants: { id: string }[] }
    // The create flow makes every variant for sale; a hidden one is the same row with another status.
    for (const [index, v] of variants.entries()) {
      if (v.status === 'draft')
        await pool.query(`update catalog.skus set status = 'draft' where id = $1`, [product.variants[index]!.id])
    }
    let slug: Made['slug'] = {}
    if (options.publish ?? true) {
      const published = await send(`${store.products}/${product.id}/publish`, 'POST', 1)
      expect(published.status).toBe(200)
      slug = (await published.json() as { slug: Made['slug'] }).slug
    }
    return { id: product.id, slug, skuIds: product.variants.map(v => v.id), photos, storeId: store.storeId }
  }

  return { ...store, send, keepsake }
}

function keysOf(node: unknown): string[] {
  if (Array.isArray(node))
    return node.flatMap(keysOf)
  if (node !== null && typeof node === 'object')
    return Object.entries(node).flatMap(([key, value]) => [key, ...keysOf(value)])
  return []
}

async function get<B>(path: string) {
  const response = await env.call(path)
  return { status: response.status, headers: response.headers, body: await response.json() as B }
}

interface Card { id: string, slug: string, name: string, soldOut: boolean, cover: { url: string } | null, language: string, fallback: boolean, availableLanguages: string[] }
interface Availability { items: { variantId: string, priceRappen: number, currency: string, available: number }[] }

describe('[E6.4][AC52][AC53] the availability read', () => {
  it('[E6.4][AC52][AC53] AC-2: SKUs of 4, 0 and 7 units show each sold combination with its price and units, the one with 0 shows 0', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 4 }, { value: 'l', price: 4500, quantity: 0 }, { value: 'x', price: 5200, quantity: 7 }])

    const { status, body } = await get<Availability>(`/api/public/keepsakes/${made.slug.en}/availability?lang=en`)

    expect(status).toBe(200)
    expect(body.items).toEqual([
      { variantId: made.skuIds[0], priceRappen: 3900, currency: 'CHF', available: 4 },
      { variantId: made.skuIds[1], priceRappen: 4500, currency: 'CHF', available: 0 },
      { variantId: made.skuIds[2], priceRappen: 5200, currency: 'CHF', available: 7 },
    ])
  })

  it('[E6.4][AC53] units are on hand minus reserved, and a variant that is not for sale is not offered', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 7 }, { value: 'l', price: 4500, quantity: 5, status: 'draft' }])
    // A hold is what reserves units: the trigger on stock_holds keeps `held` (ADR-016).
    await pool.query(`insert into inventory.stock_holds (store_id, sku_id, order_id, order_line_id, quantity) values ($1, $2, $3, $4, 3)`, [s.storeId, made.skuIds[0], randomUUID(), randomUUID()])

    const { body } = await get<Availability>(`/api/public/keepsakes/${made.slug.en}/availability?lang=en`)

    expect(body.items).toEqual([{ variantId: made.skuIds[0], priceRappen: 3900, currency: 'CHF', available: 4 }])
  })

  it('[E6.4] the availability is held for 5 seconds only, and answers a repeat with its tag with a 304', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 2 }])
    const path = `/api/public/keepsakes/${made.slug.en}/availability?lang=en`

    const first = await env.call(path)
    const again = await env.call(path, { headers: { 'If-None-Match': first.headers.get('ETag')! } })

    expect(first.headers.get('Cache-Control')).toBe('max-age=5')
    expect(again.status).toBe(304)
  })
})

describe('[E6.4][AC53] zero stock sells out one combination only', () => {
  it('[E6.4][AC53] AC-3: variant A at 0 and variant B at 4 is not sold out on the list, and only A reads 0 in the availability', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 0 }, { value: 'l', price: 3900, quantity: 4 }])

    const list = await get<{ items: Card[] }>('/api/public/keepsakes?lang=en')
    const availability = await get<Availability>(`/api/public/keepsakes/${made.slug.en}/availability?lang=en`)

    expect(list.body.items.find(i => i.id === made.id)?.soldOut).toBe(false)
    expect(availability.body.items.map(i => [i.variantId, i.available])).toEqual([[made.skuIds[0], 0], [made.skuIds[1], 4]])
  })

  it('[E6.4][AC53] AC-3: every SKU at 0 is sold out on the list, and stock on a hidden variant does not count', async () => {
    const s = await setup()
    const none = await s.keepsake([{ value: 's', price: 3900, quantity: 0 }, { value: 'l', price: 3900, quantity: 0 }])
    const hidden = await s.keepsake([{ value: 's', price: 3900, quantity: 0 }, { value: 'l', price: 3900, quantity: 9, status: 'draft' }])

    const list = await get<{ items: Card[] }>('/api/public/keepsakes?lang=en')

    expect(list.body.items.find(i => i.id === none.id)?.soldOut).toBe(true)
    expect(list.body.items.find(i => i.id === hidden.id)?.soldOut).toBe(true)
  })
})

describe('[E6.4][AC54][AC55] the list and the detail', () => {
  it('[E6.4][AC54][AC55] AC-1 AC-6: carry text, photos in order, options and sold combinations, and no price, stock or engraving', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 4 }, { value: 'l', price: 4500, quantity: 0 }, { value: 'x', price: 5200, quantity: 7, status: 'draft' }], { photos: 2 })

    const list = await env.call('/api/public/keepsakes?lang=en')
    const detail = await env.call(`/api/public/keepsakes/${made.slug.en}?lang=en`)
    const listText = await list.text()
    const detailText = await detail.text()
    const body = JSON.parse(detailText) as { description: unknown, photos: { url: string }[], options: { name: string, values: { label: string }[] }[], variants: { id: string }[], cover: { url: string } }

    // By key, not by text: the list holds the ids and names of every keepsake of the run.
    for (const text of [listText, detailText])
      expect(keysOf(JSON.parse(text)).filter(key => /price|amount|currency|rappen|engrav|onHand|reserved|^available$|stock/i.test(key))).toEqual([])
    expect(body.description).toEqual(rich('A red knife.'))
    expect(body.photos.map(p => p.url)).toEqual(made.photos.map(id => expect.stringContaining(id)))
    expect(body.cover.url).toBe(body.photos[0]!.url)
    expect(body.options).toMatchObject([{ name: 'Size', values: [{ label: 'Small' }, { label: 'Large' }, { label: 'XL' }] }])
    expect(body.variants.map(v => v.id)).toEqual([made.skuIds[0], made.skuIds[1]])
    expect((JSON.parse(listText) as { items: Card[] }).items.find(i => i.id === made.id)).toMatchObject({ slug: made.slug.en, name: expect.stringContaining('Knife'), soldOut: false })
    expect(list.headers.get('Cache-Control')).toBe('max-age=30')
    expect(detail.headers.get('ETag')).toMatch(/^"[0-9a-f]{64}"$/)
  })
})

describe('[E6.4][AC31] unpublished and archived keepsakes are invisible', () => {
  it('[E6.4][AC31] AC-4: an unpublished keepsake and an archived one are not listed and each slug answers 404, on the detail and the availability', async () => {
    const s = await setup()
    const live = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }])
    const unpublished = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }])
    const archived = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }])
    const draft = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }], { publish: false })
    expect((await s.send(`${s.products}/${unpublished.id}/unpublish`, 'POST', 2)).status).toBe(200)
    await pool.query(`update catalog.products set status = 'archived' where id = $1`, [archived.id])

    const list = await get<{ items: Card[] }>('/api/public/keepsakes?lang=en')

    expect(list.body.items.map(i => i.id)).toContain(live.id)
    for (const gone of [unpublished, archived, draft])
      expect(list.body.items.map(i => i.id)).not.toContain(gone.id)
    for (const gone of [unpublished, archived]) {
      for (const suffix of ['', '/availability']) {
        const response = await env.call(`/api/public/keepsakes/${gone.slug.en ?? 'x'}${suffix}?lang=en`)
        expect(response.status, `${gone.id}${suffix}`).toBe(404)
        expect(response.headers.get('Content-Type')).toBe('application/problem+json')
      }
    }
    expect((await env.call(`/api/public/keepsakes/no-such-keepsake?lang=en`)).status).toBe(404)
    expect((await env.call(`/api/public/keepsakes/${live.slug.en}?lang=en`)).status).toBe(200)
  })

  it('[E6.4][AC31] AC-4: a keepsake that is unpublished and published again is back with the same slug', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }])
    await s.send(`${s.products}/${made.id}/unpublish`, 'POST', 2)
    expect((await env.call(`/api/public/keepsakes/${made.slug.en}?lang=en`)).status).toBe(404)

    await s.send(`${s.products}/${made.id}/publish`, 'POST', 3)

    expect((await env.call(`/api/public/keepsakes/${made.slug.en}?lang=en`)).status).toBe(200)
  })
})

describe('[E6.4][AC64] language fallback and the other slug', () => {
  it('[E6.4][AC64] AC-5: a keepsake published in English only, asked for in German, comes back in English with a fallback notice and no German slug', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }], { languages: ['en'] })

    const detail = await get<Card & { otherSlug: string | null }>(`/api/public/keepsakes/${made.slug.en}?lang=de`)
    const list = await get<{ items: Card[] }>('/api/public/keepsakes?lang=de')

    expect(made.slug.de).toBeUndefined()
    expect(detail.body).toMatchObject({ language: 'en', fallback: true, availableLanguages: ['en'], otherSlug: null, slug: made.slug.en })
    expect(list.body.items.find(i => i.id === made.id)).toMatchObject({ language: 'en', fallback: true, slug: made.slug.en })
  })

  it('[E6.4][AC64] AC-5: with both languages and different slugs, the English read names the German slug, and either slug opens the keepsake', async () => {
    const s = await setup()
    const made = await s.keepsake([{ value: 's', price: 3900, quantity: 1 }])

    const english = await get<Card & { otherSlug: string, description: unknown }>(`/api/public/keepsakes/${made.slug.en}?lang=en`)
    const german = await get<Card & { otherSlug: string, description: unknown }>(`/api/public/keepsakes/${made.slug.de}?lang=de`)
    const crossed = await get<Card>(`/api/public/keepsakes/${made.slug.de}?lang=en`)

    expect(made.slug.en).not.toBe(made.slug.de)
    expect(english.body).toMatchObject({ language: 'en', fallback: false, otherSlug: made.slug.de, availableLanguages: ['en', 'de'], name: expect.stringContaining('Knife') })
    expect(german.body).toMatchObject({ language: 'de', slug: made.slug.de, otherSlug: made.slug.en, name: expect.stringContaining('Messer'), description: rich('Ein rotes Messer.') })
    expect(crossed.body).toMatchObject({ language: 'en', fallback: false, slug: made.slug.en })
  })
})
