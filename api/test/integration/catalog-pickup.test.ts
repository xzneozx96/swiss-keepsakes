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

// A short link is followed through this stand-in for Google, so no test calls the network (gate G-S8-PICKUP-MAPS).
const shortLink = 'https://maps.app.goo.gl/AbCdEf123'
const placeLink = 'https://www.google.com/maps/place/Hotel/@47.0502,8.3093,17z/data=!3d47.0516!4d8.3074'
const asked: string[] = []
const mapsFetch = (async (input: URL | string) => {
  asked.push(String(input))
  return String(input) === shortLink ? new Response(null, { status: 302, headers: { location: placeLink } }) : new Response(null, { status: 404 })
}) as typeof fetch
const env = createCatalogHttp(testDatabase, { mapsFetch })

interface Span { weekday: number, opens: string, closes: string }
interface View {
  id: string
  storeId: string
  name: { en?: string, de?: string }
  address: { en?: string, de?: string }
  mapsLink: string
  latitude: number
  longitude: number
  instructions: { en?: string, de?: string } | null
  position: number
  archived: boolean
  hours: Span[]
  rowVersion: number
}
interface Problem { type: string, errors?: { in: string, path: string, message: string, code?: string }[] }

const shopLink = 'https://www.google.com/maps/place/Shop/@47.0507,8.3068,17z'
const monToSat = [1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, opens: '10:00', closes: '18:00' }))

let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined
const getStore = async () => (sharedStore ??= env.storeWithStaff())

