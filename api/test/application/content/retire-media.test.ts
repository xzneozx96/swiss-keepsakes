import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { originalKey, variantKey } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeRetireMedia } from '../../../src/modules/content/application/retire-media.ts'
import { createFakeMedia } from '../../support/fake-media.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'
const otherId = '0190f0c2-0000-7000-8000-0000000000f2'
const tx = null

function setup(status: MediaRecord['status'] = 'ready') {
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const key = originalKey(store, mediaId, 'pdf')
  const row: MediaRecord = { id: mediaId, storeId: store, kind: 'pdf', contentType: 'application/pdf', storageKey: key, byteSize: 3, sha256: 'a'.repeat(64), width: null, height: null, status }
  const media = createFakeMedia([row])
  storage.seed('media', key, new Uint8Array([1, 2, 3]))
  storage.seed('media', variantKey(key, 320), new Uint8Array([1]))
  storage.seed('media', originalKey(store, otherId, 'pdf'), new Uint8Array([9]))
  const uow = { run: <R>(work: (t: null) => Promise<R>) => work(tx) }
  return { storage, media, retire: makeRetireMedia({ uow, media, storage, clock }), keys: () => [...storage.objects('media').keys()] }
}

describe('[E2.7] retire-media', () => {
  it('[E2.7][AC51] a file nothing references any more is retired and its objects leave the media bucket, the other file stays', async () => {
    const t = setup()
    await t.retire({ storeId: store, mediaId })
    expect(t.media.rows.get(mediaId)?.status).toBe('retired')
    expect(t.keys()).toEqual([originalKey(store, otherId, 'pdf')])
  })

  it('[E2.7][AC51] a file a tour or a story still references stays, row and objects', async () => {
    const t = setup()
    t.media.referenced.add(mediaId)
    await t.retire({ storeId: store, mediaId })
    expect(t.media.rows.get(mediaId)?.status).toBe('ready')
    expect(t.keys()).toHaveLength(3)
  })

  it('[E2.7][AC51] a missing row is a no-op', async () => {
    const t = setup()
    await t.retire({ storeId: store, mediaId: otherId })
    expect(t.keys()).toHaveLength(3)
  })

  it('[E2.7][AC51] an already retired, unreferenced row is not updated again but the deletes still run, so a retry after a failed delete finishes', async () => {
    const t = setup('retired')
    await t.retire({ storeId: store, mediaId })
    expect(t.media.retiredAt.has(mediaId)).toBe(false)
    expect(t.keys()).toEqual([originalKey(store, otherId, 'pdf')])
  })

  it('[E2.7] a delete that fails leaves the row retired, and the retry removes the rest', async () => {
    const t = setup()
    const real = t.storage.delete
    let calls = 0
    t.storage.delete = async (bucket, key) => {
      if (++calls === 2)
        throw new Error('storage down')
      await real(bucket, key)
    }
    await expect(t.retire({ storeId: store, mediaId })).rejects.toThrow('storage down')
    expect(t.media.rows.get(mediaId)?.status).toBe('retired')
    t.storage.delete = real
    await t.retire({ storeId: store, mediaId })
    expect(t.keys()).toEqual([originalKey(store, otherId, 'pdf')])
  })
})
