import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool } = testDatabase

afterAll(async () => {
  await pool.end()
})

const env = createCatalogHttp(testDatabase)

const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface View {
  id: string
  status: 'draft' | 'published'
  name: { en?: string, de?: string }
  text: { en?: string, de?: string }
  photos: { id: string, publicUrl: string | null }[]
  slug: { en?: string, de?: string } | null
  hasUnpublishedEdits: boolean
  commissionRate: number
  variants: { id: string, skuCode: string, priceRappen: number, status: string }[]
  blocking: { code: string }[]
  warnings: { code: string }[]
  rowVersion: number
}

// One store for the tests that need none of their own: each sign-in costs seconds against a Neon branch.
let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined

async function setup(options: { fresh?: boolean } = {}) {
  const store = await (options.fresh ? env.storeWithStaff() : (sharedStore ??= env.storeWithStaff()))
  const photo = await env.readyPhoto(store.storeId)
  const create = async (body: object = {}) => env.call(store.products, {
    method: 'POST',
    headers: store.owner.headers,
    body: { name: { en: 'Victorinox Classic' }, text: { en: 'A Swiss knife.' }, photoIds: [photo], variants: [{ skuCode: code(), priceRappen: 3900 }], ...body },
  })
  const created = async (body: object = {}) => {
    const response = await create(body)
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const patch = (id: string, ifMatch: string | number | null, body: object, headers = store.owner.headers) =>
    env.call(`${store.products}/${id}`, { method: 'PATCH', headers: { ...headers, ...(ifMatch === null ? {} : { 'If-Match': String(ifMatch) }) }, body })
  const act = (id: string, action: 'publish' | 'unpublish', ifMatch: number) =>
    env.call(`${store.products}/${id}/${action}`, { method: 'POST', headers: { ...store.owner.headers, 'If-Match': String(ifMatch) } })
  return { ...store, photo, create, created, patch, act, call: env.call, readyPhoto: env.readyPhoto }
}

describe('[E6.1] creating a keepsake', () => {
  it('[E6.1][create] makes a draft with one variant for sale, version 1, and the photo as the cover', async () => {
    const { created, photo } = await setup()

    const product = await created({ commissionRate: 0.1 })

    expect(product).toMatchObject({
      status: 'draft',
      name: { en: 'Victorinox Classic' },
      text: { en: 'A Swiss knife.' },
      commissionRate: 0.1,
      hasUnpublishedEdits: false,
      rowVersion: 1,
      slug: null,
    })
    expect(product.variants).toEqual([expect.objectContaining({ priceRappen: 3900, status: 'published' })])
    expect(product.photos).toEqual([expect.objectContaining({ id: photo, publicUrl: expect.stringContaining('/original.jpg') })])
    expect(product.blocking).toEqual([])
  })

  it('[E6.1][create] a manager may create, an outsider may not, and another store never sees it', async () => {
    const a = await setup()
    const b = await setup({ fresh: true })
    const product = await a.created()

    const manager = await env.call(a.products, { method: 'POST', headers: a.manager.headers, body: { name: { de: 'Messer' }, variants: [{ skuCode: code(), priceRappen: 100 }] } })
    const outsider = await env.call(a.products, { method: 'POST', headers: b.owner.headers, body: { name: { en: 'x' }, variants: [{ skuCode: code(), priceRappen: 100 }] } })
    const other = await env.call(`${b.products}/${product.id}`, { headers: b.owner.headers })

    expect(manager.status).toBe(201)
    expect(outsider.status).toBe(403)
    expect(other.status).toBe(404)
  })

  it('[E6.1][create] needs a name in one language', async () => {
    const { create } = await setup()

    const empty = await create({ name: {} })
    const body = await empty.json() as { type: string, errors: { path: string }[] }

    expect(empty.status).toBe(422)
    expect(body).toMatchObject({ type: 'validation-failed', errors: [{ path: 'name' }] })
  })

  it('[E6.1][create] refuses a SKU code that is not letters and digits, and one the shop already uses', async () => {
    const { create, created } = await setup()
    const taken = code()
    await created({ variants: [{ skuCode: taken, priceRappen: 100 }] })

    const invalid = await create({ variants: [{ skuCode: 'bad code', priceRappen: 100 }] })
    const duplicate = await create({ variants: [{ skuCode: taken, priceRappen: 100 }] })

    expect(invalid.status).toBe(422)
    expect(await invalid.json()).toMatchObject({ errors: [{ path: 'variants.0.skuCode' }] })
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ type: 'sku-code-taken' })
  })

  it('[E6.1][create] refuses a price of 0, two variants, a missing variant and a photo of another store', async () => {
    const { create } = await setup()
    const other = await setup({ fresh: true })

    expect((await create({ variants: [{ skuCode: code(), priceRappen: 0 }] })).status).toBe(400)
    expect((await create({ variants: [{ skuCode: code(), priceRappen: 1 }, { skuCode: code(), priceRappen: 1 }] })).status).toBe(400)
    expect((await create({ variants: [] })).status).toBe(400)
    const foreign = await create({ photoIds: [other.photo] })
    expect(foreign.status).toBe(422)
    expect(await foreign.json()).toMatchObject({ type: 'media-invalid' })
  })

  it('[E6.1][AC55] a body with an engraving, a deposit or a sub-category is refused', async () => {
    const { create } = await setup()

    for (const extra of [{ engraving: 'Anna' }, { deposit: 10 }, { subcategoryId: randomUUID() }, { paymentDeadlineHours: 24 }])
      expect((await create(extra)).status).toBe(400)
  })
})

