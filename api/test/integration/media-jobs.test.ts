import type { MediaQueues } from '../../src/modules/content/adapters/media-jobs.ts'
import type { MediaFailure } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { confirmedKey, originalKey } from '@sk/domain/content'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { createMediaQueues, startMediaWorkers } from '../../src/modules/content/adapters/media-jobs.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { checkMedia } from '../../src/modules/content/application/check-media.ts'
import { makeFailMedia } from '../../src/modules/content/application/fail-media.ts'
import { makeProcessMedia } from '../../src/modules/content/application/process-media.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createFakeStorage } from '../support/fake-storage.ts'
import { jpegWithGps, undecodableJpeg } from '../support/images.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { openTestDatabase, silentLogger } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

async function until(done: () => Promise<boolean> | boolean, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs
  while (!(await done())) {
    if (Date.now() > deadline)
      throw new Error('timed out')
    await sleep(100)
  }
}

// Each test runs on its own queues, so its worker sees only its own jobs.
async function setup(bytes: Uint8Array) {
  const suffix = randomUUID().slice(0, 8)
  const queues: MediaQueues = { process: `media-e2-7-${suffix}`, failed: `media-failed-e2-7-${suffix}`, retire: `media-retire-e2-7-${suffix}`, sweep: `media-sweep-e2-7-${suffix}` }
  await createMediaQueues(jobs.boss, queues, { retryLimit: 1, retryDelay: 1, retryBackoff: false })
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const uow = createUnitOfWork(db)
  const media = createMediaRepository()
  const alerts: MediaFailure[] = []
  const retired: object[] = []
  const storeId = randomUUID()
  const mediaId = randomUUID()
  storage.seed('uploads', confirmedKey(storeId, mediaId, 'jpg'), bytes, { contentType: 'image/jpeg' })
  await uow.run(tx => media.insert(tx, { id: mediaId, storeId, kind: 'image', storageKey: originalKey(storeId, mediaId, 'jpg'), contentType: 'image/jpeg', byteSize: bytes.byteLength, sha256: 'c'.repeat(64) }, clock.now()))
  await startMediaWorkers(jobs.boss, {
    processMedia: makeProcessMedia({ uow, media, storage, clock }),
    failMedia: makeFailMedia({ uow, media, storage, clock, alert: failure => alerts.push(failure) }),
    retireMedia: async job => void retired.push(job),
    sweepMedia: async () => ({ removed: 0 }),
  }, queues)
  const status = async () => (await pool.query<{ status: string }>('select status from content.media where id = $1', [mediaId])).rows[0]?.status
  const send = () => uow.run(tx => createJobQueue(jobs.boss).send(tx, queues.process, { storeId, mediaId }))
  return { queues, storage, uow, media, alerts, retired, storeId, mediaId, status, send }
}

describe('[E2.7] the media job on real pg-boss', () => {
  it('[E2.7] an image that cannot be decoded ends retired through the dead-letter handler, and a cover set to it is refused', async () => {
    const t = await setup(undecodableJpeg)

    await t.send()
    await until(async () => await t.status() === 'retired' && t.alerts.length === 1)

    expect(t.alerts).toEqual([{ storeId: t.storeId, mediaId: t.mediaId }])
    expect(t.storage.objects('uploads').size).toBe(0)
    expect(t.storage.objects('media').size).toBe(0)
    expect(await t.uow.run(tx => checkMedia(t.media, tx, t.storeId, [{ id: t.mediaId, kind: 'image' }]))).toEqual({ reason: 'media-retired' })
  })

  it('[E2.7] a failed file that a story uses stays processing, is purged, and raises the in-use alert without a trigger error', async () => {
    const t = await setup(undecodableJpeg)
    await pool.query(`insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot) values ($1, $2, 'story_version', $3, 'en', 'draft')`, [t.storeId, t.mediaId, randomUUID()])

    await t.send()
    await until(() => t.alerts.length === 1)

    expect(t.alerts).toEqual([{ storeId: t.storeId, mediaId: t.mediaId, inUse: true }])
    expect(await t.status()).toBe('processing')
    expect(t.storage.objects('uploads').size).toBe(0)
    expect(t.storage.objects('media').size).toBe(0)
  })

  it('[E2.7] a readable image is made ready by the worker', async () => {
    const t = await setup(await jpegWithGps(900, 600))

    await t.send()
    await until(async () => await t.status() === 'ready' && t.storage.objects('uploads').size === 0)

    const { rows } = await pool.query('select width, height from content.media where id = $1', [t.mediaId])
    expect(rows[0]).toEqual({ width: 900, height: 600 })
    expect(t.storage.objects('uploads').size).toBe(0)
    expect(t.alerts).toEqual([])
  })

  it('[E2.7] the sweep runs from an hourly schedule, and a due retire job runs the handler', async () => {
    const t = await setup(await jpegWithGps(100, 100))

    await t.uow.run(tx => createJobQueue(jobs.boss).send(tx, t.queues.retire, { storeId: t.storeId, mediaId: t.mediaId }, { startAfter: new Date(Date.now() - 1000) }))
    await until(() => t.retired.length > 0)

    expect(t.retired).toEqual([{ storeId: t.storeId, mediaId: t.mediaId }])
    expect((await jobs.boss.getSchedules(t.queues.sweep)).map(row => row.cron)).toEqual(['17 * * * *'])
  })

  it('[E2.7] the retire and sweep queues carry the media retry policy, like the process queue', async () => {
    const t = await setup(await jpegWithGps(100, 100))
    for (const name of [t.queues.process, t.queues.retire, t.queues.sweep]) {
      expect(await jobs.boss.getQueue(name), name).toMatchObject({ retryLimit: 1, retryDelay: 1, retryBackoff: false })
    }
  })
})
