import type { Media } from '@sk/api-contract'
import type { Tx } from '../../src/platform/db/client.ts'
import type { JobQueue } from '../../src/platform/jobs/queue.ts'
import type { FakeStorage } from '../support/fake-storage.ts'
import { randomUUID } from 'node:crypto'
import { mediaPrefix } from '@sk/domain/content'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { createMediaQueues } from '../../src/modules/content/adapters/media-jobs.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { makeProcessMedia } from '../../src/modules/content/application/process-media.ts'
import { makeRetireMedia } from '../../src/modules/content/application/retire-media.ts'
import { makeSweepUploads } from '../../src/modules/content/application/sweep-uploads.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createUnconfiguredStorage } from '../../src/platform/storage.ts'
import { createFakeStorage } from '../support/fake-storage.ts'
import { jpegWithGps } from '../support/images.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { startMain } from '../support/process.ts'
import { createContentHttp } from './content-http.ts'
import { openTestDatabase, silentLogger } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const HOUR = 3_600_000
const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>
const stores: string[] = []

// The queues are the real ones, created the way main.ts creates them, so a confirm can send its job.
beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  await createMediaQueues(jobs.boss)
})

// This file's jobs are removed so a worker started by another test file never finds them.
afterAll(async () => {
  await pool.query(`delete from pgboss.job where name like 'media-%' and data->>'storeId' = any($1)`, [stores])
  await jobs.stop()
  await pool.end()
})

const uow = createUnitOfWork(db)
const media = createMediaRepository()
const pdfBytes = (tag: string) => new TextEncoder().encode(`%PDF-1.4\n% ${tag}\n1 0 obj\n`)

// One shop: a manual clock that the fake storage and the use cases share, the real pg-boss queue, the job handlers
// the worker would run, called directly so a test decides when "the job runs".
function setup(storage?: FakeStorage) {
  const clock = createManualClock(new Date())
  const fake = storage ?? createFakeStorage(clock)
  const queue = createJobQueue(jobs.boss)
  const sent: { queue: string, data: object, startAfter?: Date }[] = []
  const recording: JobQueue<Tx> = {
    send: async (tx, name, data, options) => {
      sent.push({ queue: name, data, startAfter: options?.startAfter })
      await queue.send(tx, name, data, options)
    },
  }
  const env = createContentHttp({ pool, db }, undefined, { storage: fake, jobs: recording, clock })
  const run = {
    process: makeProcessMedia({ uow, media, storage: fake, clock }),
    retire: makeRetireMedia({ uow, media, storage: fake, clock }),
    sweep: makeSweepUploads({ storage: fake, clock }),
  }
  type Staff = Awaited<ReturnType<typeof env.storeWithStaff>>

  async function staff(): Promise<Staff> {
    const made = await env.storeWithStaff()
    stores.push(made.storeId)
    return made
  }

  // Asks for the upload, "PUTs" into the fake bucket under the returned key with the type the grant names, confirms.
  async function upload(s: Staff, bytes: Uint8Array, contentType: string, put = true) {
    const asked = await env.call(`/api/store/${s.storeId}/media/uploads`, { method: 'POST', headers: s.owner.headers, body: { contentType, byteSize: bytes.byteLength } })
    expect(asked.status).toBe(200)
    const grant = await asked.json() as { uploadKey: string, method: string, headers: Record<string, string> }
    expect(grant.method).toBe('PUT')
    if (put)
      fake.seed('uploads', grant.uploadKey, bytes, { contentType: grant.headers['Content-Type'] })
    return grant
  }
  const confirm = (s: Staff, uploadKey: string) => env.call(`/api/store/${s.storeId}/media/confirm`, { method: 'POST', headers: s.owner.headers, body: { uploadKey } })
  const getMedia = async (s: Staff, id: string) => (await (await env.call(`/api/store/${s.storeId}/media/${id}`, { headers: s.owner.headers })).json()) as Media

  // Upload, confirm, run the job: a ready PDF.
  async function readyPdf(s: Staff, tag: string) {
    const grant = await upload(s, pdfBytes(tag), 'application/pdf')
    const confirmed = await confirm(s, grant.uploadKey)
    expect(confirmed.status).toBe(201)
    const row = await confirmed.json() as Media
    await run.process({ storeId: s.storeId, mediaId: row.id })
    return row.id
  }
  const key = async (id: string) => (await pool.query<{ storage_key: string }>('select storage_key from content.media where id = $1', [id])).rows[0]!.storage_key
  const status = async (id: string) => (await pool.query<{ status: string, retired_at: Date | null }>('select status, retired_at from content.media where id = $1', [id])).rows[0]!

  async function tourWith(s: Staff, pdfMediaId: string, publish = true) {
    const made = await env.call(s.tours, { method: 'POST', headers: s.owner.headers, body: { slug: { en: `tour-${randomUUID().slice(0, 8)}` }, pdfMediaId, draft: { title: { en: 'Old town walk' } } } })
    expect(made.status).toBe(201)
    const tour = await made.json() as { id: string, slug: { en: string } }
    if (publish)
      expect((await env.call(`${s.tours}/${tour.id}/publish`, { method: 'POST', headers: { ...s.owner.headers, 'If-Match': '1' } })).status).toBe(200)
    return tour
  }
  const saveTour = (s: Staff, tourId: string, rowVersion: number, body: object) => env.call(`${s.tours}/${tourId}`, { method: 'PATCH', headers: { ...s.owner.headers, 'If-Match': String(rowVersion) }, body })
  const publicPdfKey = async (slug: string) => ((await (await env.call(`/api/public/tours/${slug}?lang=en`)).json()) as { pdfKey: string }).pdfKey
  const retireJobs = async (id: string) => (await pool.query<{ start_after: Date }>(`select start_after from pgboss.job where name = 'media-retire' and data->>'mediaId' = $1`, [id])).rows

  return { clock, storage: fake, env, run, sent, staff, upload, confirm, getMedia, readyPdf, key, status, tourWith, saveTour, publicPdfKey, retireJobs }
}