describe('[E6.1][412] the autosave', () => {
  it('[E6.1][412] saves with the returned ETag, refuses an old version with 412 and no header with 428', async () => {
    const { created, patch } = await setup()
    const product = await created()

    const saved = await patch(product.id, 1, { name: { en: 'Classic SD' } })
    const stale = await patch(product.id, 1, { name: { en: 'Lost edit' } })
    const missing = await patch(product.id, null, { name: { en: 'No header' } })
    const invalid = await patch(product.id, 'abc', { name: { en: 'Bad header' } })

    expect(saved.status).toBe(200)
    expect(saved.headers.get('ETag')).toBe('"2"')
    expect(await saved.json()).toMatchObject({ name: { en: 'Classic SD' }, rowVersion: 2 })
    expect(stale.status).toBe(412)
    expect(stale.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect(missing.status).toBe(428)
    expect(invalid.status).toBe(400)
    const { rows } = await pool.query<{ draft: { name: { en: string } }, row_version: number }>('select draft, row_version from catalog.products where id = $1', [product.id])
    expect(rows[0]).toMatchObject({ draft: { name: { en: 'Classic SD' } }, row_version: 2 })
  })

  it('[E6.1][412] two sessions: the one that saved second is refused and nothing of it is written', async () => {
    const { created, patch } = await setup()
    const product = await created()

    const [first, second] = await Promise.all([patch(product.id, 1, { text: { en: 'First' } }), patch(product.id, 1, { text: { en: 'Second' } })])

    expect([first.status, second.status].sort()).toEqual([200, 412])
  })

  it('[E6.1][autosave] replaces the name, the text and the photos, and saves the commission live', async () => {
    const { created, patch, readyPhoto, storeId, photo } = await setup()
    const product = await created()
    const second = await readyPhoto(storeId)

    const saved = await (await patch(product.id, 1, { name: { en: 'A', de: 'B' }, text: { de: 'Ein Messer.' }, photoIds: [second, photo], commissionRate: 0.25 })).json() as View

    expect(saved).toMatchObject({ name: { en: 'A', de: 'B' }, text: { de: 'Ein Messer.' }, commissionRate: 0.25, rowVersion: 2 })
    expect(saved.photos.map(p => p.id)).toEqual([second, photo])
  })

  it('[E6.1][autosave] refuses a commission above 50 %, a retired photo and a file that is not there', async () => {
    const { created, patch, readyPhoto, storeId } = await setup()
    const product = await created()
    const retired = await readyPhoto(storeId, 'retired')

    expect((await patch(product.id, 1, { commissionRate: 0.6 })).status).toBe(400)
    const gone = await patch(product.id, 1, { photoIds: [retired] })
    expect(gone.status).toBe(422)
    expect(await gone.json()).toMatchObject({ type: 'media-retired' })
    const missing = await patch(product.id, 1, { photoIds: [randomUUID()] })
    expect(await missing.json()).toMatchObject({ type: 'media-invalid' })
  })

  it('[E6.1][autosave] a product of another store is not found', async () => {
    const a = await setup()
    const b = await setup({ fresh: true })
    const product = await a.created()

    const response = await b.patch(product.id, 1, { name: { en: 'x' } }, b.owner.headers)

    expect(response.status).toBe(404)
  })
})

describe('[E6.1][AC30] publishing', () => {
  it.each([
    ['English', { name: { en: 'Victorinox Classic' }, text: { en: 'A Swiss knife.' } }, { en: 'victorinox-classic' }],
    ['German', { name: { de: 'Kapellbrücke Messer' }, text: { de: 'Ein Messer.' } }, { de: 'kapellbruecke-messer' }],
  ])('[E6.1][AC30] a keepsake with one full language in %s publishes, and its slug covers only that language', async (_label, content, slug) => {
    const { created, act } = await setup()
    const product = await created(content)

    const response = await act(product.id, 'publish', 1)
    const published = await response.json() as View

    expect(response.status).toBe(200)
    expect(published).toMatchObject({ status: 'published', hasUnpublishedEdits: false, rowVersion: 2, blocking: [] })
    expect(Object.keys(published.slug ?? {})).toEqual(Object.keys(slug))
    expect(published.slug?.en ?? published.slug?.de).toMatch(new RegExp(`^${Object.values(slug)[0]}(-\\d+)?$`))
    expect(published.warnings.map(w => w.code)).toContain('other-language')
  })

  it('[E6.1][AC30] a name in one language and a text in the other is no full language and is refused', async () => {
    const { created, act } = await setup()
    const product = await created({ name: { en: 'Knife' }, text: { de: 'Ein Messer.' } })

    const response = await act(product.id, 'publish', 1)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ path: 'name' }] })
  })

  it('[E6.1][checks] a keepsake with no photo, or no variant for sale, is refused and names the gap', async () => {
    const { created, act, patch } = await setup()
    const noPhoto = await created({ photoIds: [] })
    const hidden = await created()

    const photoResponse = await act(noPhoto.id, 'publish', 1)
    await pool.query(`update catalog.skus set status = 'draft' where product_id = $1`, [hidden.id])
    const variantResponse = await act(hidden.id, 'publish', 1)
    await patch(hidden.id, 1, { name: { en: 'Renamed' } })

    expect(photoResponse.status).toBe(422)
    expect(await photoResponse.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ path: 'photos' }] })
    expect(variantResponse.status).toBe(422)
    expect(await variantResponse.json()).toMatchObject({ errors: [{ path: 'variants' }] })
  })

  it('[E6.1][checks] a stale publish is 412 and a photo that is still processing is refused', async () => {
    const { created, act, patch, readyPhoto, storeId } = await setup()
    const product = await created()
    await patch(product.id, 1, { text: { en: 'New text' } })
    const processing = await created({ photoIds: [await readyPhoto(storeId, 'processing')] })

    const stale = await act(product.id, 'publish', 1)
    const pending = await act(processing.id, 'publish', 1)

    expect(stale.status).toBe(412)
    expect(pending.status).toBe(422)
    expect(await pending.json()).toMatchObject({ type: 'media-processing', mediaIds: [expect.any(String)] })
  })

  it('[E6.1][review] publishing copies the photos and an edit afterwards is not live until Publish changes', async () => {
    const { created, act, patch, readyPhoto, storeId } = await setup()
    const product = await created()
    await act(product.id, 'publish', 1)
    const second = await readyPhoto(storeId)

    const edited = await (await patch(product.id, 2, { name: { en: 'Edited name' }, photoIds: [second] })).json() as View
    const live = await pool.query<{ published: { name: { en: string } }, media: string[] }>(
      `select p.published, array(select media_id from catalog.product_media where product_id = p.id order by position) as media from catalog.products p where p.id = $1`,
      [product.id],
    )
    const republished = await (await act(product.id, 'publish', 3)).json() as View
    const after = await pool.query<{ media: string[] }>(`select array(select media_id from catalog.product_media where product_id = $1 order by position) as media`, [product.id])

    expect(edited).toMatchObject({ status: 'published', hasUnpublishedEdits: true, name: { en: 'Edited name' } })
    expect(live.rows[0]?.published.name.en).toBe('Victorinox Classic')
    expect(live.rows[0]?.media).toHaveLength(1)
    expect(live.rows[0]?.media[0]).not.toBe(second)
    expect(republished).toMatchObject({ hasUnpublishedEdits: false, name: { en: 'Edited name' }, slug: edited.slug })
    expect(after.rows[0]?.media).toEqual([second])
  })

  it('[E6.1][checks] a published keepsake that loses its photos in the draft saves, keeps the guests copy and cannot publish changes', async () => {
    const { created, act, patch } = await setup()
    const product = await created()
    await act(product.id, 'publish', 1)

    const saved = await patch(product.id, 2, { photoIds: [] })
    const body = await saved.json() as View
    const blocked = await act(product.id, 'publish', 3)

    expect(saved.status).toBe(200)
    expect(body.blocking.map(c => c.code)).toEqual(['photos'])
    expect(blocked.status).toBe(422)
    expect((await pool.query(`select count(*)::int as n from catalog.product_media where product_id = $1`, [product.id])).rows[0]?.n).toBe(1)
  })

  it('[E6.1][review] an edit back to the live copy is no pending edit, and a commission change alone is none either', async () => {
    const { created, act, patch } = await setup()
    const product = await created()
    await act(product.id, 'publish', 1)

    const commission = await (await patch(product.id, 2, { commissionRate: 0.2 })).json() as View
    const changed = await (await patch(product.id, 3, { name: { en: 'Other' } })).json() as View
    const reverted = await (await patch(product.id, 4, { name: { en: 'Victorinox Classic' } })).json() as View

    expect(commission.hasUnpublishedEdits).toBe(false)
    expect(changed.hasUnpublishedEdits).toBe(true)
    expect(reverted.hasUnpublishedEdits).toBe(false)
  })

  it('[E6.1][review] unpublishing makes a draft that keeps its live text, and it can go live again with the same address', async () => {
    const { created, act } = await setup()
    const product = await created()
    const live = await (await act(product.id, 'publish', 1)).json() as View

    const down = await act(product.id, 'unpublish', 2)
    const draft = await down.json() as View
    const again = await (await act(product.id, 'publish', 3)).json() as View
    const second = await act(product.id, 'unpublish', 99)
    const twice = await act(product.id, 'unpublish', 4)
    const notLive = await act(product.id, 'unpublish', 5)

    expect(down.status).toBe(200)
    expect(draft).toMatchObject({ status: 'draft', name: { en: 'Victorinox Classic' }, slug: live.slug })
    expect(again).toMatchObject({ status: 'published', slug: live.slug })
    expect(second.status).toBe(412)
    expect(twice.status).toBe(200)
    expect(notLive.status).toBe(409)
    expect(await notLive.json()).toMatchObject({ type: 'not-published' })
  })

  it('[E6.1][review] two keepsakes with the same name get different addresses', async () => {
    const { created, act } = await setup()
    const a = await created({ name: { en: 'Twin Knife' } })
    const b = await created({ name: { en: 'Twin Knife' } })

    const first = await (await act(a.id, 'publish', 1)).json() as View
    const second = await (await act(b.id, 'publish', 1)).json() as View

    expect(first.slug?.en).not.toBe(second.slug?.en)
  })

  it('[E6.1][review] each publish and unpublish writes an audit row with the actor and the request id', async () => {
    const { created, act, owner } = await setup()
    const product = await created()

    await act(product.id, 'publish', 1)
    await act(product.id, 'unpublish', 2)

    const { rows } = await pool.query<{ action: string, actor: string, request_id: string }>(
      `select action, actor, request_id from platform.audit_log where entity = 'product' and entity_id = $1 order by at, id`,
      [product.id],
    )
    expect(rows.map(r => r.action)).toEqual(['published', 'unpublished'])
    expect(rows[0]?.actor).toBe(`staff:${owner.userId}`)
    expect(rows[0]?.request_id).toBeTruthy()
  })
})

