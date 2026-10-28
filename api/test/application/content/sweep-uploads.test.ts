import { confirmedKey, originalKey } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeSweepUploads } from '../../../src/modules/content/application/sweep-uploads.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const id = (n: number) => `0190f0c2-0000-7000-8000-0000000000${n}0`
const hour = 3_600_000
const body = new Uint8Array([1])

function setup() {
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const ago = (hours: number) => new Date(clock.now().getTime() - hours * hour)
  return { storage, ago, sweep: makeSweepUploads({ storage, clock }), uploads: () => [...storage.objects('uploads').keys()].sort() }
}

describe('[E2.7] sweep-uploads', () => {
  it('[E2.7] an unconfirmed upload older than 24 hours is removed, a younger one stays', async () => {
    const t = setup()
    t.storage.seed('uploads', `${store}/${id(1)}.jpg`, body, { lastModified: t.ago(25) })
    t.storage.seed('uploads', `${store}/${id(2)}.jpg`, body, { lastModified: t.ago(23) })
    expect(await t.sweep()).toEqual({ removed: 1 })
    expect(t.uploads()).toEqual([`${store}/${id(2)}.jpg`])
  })

  it('[E2.7] a confirmed source younger than 7 days stays, an older one is removed', async () => {
    const t = setup()
    t.storage.seed('uploads', confirmedKey(store, id(1), 'jpg'), body, { lastModified: t.ago(24 * 6) })
    t.storage.seed('uploads', confirmedKey(store, id(2), 'jpg'), body, { lastModified: t.ago(24 * 7 + 1) })
    expect(await t.sweep()).toEqual({ removed: 1 })
    expect(t.uploads()).toEqual([confirmedKey(store, id(1), 'jpg')])
  })

  it('[E2.7] an object with no lastModified is kept, not a crash', async () => {
    const t = setup()
    t.storage.seed('uploads', `${store}/${id(1)}.jpg`, body, { lastModified: t.ago(99) })
    const real = t.storage.list
    t.storage.list = async (bucket, prefix) => (await real(bucket, prefix)).map(o => ({ ...o, lastModified: undefined }))
    expect(await t.sweep()).toEqual({ removed: 0 })
    expect(t.uploads()).toHaveLength(1)
  })

  it('[E2.7] a confirmed and processed media object is never touched, however old', async () => {
    const t = setup()
    const key = originalKey(store, id(1), 'jpg')
    t.storage.seed('media', key, body, { lastModified: t.ago(24 * 400) })
    expect(await t.sweep()).toEqual({ removed: 0 })
    expect(t.storage.objects('media').has(key)).toBe(true)
  })
})
