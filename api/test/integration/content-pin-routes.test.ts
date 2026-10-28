import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createContentHttp } from './content-http.ts'
import { count, openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const env = createContentHttp({ pool, db })

async function auditRows(entityId: string) {
  return (await pool.query<{ entity: string, action: string, actor: string, store_id: string, request_id: string }>(
    `select entity, action, actor, store_id, request_id from platform.audit_log where entity_id = $1 order by at, id`,
    [entityId],
  )).rows
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const located = { latitude: 47.0502, longitude: 8.3093, slug: { en: 'chapel-bridge' } }
const slugFor = () => `bridge-${randomUUID().slice(0, 8)}`

describe('[E2.6] the pin routes over the real app and the database', () => {
  it('[E2.6] AC-1 end to end: create, save with the returned ETag, stale save 412, no header 428', async () => {
    const { owner, pins } = await env.storeWithStaff()

    const created = await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Chapel Bridge' } } })
    expect(created.status).toBe(201)
    expect(created.headers.get('ETag')).toBe('"1"')
    const pin = await created.json() as { id: string, rowVersion: number, status: string, draft: { title: { en: string } } }
    expect(pin).toMatchObject({ status: 'draft', rowVersion: 1, draft: { title: { en: 'Chapel Bridge' } } })

    const saved = await env.call(`${pins}/${pin.id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': created.headers.get('ETag')! }, body: { ...located, slug: { en: slugFor() }, address: 'Kapellbrücke, Lucerne' } })
    expect(saved.status).toBe(200)
    expect(saved.headers.get('ETag')).toBe('"2"')
    expect(await saved.json()).toMatchObject({ rowVersion: 2, address: 'Kapellbrücke, Lucerne', draft: { title: { en: 'Chapel Bridge' } } })

    const stale = await env.call(`${pins}/${pin.id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: { address: 'elsewhere' } })
    expect(stale.status).toBe(412)
    expect(stale.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })

    const missing = await env.call(`${pins}/${pin.id}`, { method: 'PATCH', headers: owner.headers, body: { address: 'elsewhere' } })
    expect(missing.status).toBe(428)
    expect(await missing.json()).toMatchObject({ type: 'precondition-required' })

    const bad = await env.call(`${pins}/${pin.id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': 'abc' }, body: { address: 'elsewhere' } })
    expect(bad.status).toBe(400)
    expect((await pool.query<{ row_version: number, address: string }>('select row_version, address from content.places where id = $1', [pin.id])).rows[0]).toEqual({ row_version: 2, address: 'Kapellbrücke, Lucerne' })
  })

  it('[E2.6] a pin id that is not a uuid answers 400, and one that names no pin of the store answers 404', async () => {
    const { owner, pins } = await env.storeWithStaff()

    expect((await env.call(`${pins}/not-a-uuid`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: {} })).status).toBe(400)
    expect((await env.call(`${pins}/not-a-uuid`, { method: 'DELETE', headers: { ...owner.headers, 'If-Match': '1' } })).status).toBe(400)
    const missing = await env.call(`${pins}/${randomUUID()}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: {} })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ type: 'not-found' })
  })

  it('[E2.6] a repeated command with the same Idempotency-Key and body replays the first response and writes one audit row', async () => {
    const { owner, pins } = await env.storeWithStaff()
    const created = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Lion Monument' }, ...located, slug: { en: slugFor() } } })).json() as { id: string }
    const publish = (key: string) => env.call(`${pins}/${created.id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' }, key })
    const key = `publish-${randomUUID()}`

    const first = await publish(key)
    const again = await publish(key)

    expect(first.status).toBe(200)
    expect(first.headers.get('Idempotent-Replayed')).toBeNull()
    expect(again.status).toBe(200)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(again.headers.get('ETag')).toBe('"2"')
    expect(await again.json()).toEqual(await first.json())
    expect(await auditRows(created.id)).toHaveLength(1)
    expect((await pool.query<{ row_version: number }>('select row_version from content.places where id = $1', [created.id])).rows[0]?.row_version).toBe(2)
    // A different key is a new command, and the version it names is stale now.
    expect((await publish(`publish-${randomUUID()}`)).status).toBe(412)
  })

  // D11: a 412 is stored and replayed like any refusal, and If-Match is part of the request hash.
  it('[E2.6] a 412 is replayed for the same key and If-Match, a newer If-Match under that key is 422, and under a new key it runs', async () => {
    const { owner, pins } = await env.storeWithStaff()
    const created = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Museggmauer' }, ...located, slug: { en: slugFor() } } })).json() as { id: string }
    const publish = (key: string, version: string) => env.call(`${pins}/${created.id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': version }, key })
    const key = `publish-${randomUUID()}`

    const stale = await publish(key, '7')
    expect(stale.status).toBe(412)
    const replayed = await publish(key, '7')
    expect(replayed.status).toBe(412)
    expect(replayed.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await auditRows(created.id)).toHaveLength(0)

    // The same key with the version the client has now is another request, not a replay of the 412.
    expect((await publish(key, '1')).status).toBe(422)
    const retried = await publish(`publish-${randomUUID()}`, '1')
    expect(retried.status).toBe(200)
    expect(retried.headers.get('Idempotent-Replayed')).toBeNull()
    expect((await pool.query<{ row_version: number, status: string }>('select row_version, status from content.places where id = $1', [created.id])).rows[0]).toEqual({ row_version: 2, status: 'published' })
    expect(await auditRows(created.id)).toHaveLength(1)
  })

  it('[E2.6] a create replayed with the same key makes one pin', async () => {
    const { owner, pins, storeId } = await env.storeWithStaff()
    const key = `create-${randomUUID()}`
    const body = { title: { en: 'Water Tower' } }

    const first = await env.call(pins, { method: 'POST', headers: owner.headers, body, key })
    const again = await env.call(pins, { method: 'POST', headers: owner.headers, body, key })

    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect((await again.json() as { id: string }).id).toBe((await first.json() as { id: string }).id)
    expect(await count(pool, 'select count(*) from content.places where store_id = $1', [storeId])).toBe(1)
  })

  it('[E2.6] AC-7 owner and manager of the store write, the owner of another store gets 403', async () => {
    const lucerne = await env.storeWithStaff()
    const zug = await env.storeWithStaff()

    expect((await env.call(lucerne.pins, { method: 'POST', headers: lucerne.owner.headers, body: { title: { en: 'By the owner' } } })).status).toBe(201)
    expect((await env.call(lucerne.pins, { method: 'POST', headers: lucerne.manager.headers, body: { title: { en: 'By the manager' } } })).status).toBe(201)
    const refused = await env.call(lucerne.pins, { method: 'POST', headers: zug.owner.headers, body: { title: { en: 'By a stranger' } } })
    expect(refused.status).toBe(403)
    expect(await refused.json()).toMatchObject({ type: 'forbidden' })
    expect((await env.call(lucerne.pins, { method: 'POST', body: { title: { en: 'Nobody' } } })).status).toBe(401)
    expect(await count(pool, 'select count(*) from content.places where store_id = $1', [lucerne.storeId])).toBe(2)
    expect(await count(pool, 'select count(*) from content.places where store_id = $1', [zug.storeId])).toBe(0)
  })

  it('[E2.6] a pin of another store cannot be saved, published, hidden or deleted through my store: 404', async () => {
    const lucerne = await env.storeWithStaff()
    const zug = await env.storeWithStaff()
    const theirs = await (await env.call(zug.pins, { method: 'POST', headers: zug.owner.headers, body: { title: { en: 'Theirs' } } })).json() as { id: string }
    const headers = { ...lucerne.owner.headers, 'If-Match': '1' }

    expect((await env.call(`${lucerne.pins}/${theirs.id}`, { method: 'PATCH', headers, body: { address: 'mine now' } })).status).toBe(404)
    expect((await env.call(`${lucerne.pins}/${theirs.id}/publish`, { method: 'POST', headers })).status).toBe(404)
    expect((await env.call(`${lucerne.pins}/${theirs.id}/hide`, { method: 'POST', headers })).status).toBe(404)
    expect((await env.call(`${lucerne.pins}/${theirs.id}`, { method: 'DELETE', headers })).status).toBe(404)
    expect(await count(pool, 'select count(*) from content.places where id = $1 and address is null', [theirs.id])).toBe(1)
  })

  it('[E2.6][AC30] over HTTP a live English pin gains German with a slug body, and a taken or missing German slug is refused', async () => {
    const { owner, pins } = await env.storeWithStaff()
    const { id } = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Chapel Bridge' }, ...located, slug: { en: slugFor() } } })).json() as { id: string }
    expect((await env.call(`${pins}/${id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' } })).status).toBe(200)
    const bilingual = { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }
    await env.call(`${pins}/${id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '2' }, body: bilingual })
    const publish = (body?: object) => env.call(`${pins}/${id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '3' }, body })

    const missing = await publish()
    expect(missing.status).toBe(422)
    expect(await missing.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ path: 'slug' }] })

    const taken = slugFor()
    await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Lion Monument', de: 'Loewendenkmal' }, slug: { en: slugFor(), de: taken } } })
    const clash = await publish({ slug: { de: taken } })
    expect(clash.status).toBe(409)
    expect(await clash.json()).toMatchObject({ type: 'content-slug-taken' })
    expect((await pool.query('select row_version, status from content.places where id = $1', [id])).rows[0]).toEqual({ row_version: 3, status: 'published' })

    const de = slugFor()
    const done = await publish({ slug: { de } })
    expect(done.status).toBe(200)
    expect(await done.json()).toMatchObject({ rowVersion: 4, slug: { de }, published: { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } } })
  })

  it('[E2.6][AC85] publish end to end writes the audit row and the response has mainStoryGroupId null', async () => {
    const { owner, pins, storeId } = await env.storeWithStaff()
    const created = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Chapel Bridge' } } })).json() as { id: string }

    const incomplete = await env.call(`${pins}/${created.id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' } })
    expect(incomplete.status).toBe(422)
    expect(await incomplete.json()).toMatchObject({ type: 'publish-incomplete', errors: expect.arrayContaining([expect.objectContaining({ path: 'slug' }), expect.objectContaining({ path: 'location' })]) })
    expect(await auditRows(created.id)).toEqual([])

    const saved = await env.call(`${pins}/${created.id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: { ...located, slug: { en: slugFor() } } })
    const published = await env.call(`${pins}/${created.id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': saved.headers.get('ETag')! } })

    expect(published.status).toBe(200)
    expect(published.headers.get('ETag')).toBe('"3"')
    const body = await published.json() as { status: string, mainStoryGroupId: null, draft: null, published: { title: { en: string } }, firstPublishedAt: string }
    expect(body).toMatchObject({ status: 'published', mainStoryGroupId: null, draft: null, published: { title: { en: 'Chapel Bridge' } }, rowVersion: 3 })
    expect(body.firstPublishedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
    const [row, ...rest] = await auditRows(created.id)
    expect(rest).toEqual([])
    expect(row).toMatchObject({ entity: 'pin', action: 'published', store_id: storeId })
    expect(row?.request_id).toMatch(uuidPattern)
  })

  it('[E2.6][AC79] hide writes the audit row, and a pin that was published cannot be deleted', async () => {
    const { owner, manager, pins, storeId } = await env.storeWithStaff()
    const created = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Lion Monument' }, ...located, slug: { en: slugFor() } } })).json() as { id: string }
    await env.call(`${pins}/${created.id}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' } })

    const hidden = await env.call(`${pins}/${created.id}/hide`, { method: 'POST', headers: { ...manager.headers, 'If-Match': '2' } })

    expect(hidden.status).toBe(200)
    expect(hidden.headers.get('ETag')).toBe('"3"')
    expect(await hidden.json()).toMatchObject({ status: 'hidden', rowVersion: 3, published: { title: { en: 'Lion Monument' } } })
    const rows = await auditRows(created.id)
    expect(rows.map(row => row.action)).toEqual(['published', 'hidden'])
    expect(rows[1]).toMatchObject({ entity: 'pin', store_id: storeId })
    expect(rows[1]?.request_id).toMatch(uuidPattern)

    const removed = await env.call(`${pins}/${created.id}`, { method: 'DELETE', headers: { ...owner.headers, 'If-Match': '3' } })
    expect(removed.status).toBe(409)
    expect(await removed.json()).toMatchObject({ type: 'published-cannot-be-deleted', title: 'A published item cannot be deleted. Hide it instead.' })
  })

  it('[E2.6] a draft pin is deleted with 204, and then it is gone', async () => {
    const { owner, pins } = await env.storeWithStaff()
    const created = await (await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Draft' } } })).json() as { id: string }

    const missing = await env.call(`${pins}/${created.id}`, { method: 'DELETE', headers: owner.headers })
    const stale = await env.call(`${pins}/${created.id}`, { method: 'DELETE', headers: { ...owner.headers, 'If-Match': '2' } })
    expect(missing.status).toBe(428)
    expect(await missing.json()).toMatchObject({ type: 'precondition-required' })
    expect(stale.status).toBe(412)
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect(await count(pool, 'select count(*) from content.places where id = $1', [created.id])).toBe(1)

    const removed = await env.call(`${pins}/${created.id}`, { method: 'DELETE', headers: { ...owner.headers, 'If-Match': '1' } })

    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe('')
    expect(await count(pool, 'select count(*) from content.places where id = $1', [created.id])).toBe(0)
    expect((await env.call(`${pins}/${created.id}`, { method: 'DELETE', headers: { ...owner.headers, 'If-Match': '1' } })).status).toBe(404)
  })

  it('[E2.6] a slug another pin of the store holds answers 409 content-slug-taken, never 500', async () => {
    const { owner, pins } = await env.storeWithStaff()
    const slug = slugFor()
    await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'One' }, slug: { en: slug } } })

    const second = await env.call(pins, { method: 'POST', headers: owner.headers, body: { title: { en: 'Two' }, slug: { en: slug } } })

    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ type: 'content-slug-taken' })
  })
})