describe('[E6.1][list] the keepsake list', () => {
  it('[E6.1][list] lists the store keepsakes newest first, with the cover, the variant count and the sold-out count', async () => {
    const { call, products, owner, created, act, photo } = await setup({ fresh: true })
    const first = await created({ name: { en: 'First' } })
    const second = await created({ name: { de: 'Zweites' }, photoIds: [] })
    await act(first.id, 'publish', 1)

    const list = await (await call(products, { headers: owner.headers })).json() as { items: { id: string, name: object, status: string, cover: { id: string } | null, variantCount: number, soldOutCount: number }[] }

    expect(list.items.map(item => item.id)).toEqual([second.id, first.id])
    expect(list.items[0]).toMatchObject({ name: { de: 'Zweites' }, status: 'draft', cover: null, variantCount: 1, soldOutCount: 0 })
    expect(list.items[1]).toMatchObject({ name: { en: 'First' }, status: 'published', cover: { id: photo }, variantCount: 1, soldOutCount: 0 })
  })

  it('[E6.1][list] counts only the variants that are not archived, and shows the draft photo of a published keepsake', async () => {
    const { call, products, owner, created, act, patch, readyPhoto, storeId } = await setup({ fresh: true })
    const product = await created()
    await act(product.id, 'publish', 1)
    const next = await readyPhoto(storeId)
    await patch(product.id, 2, { photoIds: [next] })
    await pool.query(`update catalog.skus set status = 'archived' where product_id = $1`, [product.id])

    const list = await (await call(products, { headers: owner.headers })).json() as { items: { cover: { id: string }, variantCount: number, hasUnpublishedEdits: boolean }[] }

    expect(list.items[0]).toMatchObject({ cover: { id: next }, variantCount: 0, hasUnpublishedEdits: true })
  })

  it('[E6.1][list] an outsider gets 403 and a signed-out visitor 401', async () => {
    const a = await setup()
    const b = await setup({ fresh: true })

    expect((await env.call(a.products, { headers: b.owner.headers })).status).toBe(403)
    expect((await env.call(a.products)).status).toBe(401)
  })
})

