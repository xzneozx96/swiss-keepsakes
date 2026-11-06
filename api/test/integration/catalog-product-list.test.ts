import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

// ADR-033 slice 5: the SQL of the keepsake table, against the scratch database (CI runs it; the slice's author could not).
// Every test makes its own store, so the counts are exact.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool } = testDatabase

afterAll(async () => {
  await pool.end()
})

const env = createCatalogHttp(testDatabase)

const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface View { id: string, rowVersion: number }
interface Row { id: string, name: { en?: string, de?: string }, status: string, hasUnpublishedEdits: boolean }
interface Page { items: Row[], total: number, page: number, pageSize: number, statuses: Record<'draft' | 'published' | 'editsNotLive' | 'archived', number> }

async function setup() {
  const store = await env.storeWithStaff()
  const photo = await env.readyPhoto(store.storeId)
  const headers = store.owner.headers
  const create = async (name: { en?: string, de?: string }): Promise<View> => {
    const response = await env.call(store.products, { method: 'POST', headers, body: { name, text: { en: rich('A Swiss knife.') }, photoIds: [photo], variants: [{ skuCode: code(), priceRappen: 3900 }] } })
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const act = async (id: string, action: 'publish' | 'unpublish', ifMatch: number) => {
    const response = await env.call(`${store.products}/${id}/${action}`, { method: 'POST', headers: { ...headers, 'If-Match': String(ifMatch) } })
    expect(response.status).toBe(200)
    return await response.json() as View
  }
  const rename = async (id: string, ifMatch: number, name: { en: string }) => {
    const response = await env.call(`${store.products}/${id}`, { method: 'PATCH', headers: { ...headers, 'If-Match': String(ifMatch) }, body: { name } })
    expect(response.status).toBe(200)
    return await response.json() as View
  }
  const list = async (query = ''): Promise<Page> => await (await env.call(`${store.products}${query}`, { headers })).json() as Page
  const lookup = async (ids: string[]) => (await (await env.call(`${store.products}/lookup?ids=${ids.join(',')}`, { headers })).json() as { items: Row[] }).items
  return { ...store, call: env.call, headers, create, act, rename, list, lookup, photo }
}

describe('[ADR-033] the keepsake table on the real database', () => {
  it('derives the list status, leaves the archived out by default, and counts every status with the search', async () => {
    const s = await setup()
    const draft = await s.create({ en: 'Draft knife' })
    const live = await s.create({ en: 'Live knife' })
    await s.act(live.id, 'publish', 1)
    const edited = await s.create({ en: 'Edited knife' })
    await s.act(edited.id, 'publish', 1)
    await s.rename(edited.id, 2, { en: 'Edited knife v2' })
    const archived = await s.create({ en: 'Archived knife' })
    // Archiving happens when a keepsake with orders is removed; the orders module is not built, so the status is set by hand.
    // Only a published keepsake is archived (products_published_fields_check needs its slug and published name), so it is published first.
    await s.act(archived.id, 'publish', 1)
    await pool.query(`update catalog.products set status = 'archived' where id = $1`, [archived.id])

    const all = await s.list('?page=1')
    expect(all.items.map(row => row.id).sort()).toEqual([draft.id, live.id, edited.id].sort())
    expect([all.total, all.page, all.pageSize]).toEqual([3, 1, 10])
    expect(all.statuses).toEqual({ draft: 1, published: 1, editsNotLive: 1, archived: 1 })

    expect((await s.list('?status=published,editsNotLive')).items.map(row => row.id).sort()).toEqual([live.id, edited.id].sort())
    const onlyArchived = await s.list('?status=archived')
    expect([onlyArchived.total, onlyArchived.items.map(row => row.id)]).toEqual([1, [archived.id]])
    const searched = await s.list('?q=EDITED&status=draft')
    expect([searched.total, searched.statuses]).toEqual([0, { draft: 0, published: 0, editsNotLive: 1, archived: 0 }])
  })

  it('searches the name in either language, in any case, and treats % and _ as plain characters', async () => {
    const s = await setup()
    const alpine = await s.create({ en: 'Alpine Cap' })
    const fondue = await s.create({ de: 'Käsefondue Set' })
    await s.create({ en: '100% Wool' })

    expect((await s.list('?q=ALPINE')).items.map(row => row.id)).toEqual([alpine.id])
    expect((await s.list(`?q=${encodeURIComponent('käsefondue')}`)).items.map(row => row.id)).toEqual([fondue.id])
    expect((await s.list(`?q=${encodeURIComponent('%')}`)).total).toBe(1)
    expect((await s.list('?q=_')).total).toBe(0)
  })

  it('walks the pages newest first, each keepsake exactly once; a page past the end is empty with the real total; sort=edited puts the last edit first', async () => {
    const s = await setup()
    const made: string[] = []
    for (let i = 0; i < 12; i += 1)
      made.push((await s.create({ en: `Knife ${i}` })).id)
    // Equal creation times must not repeat or skip a row across pages: the id breaks the tie.
    await pool.query(`update catalog.products set created_at = '2026-11-01T10:00:00Z' where store_id = $1 and id = any($2::uuid[])`, [s.storeId, made.slice(0, 6)])

    const walked = (await Promise.all([1, 2, 3].map(page => s.list(`?pageSize=5&page=${page}`)))).flatMap(page => page.items.map(row => row.id))
    expect(walked).toHaveLength(12)
    expect(new Set(walked).size).toBe(12)
    expect(walked.slice(0, 6).sort()).toEqual(made.slice(6).sort())

    // ADR-033 section 12, one release: no page is the whole list.
    const whole = await s.list()
    expect([whole.items.length, whole.pageSize]).toEqual([12, 500])

    const beyond = await s.list('?pageSize=5&page=4')
    expect([beyond.items.length, beyond.total]).toEqual([0, 12])
    expect((await s.call(`${s.products}?page=1002`, { headers: s.headers })).status).toBe(400)

    await s.rename(made[0]!, 1, { en: 'Knife 0 renamed' })
    expect((await s.list('?sort=edited&pageSize=1')).items[0]!.id).toBe(made[0])
  })

  it('never lists, counts or looks up another store\'s keepsakes', async () => {
    const s = await setup()
    const other = await setup()
    const mine = await s.create({ en: 'Mine' })
    const theirs = await other.create({ en: 'Theirs' })

    expect((await s.list()).total).toBe(1)
    expect((await s.lookup([mine.id, theirs.id])).map(row => row.id)).toEqual([mine.id])
  })

  it('looks up by id whatever the status, in the order asked', async () => {
    const s = await setup()
    const draft = await s.create({ en: 'Draft' })
    const live = await s.create({ en: 'Live' })
    await s.act(live.id, 'publish', 1)

    expect((await s.lookup([live.id, draft.id])).map(row => row.id)).toEqual([live.id, draft.id])
  })

  it('names the options of the shop once each, ignoring case, without the keepsake being edited', async () => {
    const s = await setup()
    const option = (name: { en: string, de?: string }) => ({ ref: 'o', name, values: [{ ref: 'a', label: { en: 'A' } }] })
    const withOption = async (name: { en: string, de?: string }) => {
      const response = await env.call(s.products, { method: 'POST', headers: s.headers, body: { name: { en: 'K' }, photoIds: [s.photo], options: [option(name)], variants: [{ skuCode: code(), priceRappen: 100, values: { o: 'a' } }] } })
      return await response.json() as View
    }
    const first = await withOption({ en: 'Size', de: 'Grösse' })
    await withOption({ en: 'size' })
    const third = await withOption({ en: 'Colour' })
    const names = async (query = '') => (await (await env.call(`${s.products}/option-names${query}`, { headers: s.headers })).json() as { items: { en?: string }[] }).items.map(item => item.en)

    // Newest keepsake first, and a name once under the newest spelling.
    expect(await names()).toEqual(['Colour', 'size'])
    expect(await names(`?except=${third.id}`)).toEqual(['size'])
    expect(await names(`?except=${first.id}`)).toEqual(['Colour', 'size'])
  })
})
