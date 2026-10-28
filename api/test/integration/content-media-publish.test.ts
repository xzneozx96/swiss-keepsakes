import { randomUUID } from 'node:crypto'
import { emptyStoryBody } from '@sk/domain/content'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createContentHttp } from './content-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const env = createContentHttp({ pool, db })

async function processingMedia(storeId: string, kind: 'image' | 'pdf'): Promise<string> {
  const contentType = kind === 'pdf' ? 'application/pdf' : 'image/jpeg'
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, $2, $3, $4, 10, repeat('a', 64), 'processing') returning id`,
    [storeId, kind, `${storeId}/${randomUUID()}`, contentType],
  )
  return rows[0]!.id
}

const markReady = (id: string) => pool.query(`update content.media set status = 'ready' where id = $1`, [id])

describe('[E2.7] publish while a file is still processing, over HTTP', () => {
  it('[E2.7] a tour whose PDF is processing answers 422 media-processing, then 200 once the PDF is ready', async () => {
    const staff = await env.storeWithStaff()
    const pdf = await processingMedia(staff.storeId, 'pdf')
    const made = await env.call(staff.tours, { method: 'POST', headers: staff.owner.headers, body: { slug: { en: `tour-${randomUUID().slice(0, 8)}` }, pdfMediaId: pdf, draft: { title: { en: 'Old town walk' } } } })
    expect(made.status).toBe(201)
    const tour = await made.json() as { id: string }
    const publish = () => env.call(`${staff.tours}/${tour.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    const refused = await publish()
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ type: 'media-processing', title: 'A file is still being processed. Publish again in a moment.' })

    await markReady(pdf)
    expect((await publish()).status).toBe(200)
  })

  it('[E2.7] a story whose cover is processing answers 422 media-processing, then 200 once the cover is ready', async () => {
    const staff = await env.storeWithStaff()
    const cover = await processingMedia(staff.storeId, 'image')
    const group = await (await env.call(staff.groups, { method: 'POST', headers: staff.owner.headers, body: {} })).json() as { id: string }
    const draft = { title: 'A day on the lake', excerpt: '', authorName: '', authorRole: '', coverMediaId: cover, body: emptyStoryBody }
    const made = await env.call(`${staff.groups}/${group.id}/versions`, { method: 'POST', headers: staff.owner.headers, body: { language: 'en', slug: `story-${randomUUID().slice(0, 8)}`, draft } })
    expect(made.status).toBe(201)
    const publish = () => env.call(`${staff.groups}/${group.id}/versions/en/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    const refused = await publish()
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ type: 'media-processing' })

    await markReady(cover)
    expect((await publish()).status).toBe(200)
  })

  it('[E2.7] saving a published tour that points at a processing PDF answers 422 media-processing, then 200 once it is ready', async () => {
    const staff = await env.storeWithStaff()
    const pdf = await processingMedia(staff.storeId, 'pdf')
    const next = await processingMedia(staff.storeId, 'pdf')
    await markReady(pdf)
    const made = await env.call(staff.tours, { method: 'POST', headers: staff.owner.headers, body: { slug: { en: `tour-${randomUUID().slice(0, 8)}` }, pdfMediaId: pdf, draft: { title: { en: 'Old town walk' } } } })
    const tour = await made.json() as { id: string }
    expect((await env.call(`${staff.tours}/${tour.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })).status).toBe(200)
    const save = () => env.call(`${staff.tours}/${tour.id}`, { method: 'PATCH', headers: { ...staff.owner.headers, 'If-Match': '2' }, body: { pdfMediaId: next } })

    const refused = await save()
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ type: 'media-processing' })

    await markReady(next)
    expect((await save()).status).toBe(200)
  })
})