describe('[E2.7] the media pipeline over HTTP, real database, real pg-boss queues, real sharp', () => {
  it('[E2.7] a JPEG with GPS goes from upload request to a ready row with variants, and no stored file carries a location', async () => {
    const t = setup()
    const s = await t.staff()
    const input = await jpegWithGps(2000, 1200)
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const grant = await t.upload(s, input, 'image/jpeg')
    const confirmed = await t.confirm(s, grant.uploadKey)
    expect(confirmed.status).toBe(201)
    const created = await confirmed.json() as Media
    expect(created).toMatchObject({ kind: 'image', status: 'processing', publicUrl: null, variants: [] })
    expect(t.sent.filter(job => job.queue === 'media-process').map(job => job.data)).toEqual([{ storeId: s.storeId, mediaId: created.id }])

    await t.run.process({ storeId: s.storeId, mediaId: created.id })

    const ready = await t.getMedia(s, created.id)
    expect(ready).toMatchObject({ status: 'ready', width: 2000, height: 1200, contentType: 'image/jpeg' })
    expect(ready.publicUrl).toBe(`https://storage.test/media/${await t.key(created.id)}`)
    expect(ready.variants.map(v => v.width)).toEqual([320, 640, 1280, 1920])
    const stored = t.storage.objects('media')
    expect([...stored.keys()].sort()).toEqual([await t.key(created.id), ...ready.variants.map(v => v.url.replace('https://storage.test/media/', ''))].sort())
    for (const [name, object] of stored) {
      expect((await sharp(object.body).metadata()).exif, name).toBeUndefined()
      expect(object.cacheControl, name).toBe('public, max-age=31536000, immutable')
    }
    expect(t.storage.objects('uploads').size).toBe(0)
  })

  it('[E2.7][AC51] a replaced PDF: the public guide shows K2 at once, K1 stays for 24 h, then the retire job removes it', async () => {
    const t = setup()
    const s = await t.staff()
    const k1 = await t.readyPdf(s, 'one')
    const tour = await t.tourWith(s, k1)
    const k1Key = await t.key(k1)
    expect(await t.publicPdfKey(tour.slug.en)).toBe(k1Key)

    const k2 = await t.readyPdf(s, 'two')
    const k2Key = await t.key(k2)
    expect(k2Key).not.toBe(k1Key)
    expect((await t.saveTour(s, tour.id, 2, { pdfMediaId: k2 })).status).toBe(200)

    expect(await t.publicPdfKey(tour.slug.en)).toBe(k2Key)
    expect(t.storage.objects('media').has(k1Key)).toBe(true)
    expect(t.storage.objects('media').has(k2Key)).toBe(true)
    const [queued, ...others] = await t.retireJobs(k1)
    expect(others).toEqual([])
    expect(queued!.start_after.getTime()).toBe(t.clock.now().getTime() + 24 * HOUR)

    // Just inside the grace period nothing is due by the clock; the handler is what removes, once the job is due.
    t.clock.advance(24 * HOUR + 1000)
    await t.run.retire({ storeId: s.storeId, mediaId: k1 })

    expect(await t.status(k1)).toMatchObject({ status: 'retired', retired_at: expect.any(Date) })
    expect([...t.storage.objects('media').keys()].filter(name => name.startsWith(mediaPrefix(s.storeId, k1)))).toEqual([])
    expect(t.storage.objects('media').has(k2Key)).toBe(true)
    expect((await t.status(k2)).status).toBe('ready')
  })

  it('[E2.7][AC51] an old PDF that a second tour still references stays when its retire job runs', async () => {
    const t = setup()
    const s = await t.staff()
    const k1 = await t.readyPdf(s, 'shared')
    const first = await t.tourWith(s, k1)
    await t.tourWith(s, k1)
    const k2 = await t.readyPdf(s, 'replacement')
    expect((await t.saveTour(s, first.id, 2, { pdfMediaId: k2 })).status).toBe(200)
    expect(await t.retireJobs(k1)).toHaveLength(1)

    t.clock.advance(25 * HOUR)
    await t.run.retire({ storeId: s.storeId, mediaId: k1 })

    expect((await t.status(k1)).status).toBe('ready')
    expect(t.storage.objects('media').has(await t.key(k1))).toBe(true)
  })

  it('[E2.7][AC51] the tour holds B only, and removing the PDF of a published tour is 422 publish-incomplete and queues no job', async () => {
    const t = setup()
    const s = await t.staff()
    const a = await t.readyPdf(s, 'a')
    const b = await t.readyPdf(s, 'b')
    const tour = await t.tourWith(s, a)

    expect((await t.saveTour(s, tour.id, 2, { pdfMediaId: b })).status).toBe(200)
    const { rows } = await pool.query<{ pdf_media_id: string }>('select pdf_media_id from content.tours where id = $1', [tour.id])
    expect(rows).toEqual([{ pdf_media_id: b }])
    expect(await t.publicPdfKey(tour.slug.en)).toBe(await t.key(b))

    const sentBefore = t.sent.length
    const refused = await t.saveTour(s, tour.id, 3, { pdfMediaId: null })
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ type: 'publish-incomplete' })
    expect(t.sent).toHaveLength(sentBefore)
    expect(await t.retireJobs(b)).toEqual([])
    expect((await pool.query('select pdf_media_id from content.tours where id = $1', [tour.id])).rows).toEqual([{ pdf_media_id: b }])
  })

  it('[E2.7] a PDF that is still processing blocks publish with 422 media-processing, and publish works once the job made it ready', async () => {
    const t = setup()
    const s = await t.staff()
    const grant = await t.upload(s, pdfBytes('slow'), 'application/pdf')
    const row = await (await t.confirm(s, grant.uploadKey)).json() as Media
    const tour = await t.tourWith(s, row.id, false)
    const publish = () => t.env.call(`${s.tours}/${tour.id}/publish`, { method: 'POST', headers: { ...s.owner.headers, 'If-Match': '1' } })

    const refused = await publish()
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ type: 'media-processing' })

    await t.run.process({ storeId: s.storeId, mediaId: row.id })
    expect((await publish()).status).toBe(200)
  })

  it('[E2.7] the sweep removes an upload nobody confirmed after 24 h and leaves a confirmed one, whose source goes only after 168 h', async () => {
    const t = setup()
    const s = await t.staff()
    const abandoned = await t.upload(s, pdfBytes('abandoned'), 'application/pdf')
    const confirmedGrant = await t.upload(s, pdfBytes('confirmed'), 'application/pdf')
    const row = await (await t.confirm(s, confirmedGrant.uploadKey)).json() as Media
    const source = [...t.storage.objects('uploads').keys()].filter(name => name.startsWith('confirmed/'))
    expect(source).toHaveLength(1)

    t.clock.advance(23 * HOUR)
    expect(await t.run.sweep()).toEqual({ removed: 0 })

    t.clock.advance(2 * HOUR)
    expect(await t.run.sweep()).toEqual({ removed: 1 })
    expect(t.storage.objects('uploads').has(abandoned.uploadKey)).toBe(false)
    expect([...t.storage.objects('uploads').keys()]).toEqual(source)
    expect((await t.status(row.id)).status).toBe('processing')

    t.clock.advance(145 * HOUR)
    expect(await t.run.sweep()).toEqual({ removed: 1 })
    expect(t.storage.objects('uploads').size).toBe(0)
  })
})