async function setup(options: { fresh?: boolean } = {}) {
  const store = await (options.fresh ? env.storeWithStaff() : getStore())
  const base = `/api/store/${store.storeId}/pickup-places`
  const send = (path: string, method: string, body?: object, headers: Record<string, string> = store.owner.headers) => env.call(`${base}${path}`, { method, headers, ...(body && { body }) })
  const create = (body: object, headers?: Record<string, string>) => send('', 'POST', { name: { en: 'Shop' }, address: { en: 'Hertensteinstrasse 1' }, mapsLink: shopLink, hours: monToSat, ...body }, headers)
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

  it('[E6.6][AC26] AC-6: archive then restore keeps the hours; the restored point goes to the end of the active list', async () => {
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
    expect(await restored.json()).toMatchObject({ archived: false, position: 4, rowVersion: 3, hours: [{ weekday: 2, opens: '10:00', closes: '12:00' }] })
    expect((await list()).map(item => [item.name.en, item.position])).toEqual([['First', 1], ['Third', 3], ['Second', 4]])
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

  it('[E6.6][AC26] a non-member gets 403 on every write and nothing changes', async () => {
    const { base, created, send, list } = await setup({ fresh: true })
    const point = await created()
    const stranger = await env.signIn()
    const as = { ...stranger.headers, 'If-Match': '1' }
    const body = { name: { en: 'Shop' }, address: { en: 'Hertensteinstrasse 1' }, mapsLink: shopLink, hours: monToSat }
    const calls = [
      env.call(base, { method: 'POST', headers: stranger.headers, body }),
      env.call(`${base}/${point.id}`, { method: 'PATCH', headers: as, body: { name: { en: 'Mine' } } }),
      env.call(`${base}/order`, { method: 'PUT', headers: stranger.headers, body: { ids: [point.id] } }),
      env.call(`${base}/${point.id}/archive`, { method: 'POST', headers: as }),
      env.call(`${base}/${point.id}/restore`, { method: 'POST', headers: as }),
    ]

    expect((await Promise.all(calls)).map(response => response.status)).toEqual([403, 403, 403, 403, 403])
    expect(await list()).toEqual([point])
    expect((await send(`/${point.id}`, 'GET')).status).toBe(200)
  })

  it('[E6.6][AC26] archive with a stale If-Match is 412 and changes nothing', async () => {
    const { created, send, withVersion, list } = await setup({ fresh: true })
    const point = await created()
    expect((await send(`/${point.id}`, 'PATCH', { name: { en: 'Second' } }, withVersion(1))).status).toBe(200)

    expect((await send(`/${point.id}/archive`, 'POST', undefined, withVersion(1))).status).toBe(412)
    expect(await list()).toEqual([expect.objectContaining({ id: point.id, archived: false, rowVersion: 2 })])
  })

  it('[E6.6][AC26] G-S8-PICKUP-LIMIT: 100 active points is the limit; archived ones do not count, and restore is refused at 100 active', async () => {
    const { store, create, created, list, send, withVersion } = await setup({ fresh: true })
    const first = await created()
    // 99 archived points beside one active: the store is nowhere near the limit.
    await pool.query(
      `insert into catalog.pickup_places (store_id, name, address, maps_link, latitude, longitude, position, archived_at) select $1, '{"en":"Old"}'::jsonb, '{"en":"Old"}'::jsonb, 'https://maps.app.goo.gl/x', 47, 8, g, now() from generate_series(2, 100) g`,
      [store.storeId],
    )
    const second = await created({ name: { en: 'Second' } })
    expect((await list()).map(item => item.id)).toEqual([first.id, second.id])

    // Fill the active list to 100.
    await pool.query(
      `insert into catalog.pickup_places (store_id, name, address, maps_link, latitude, longitude, position) select $1, '{"en":"Bulk"}'::jsonb, '{"en":"Bulk"}'::jsonb, 'https://maps.app.goo.gl/x', 47, 8, g from generate_series(200, 297) g`,
      [store.storeId],
    )
    const refused = await create({})
    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ path: 'name', code: 'pickup-limit' })])
    expect(await list()).toHaveLength(100)

    const archivedOne = await pool.query<{ id: string }>(`select id from catalog.pickup_places where store_id = $1 and archived_at is not null limit 1`, [store.storeId])
    const noRoom = await send(`/${archivedOne.rows[0]!.id}/restore`, 'POST', undefined, withVersion(1))
    expect(noRoom.status).toBe(422)
    expect((await noRoom.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'pickup-limit' })])
    expect(await list()).toHaveLength(100)

    // Archiving one makes room for exactly one: the restore then works.
    const archive = await send(`/${second.id}/archive`, 'POST', undefined, withVersion(second.rowVersion))
    expect(archive.status).toBe(200)
    const restored = await send(`/${archivedOne.rows[0]!.id}/restore`, 'POST', undefined, withVersion(1))
    expect(restored.status).toBe(200)
    expect(await list()).toHaveLength(100)
  })

  it('[E6.6][AC26] a reorder names the active points only; an archived id is refused', async () => {
    const { created, send, withVersion } = await setup({ fresh: true })
    const [a, b] = [await created({ name: { en: 'A' } }), await created({ name: { en: 'B' } })]
    await send(`/${b.id}/archive`, 'POST', undefined, withVersion(1))

    expect((await send('/order', 'PUT', { ids: [a.id, b.id] })).status).toBe(422)
    expect((await send('/order', 'PUT', { ids: [a.id] })).status).toBe(200)
  })

  it('[S8-PICKUP-MAPS] a point stores its Google Maps link and the pin read from it, and the read returns both', async () => {
    const { created, send, list } = await setup({ fresh: true })
    const point = await created()

    expect(point).toMatchObject({ mapsLink: shopLink, latitude: 47.0507, longitude: 8.3068 })
    expect(await (await send(`/${point.id}`, 'GET')).json()).toMatchObject({ mapsLink: shopLink, latitude: 47.0507, longitude: 8.3068 })
    expect((await list())[0]).toMatchObject({ mapsLink: shopLink, latitude: 47.0507, longitude: 8.3068 })
  })

  it('[S8-PICKUP-MAPS] a short link is followed through Google and the link is stored as pasted', async () => {
    const { created } = await setup({ fresh: true })
    asked.length = 0
    const point = await created({ mapsLink: shortLink })

    expect(asked).toEqual([shortLink])
    expect(point).toMatchObject({ mapsLink: shortLink, latitude: 47.0516, longitude: 8.3074 })
  })

  it('[S8-PICKUP-MAPS] the link is required: left out, null or not a Google Maps link is a refused body and nothing is stored', async () => {
    const { store, base, create, list } = await setup({ fresh: true })
    const { mapsLink: _left, ...without } = { name: { en: 'Shop' }, address: { en: 'Hertensteinstrasse 1' }, mapsLink: shopLink, hours: monToSat }
    const noLink = await env.call(base, { method: 'POST', headers: store.owner.headers, body: without })
    expect(noLink.status).toBe(400)
    for (const mapsLink of [null, '', 'https://evil.example/maps/abc', 'http://maps.app.goo.gl/abc'])
      expect((await create({ mapsLink })).status, String(mapsLink)).toBe(400)
    expect(await list()).toEqual([])
  })

  it('[S8-PICKUP-MAPS] a Google Maps link that holds no position is 422 maps-link-unreadable and nothing is stored', async () => {
    const { create, list } = await setup({ fresh: true })
    for (const mapsLink of ['https://www.google.com/maps/place/Lucerne', 'https://maps.app.goo.gl/Unknown404']) {
      const response = await create({ mapsLink })
      expect(response.status, mapsLink).toBe(422)
      expect(await response.json()).toMatchObject({ type: expect.stringContaining('maps-link-unreadable'), errors: [{ in: 'body', path: 'mapsLink' }] })
    }
    expect(await list()).toEqual([])
  })

  it('[S8-PICKUP-MAPS] a save with a new link moves the pin; a save without one keeps link and pin; an unreadable link changes nothing', async () => {
    const { created, send, withVersion } = await setup({ fresh: true })
    const point = await created()

    const renamed = await send(`/${point.id}`, 'PATCH', { name: { en: 'Renamed' } }, withVersion(1))
    expect(await renamed.json()).toMatchObject({ mapsLink: shopLink, latitude: 47.0507, longitude: 8.3068, rowVersion: 2 })

    const moved = await send(`/${point.id}`, 'PATCH', { mapsLink: placeLink }, withVersion(2))
    expect(await moved.json()).toMatchObject({ mapsLink: placeLink, latitude: 47.0516, longitude: 8.3074, rowVersion: 3 })

    const bad = await send(`/${point.id}`, 'PATCH', { mapsLink: 'https://www.google.com/maps/place/Lucerne' }, withVersion(3))
    expect(bad.status).toBe(422)
    expect(await (await send(`/${point.id}`, 'GET')).json()).toMatchObject({ mapsLink: placeLink, latitude: 47.0516, rowVersion: 3 })
    expect((await send(`/${point.id}`, 'PATCH', { mapsLink: null }, withVersion(3))).status).toBe(400)
    expect((await send(`/${point.id}`, 'PATCH', { latitude: 1 }, withVersion(3))).status).toBe(400)
  })

  it('[S8-PICKUP-MAPS] archive and restore keep the link and the pin', async () => {
    const { created, send, withVersion } = await setup({ fresh: true })
    const point = await created()
    await send(`/${point.id}/archive`, 'POST', undefined, withVersion(1))
    const restored = await send(`/${point.id}/restore`, 'POST', undefined, withVersion(2))

    expect(await restored.json()).toMatchObject({ mapsLink: shopLink, latitude: 47.0507, longitude: 8.3068 })
  })

  it('[S8-PICKUP-MAPS] a non-member gets 403 before the link is read', async () => {
    const { base } = await setup()
    const stranger = await env.signIn()
    asked.length = 0
    const response = await env.call(base, { method: 'POST', headers: stranger.headers, body: { name: { en: 'Shop' }, address: { en: 'Hertensteinstrasse 1' }, mapsLink: shortLink, hours: monToSat } })

    expect(response.status).toBe(403)
    expect(asked).toEqual([])
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
