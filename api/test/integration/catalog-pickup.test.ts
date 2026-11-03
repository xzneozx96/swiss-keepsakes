import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool } = testDatabase

afterAll(async () => {
  await pool.end()
})

const env = createCatalogHttp(testDatabase)

interface Span { weekday: number, opens: string, closes: string }
interface View {
  id: string
  storeId: string
  name: { en?: string, de?: string }
  address: { en?: string, de?: string }
  instructions: { en?: string, de?: string } | null
  position: number
  archived: boolean
  hours: Span[]
  rowVersion: number
}
interface Problem { type: string, errors?: { in: string, path: string, message: string }[] }

const monToSat = [1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, opens: '10:00', closes: '18:00' }))

let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined
const getStore = async () => (sharedStore ??= env.storeWithStaff())

async function setup(options: { fresh?: boolean } = {}) {
  const store = await (options.fresh ? env.storeWithStaff() : getStore())
  const base = `/api/store/${store.storeId}/pickup-places`
  const send = (path: string, method: string, body?: object, headers: Record<string, string> = store.owner.headers) => env.call(`${base}${path}`, { method, headers, ...(body && { body }) })
  const create = (body: object, headers?: Record<string, string>) => send('', 'POST', { name: { en: 'Shop' }, address: { en: 'Hertensteinstrasse 1' }, hours: monToSat, ...body }, headers)
  const created = async (body: object = {}) => {
    const response = await create(body)
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const list = async (query = '') => {
    const response = await send(query, 'GET')
    expect(response.status).toBe(200)
    return (await response.json() as { items: View[] }).items
  }
  const withVersion = (version: number | string, headers: Record<string, string> = store.owner.headers) => ({ ...headers, 'If-Match': String(version) })
  return { store, base, send, create, created, list, withVersion }
}

describe('[E6.6][AC26] pickup points over HTTP', () => {
  it('[E6.6][AC26] AC-1: two points are listed in position order, each with its own hours', async () => {
    const { created, list, send, store } = await setup({ fresh: true })
    const shop = await created({ name: { en: 'Shop Hertensteinstrasse' }, instructions: { en: 'Ring the bell' } })
    const hotel = await created({ name: { en: 'Hotel Schweizerhof' }, hours: [{ weekday: 7, opens: '08:00', closes: '12:00' }] })

    expect([shop.position, hotel.position]).toEqual([1, 2])
    expect(shop).toMatchObject({ storeId: store.storeId, archived: false, instructions: { en: 'Ring the bell' }, rowVersion: 1, hours: monToSat })
    const items = await list()
    expect(items.map(item => item.name.en)).toEqual(['Shop Hertensteinstrasse', 'Hotel Schweizerhof'])
    expect(items[1]!.hours).toEqual([{ weekday: 7, opens: '08:00', closes: '12:00' }])
    const read = await send(`/${hotel.id}`, 'GET')
    expect(read.headers.get('ETag')).toBe('"1"')
    expect(await read.json()).toMatchObject({ id: hotel.id })
  })

  it('[E6.6][AC26] AC-2: the list shows the active points and the archived filter the archived one', async () => {
    const { created, list, send, withVersion } = await setup({ fresh: true })
    await created({ name: { en: 'A' } })
    const gone = await created({ name: { en: 'B' } })
    await created({ name: { en: 'C' } })
    expect((await send(`/${gone.id}/archive`, 'POST', undefined, withVersion(1))).status).toBe(200)

    expect((await list()).map(item => item.name.en)).toEqual(['A', 'C'])
    expect((await list('?archived=false')).map(item => item.name.en)).toEqual(['A', 'C'])
    expect((await list('?archived=true')).map(item => item.name.en)).toEqual(['B'])
  })

  it('[E6.6][AC26] AC-3: one language is enough, a blank name or address is 422 naming the field', async () => {
    const { create } = await setup()

    const german = await create({ name: { de: 'Laden' }, address: { en: 'Main street' } })
    expect(german.status).toBe(201)
    expect(await german.json()).toMatchObject({ name: { de: 'Laden' }, address: { en: 'Main street' } })

    const noName = await create({ name: { en: '  ', de: '' } })
    expect(noName.status).toBe(422)
    expect((await noName.json() as Problem).errors).toEqual([expect.objectContaining({ in: 'body', path: 'name' })])
    const noAddress = await create({ address: {} })
    expect(noAddress.status).toBe(422)
    expect((await noAddress.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'address' })])
  })

  it('[E6.6][AC26] AC-4: spans are saved as sent, crossing midnight, 24:00 and overlaps included', async () => {
    const { created, send, create, list } = await setup()
    const wrapping = await created({ hours: [{ weekday: 5, opens: '22:00', closes: '02:00' }] })
    expect(wrapping.hours).toEqual([{ weekday: 5, opens: '22:00', closes: '02:00' }])

    const day = [{ weekday: 1, opens: '14:00', closes: '18:00' }, { weekday: 1, opens: '09:00', closes: '12:00' }, { weekday: 1, opens: '11:00', closes: '24:00' }, { weekday: 7, opens: '18:00', closes: '10:00' }, { weekday: 7, opens: '22:00', closes: '24:00' }]
    const multi = await created({ hours: day })
    expect(multi.hours).toEqual([
      { weekday: 1, opens: '09:00', closes: '12:00' },
      { weekday: 1, opens: '11:00', closes: '24:00' },
      { weekday: 1, opens: '14:00', closes: '18:00' },
      { weekday: 7, opens: '18:00', closes: '10:00' },
      { weekday: 7, opens: '22:00', closes: '24:00' },
    ])
    expect((await list()).find(item => item.id === wrapping.id)!.hours).toEqual(wrapping.hours)

    const badDay = await create({ hours: [{ weekday: 8, opens: '10:00', closes: '18:00' }] })
    expect(badDay.status).toBe(422)
    expect((await badDay.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'hours.0.weekday' })])
    const equal = await create({ hours: [{ weekday: 1, opens: '10:00', closes: '10:00' }] })
    expect(equal.status).toBe(422)
    expect((await equal.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'hours.0.closes' })])
    const twice = await create({ hours: [{ weekday: 2, opens: '10:00', closes: '12:00' }, { weekday: 2, opens: '10:00', closes: '18:00' }] })
    expect(twice.status).toBe(422)
    expect((await twice.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'hours.1.opens' })])
    expect((await send(`/${wrapping.id}`, 'GET')).status).toBe(200)
  })

  it('[E6.6][AC26] AC-5: a stale save is 412 and changes nothing, no If-Match is 428', async () => {
    const { created, send, withVersion } = await setup()
    const point = await created()
    const first = await send(`/${point.id}`, 'PATCH', { name: { en: 'Second' } }, withVersion(1))
    expect(first.status).toBe(200)
    expect(first.headers.get('ETag')).toBe('"2"')
    expect(await first.json()).toMatchObject({ rowVersion: 2, name: { en: 'Second' }, address: { en: 'Hertensteinstrasse 1' }, hours: monToSat })

    const stale = await send(`/${point.id}`, 'PATCH', { name: { en: 'Late' } }, withVersion(1))
    expect(stale.status).toBe(412)
    expect((await send(`/${point.id}`, 'PATCH', { name: { en: 'Late' } })).status).toBe(428)
    expect(await (await send(`/${point.id}`, 'GET')).json()).toMatchObject({ name: { en: 'Second' }, rowVersion: 2 })
  })

  it('[E6.6][AC26] a save replaces the hours as a set and clears the instructions with a blank object', async () => {
    const { created, send, withVersion } = await setup()
    const point = await created({ instructions: { en: 'Ring' } })
    const saved = await send(`/${point.id}`, 'PATCH', { hours: [{ weekday: 3, opens: '09:00', closes: '11:00' }], instructions: {} }, withVersion(1))

    expect(await saved.json()).toMatchObject({ hours: [{ weekday: 3, opens: '09:00', closes: '11:00' }], instructions: null })
    const bad = await send(`/${point.id}`, 'PATCH', { hours: [{ weekday: 3, opens: '09:00', closes: '09:00' }] }, withVersion(2))
    expect(bad.status).toBe(422)
    expect(await (await send(`/${point.id}`, 'GET')).json()).toMatchObject({ rowVersion: 2, hours: [{ weekday: 3, opens: '09:00', closes: '11:00' }] })
  })

  it('[E6.6][AC26] AC-6: archive then restore keeps the hours and the position', async () => {
    const { created, send, list, withVersion } = await setup({ fresh: true })
    await created({ name: { en: 'First' } })
    const second = await created({ name: { en: 'Second' }, hours: [{ weekday: 2, opens: '10:00', closes: '12:00' }] })
    await created({ name: { en: 'Third' } })

    const archived = await send(`/${second.id}/archive`, 'POST', undefined, withVersion(1))
    expect(await archived.json()).toMatchObject({ archived: true, rowVersion: 2 })
    const again = await send(`/${second.id}/archive`, 'POST', undefined, withVersion(2))
    expect(await again.json()).toMatchObject({ archived: true, rowVersion: 2 })
    expect((await list()).map(item => item.name.en)).toEqual(['First', 'Third'])

    const restored = await send(`/${second.id}/restore`, 'POST', undefined, withVersion(2))
    expect(await restored.json()).toMatchObject({ archived: false, position: 2, rowVersion: 3, hours: [{ weekday: 2, opens: '10:00', closes: '12:00' }] })
    expect((await list()).map(item => item.name.en)).toEqual(['First', 'Second', 'Third'])
    expect((await send(`/${second.id}/restore`, 'POST')).status).toBe(428)
    expect((await send(`/${second.id}`, 'DELETE')).status).toBe(404)
  })

  it('[E6.6][AC26] AC-7: a point of another store is 404 and not in the list', async () => {
    const mine = await setup({ fresh: true })
    const other = await setup({ fresh: true })
    const theirs = await other.created({ name: { en: 'Theirs' } })

    expect((await mine.send(`/${theirs.id}`, 'GET')).status).toBe(404)
    expect((await mine.send(`/${theirs.id}`, 'PATCH', { name: { en: 'Mine now' } }, mine.withVersion(1))).status).toBe(404)
    expect((await mine.send(`/${theirs.id}/archive`, 'POST', undefined, mine.withVersion(1))).status).toBe(404)
    expect(await mine.list()).toEqual([])
    expect(await other.list()).toHaveLength(1)
    // The store guard stops a member of A from using B's path at all.
    const crossed = await env.call(`${other.base}`, { headers: mine.store.owner.headers })
    expect(crossed.status).toBe(403)
  })

  it('[E6.6][AC26] reorder sets positions 1..n and refuses a missing, extra or repeated id; a manager may write', async () => {
    const { created, send, list, store } = await setup({ fresh: true })
    const [a, b, c] = [await created({ name: { en: 'A' } }), await created({ name: { en: 'B' } }), await created({ name: { en: 'C' } })]

    const moved = await send('/order', 'PUT', { ids: [c.id, a.id, b.id] }, store.manager.headers)
    expect(moved.status).toBe(200)
    expect(((await moved.json()) as { items: View[] }).items.map(item => [item.name.en, item.position, item.rowVersion])).toEqual([['C', 1, 1], ['A', 2, 1], ['B', 3, 1]])
    for (const ids of [[c.id, a.id], [c.id, a.id, b.id, randomUUID()], [c.id, c.id, a.id]]) {
      const refused = await send('/order', 'PUT', { ids })
      expect(refused.status).toBe(422)
      expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'ids' })])
    }
    expect((await list()).map(item => item.name.en)).toEqual(['C', 'A', 'B'])
    expect((await send('/order', 'PUT', { ids: ['nope'] })).status).toBe(400)
  })

  // Only owner and manager exist and both hold edit-catalog, so the refused person is a signed-in non-member: the store guard answers 403.
  it('[E6.6][AC26] a signed-in person who is not a member of the store gets 403 from the store guard', async () => {
    const { base } = await setup()
    const stranger = await env.signIn()
    const response = await env.call(base, { headers: stranger.headers })

    expect(response.status).toBe(403)
  })

  it('[E6.6][AC26] a create and an archive each write one audit entry', async () => {
    const { created, send, withVersion, store } = await setup({ fresh: true })
    const point = await created()
    await send(`/${point.id}/archive`, 'POST', undefined, withVersion(1))

    const { rows } = await pool.query<{ entity: string, action: string, store_id: string }>(`select entity, action, store_id from platform.audit_log where entity = 'pickup_place' and entity_id = $1 order by at, id`, [point.id])
    expect(rows).toEqual([
      { entity: 'pickup_place', action: 'created', store_id: store.storeId },
      { entity: 'pickup_place', action: 'archived', store_id: store.storeId },
    ])
  })
})