describe('[E2.7] queue wiring', () => {
  it('[E2.7] confirm over the real pg-boss queues puts one media-process job in the database, in the confirm transaction', async () => {
    const t = setup()
    const s = await t.staff()
    const grant = await t.upload(s, pdfBytes('queued'), 'application/pdf')

    const confirmed = await t.confirm(s, grant.uploadKey)

    expect(confirmed.status).toBe(201)
    const row = await confirmed.json() as Media
    const { rows } = await pool.query<{ state: string }>(`select state from pgboss.job where name = 'media-process' and data->>'mediaId' = $1`, [row.id])
    expect(rows).toHaveLength(1)
  })

  it.each(['api', 'worker'])('[E2.7] ROLE=%s creates the media queues at startup, the process queue pointing at its dead-letter queue', async (role) => {
    const { rows: [started] } = await pool.query<{ now: Date }>('select now()')
    const run = startMain({ ROLE: role, PORT: '0', HOST: '127.0.0.1', DATABASE_URL: inject('databaseUrl'), DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled') })
    await run.waitFor('started')
    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)

    // updateQueue runs at every start, so a queue touched after `started` was written by this process.
    const { rows } = await pool.query<{ name: string, dead_letter: string | null, updated_on: Date }>(`select name, dead_letter, updated_on from pgboss.queue where name in ('media-process', 'media-process-failed', 'media-retire', 'media-sweep') order by name`)
    expect(rows.map(row => [row.name, row.dead_letter])).toEqual([['media-process', 'media-process-failed'], ['media-process-failed', null], ['media-retire', null], ['media-sweep', null]])
    expect(rows.find(row => row.name === 'media-process')!.updated_on.getTime()).toBeGreaterThanOrEqual(started!.now.getTime())
    // The startup warning names AWS_*, never a variable's value.
    expect(run.output()).not.toMatch(/AWS_[A-Z]/)
  })

  // Only the worker role starts the retire and sweep workers. pg-boss keeps no table of live workers, so the
  // schedule row (written by startMediaWorkers) is what proves that main.ts reached it; the retire worker itself is
  // proved by the media-jobs integration test.
  it('[E2.7] ROLE=worker writes the hourly media-sweep schedule at startup', async () => {
    const { rows: [started] } = await pool.query<{ now: Date }>('select now()')
    const run = startMain({ ROLE: 'worker', PORT: '0', HOST: '127.0.0.1', DATABASE_URL: inject('databaseUrl'), DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled') })
    await run.waitFor('started')
    run.child.kill('SIGTERM')
    expect(await run.exited).toBe(0)

    const { rows } = await pool.query<{ cron: string, updated_on: Date }>(`select cron, updated_on from pgboss.schedule where name = 'media-sweep'`)
    expect(rows.map(row => row.cron)).toEqual(['17 * * * *'])
    expect(rows[0]!.updated_on.getTime()).toBeGreaterThanOrEqual(started!.now.getTime())
  })
})

describe('[E2.7] no AWS_* configured', () => {
  it('[E2.7] request-upload answers 503 storage-unavailable, a processing row can still be read, and the tour routes and /healthz work', async () => {
    const t = setup()
    const unavailable = createContentHttp({ pool, db }, undefined, { storage: createUnconfiguredStorage(), jobs: { send: async () => {} }, clock: t.clock })
    const s = await unavailable.storeWithStaff()
    const call = (path: string, init?: Parameters<typeof unavailable.call>[1]) => unavailable.call(path, { headers: s.owner.headers, ...init })

    const asked = await call(`/api/store/${s.storeId}/media/uploads`, { method: 'POST', body: { contentType: 'image/jpeg', byteSize: 1000 } })
    expect(asked.status).toBe(503)
    expect(await asked.json()).toMatchObject({ type: 'storage-unavailable' })

    const { rows: [processing] } = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'pdf', $2, 'application/pdf', 10, repeat('a', 64), 'processing') returning id`,
      [s.storeId, `${s.storeId}/${randomUUID()}/original.pdf`],
    )
    const read = await call(`/api/store/${s.storeId}/media/${processing!.id}`)
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({ status: 'processing', publicUrl: null })

    const { rows: [ready] } = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'pdf', $2, 'application/pdf', 10, repeat('b', 64), 'ready') returning id`,
      [s.storeId, `${s.storeId}/${randomUUID()}/original.pdf`],
    )
    const made = await call(s.tours, { method: 'POST', body: { slug: { en: `tour-${randomUUID().slice(0, 8)}` }, pdfMediaId: ready!.id, draft: { title: { en: 'Old town walk' } } } })
    expect(made.status).toBe(201)
    const tour = await made.json() as { id: string, slug: { en: string } }
    expect((await call(`${s.tours}/${tour.id}/publish`, { method: 'POST', headers: { ...s.owner.headers, 'If-Match': '1' } })).status).toBe(200)
    expect((await unavailable.call(`/api/public/tours/${tour.slug.en}?lang=en`)).status).toBe(200)
    expect((await unavailable.call('/healthz')).status).toBe(200)
  })
})