describe('[E6.1][variant] the default variant', () => {
  it('[E6.1][variant] edits the code and the price, hides it and puts it back on sale', async () => {
    const { created, call, products, owner } = await setup()
    const product = await created()
    const variant = product.variants[0]!
    const path = `${products}/${product.id}/variants/${variant.id}`
    const save = (body: object) => call(path, { method: 'PATCH', headers: owner.headers, body })
    const newCode = code()

    const edited = await (await save({ skuCode: newCode, priceRappen: 4500 })).json() as View
    const hidden = await (await save({ status: 'draft' })).json() as View
    const onSale = await (await save({ status: 'published' })).json() as View

    expect(edited.variants[0]).toMatchObject({ skuCode: newCode, priceRappen: 4500, status: 'published' })
    expect(hidden.variants[0]?.status).toBe('draft')
    expect(hidden.blocking.map(c => c.code)).toContain('variant-for-sale')
    expect(hidden.warnings.map(c => c.code)).toContain('hidden')
    expect(onSale.variants[0]?.status).toBe('published')
    expect(onSale.rowVersion).toBe(1)
  })

  it('[E6.1][variant] a code another keepsake uses is refused, as is a bad code, and an unknown variant is not found', async () => {
    const { created, call, products, owner } = await setup()
    const a = await created()
    const b = await created()
    const pathB = `${products}/${b.id}/variants/${b.variants[0]!.id}`

    const taken = await call(pathB, { method: 'PATCH', headers: owner.headers, body: { skuCode: a.variants[0]!.skuCode } })
    const bad = await call(pathB, { method: 'PATCH', headers: owner.headers, body: { skuCode: 'no good' } })
    const price = await call(pathB, { method: 'PATCH', headers: owner.headers, body: { priceRappen: 0 } })
    const unknown = await call(`${products}/${b.id}/variants/${randomUUID()}`, { method: 'PATCH', headers: owner.headers, body: { priceRappen: 100 } })
    const foreign = await call(`${products}/${b.id}/variants/${a.variants[0]!.id}`, { method: 'PATCH', headers: owner.headers, body: { priceRappen: 100 } })

    expect(taken.status).toBe(409)
    expect(await taken.json()).toMatchObject({ type: 'sku-code-taken' })
    expect(bad.status).toBe(422)
    expect(price.status).toBe(400)
    expect(unknown.status).toBe(404)
    expect(foreign.status).toBe(404)
  })
})
