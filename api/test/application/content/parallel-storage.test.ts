import type { ObjectStorage } from '../../../src/modules/content/ports.ts'
import { variantKey } from '@sk/domain/content'
import { describe, expect, it, vi } from 'vitest'
import { buildMediaObjects, MEDIA_CACHE_CONTROL } from '../../../src/modules/content/application/build-media-objects.ts'
import { deleteFolder } from '../../../src/modules/content/application/delete-objects.ts'
import { jpegWithGps } from '../../support/images.ts'

interface Call { bucket: string, key: string, meta?: object, settle: (error?: Error) => void }

// A storage whose put and delete never answer until the test says so, so a call that starts before the one before it
// has answered shows as started.
function slowStorage(listed: string[] = []) {
  const puts: Call[] = []
  const deletes: Call[] = []
  const wait = (calls: Call[], bucket: string, key: string, meta?: object) => new Promise<void>((resolve, reject) => {
    calls.push({ bucket, key, meta, settle: error => (error ? reject(error) : resolve()) })
  })
  const storage = {
    put: (bucket: string, key: string, _body: Uint8Array, meta: object) => wait(puts, bucket, key, meta),
    delete: (bucket: string, key: string) => wait(deletes, bucket, key),
    list: async () => listed.map(key => ({ key, size: 1, contentType: undefined, lastModified: undefined })),
  } as unknown as ObjectStorage
  return { storage, puts, deletes }
}

describe('[E2.7] storage writes of one photo run together', () => {
  const key = 'store/media/original.jpg'

  it('[E2.7] starts the put of the original and of every variant before the first one has answered', async () => {
    const { storage, puts } = slowStorage()
    const source = await jpegWithGps(3000, 2000)
    const done = buildMediaObjects(storage, { kind: 'image', contentType: 'image/jpeg', storageKey: key, source })

    await vi.waitFor(() => expect(puts).toHaveLength(5), { timeout: 15_000 })
    expect(puts.map(put => put.key).sort()).toEqual([key, ...[320, 640, 1280, 1920].map(width => variantKey(key, width))].sort())
    for (const put of puts)
      expect(put.meta).toMatchObject({ cacheControl: MEDIA_CACHE_CONTROL })
    puts.forEach(put => put.settle())
    expect(await done).toEqual({ width: 3000, height: 2000 })
  })

  it('[E2.7] still throws when one put fails, so the job is retried', async () => {
    const { storage, puts } = slowStorage()
    const source = await jpegWithGps(3000, 2000)
    const done = buildMediaObjects(storage, { kind: 'image', contentType: 'image/jpeg', storageKey: key, source })
    const failed = expect(done).rejects.toThrow('storage down')

    await vi.waitFor(() => expect(puts).toHaveLength(5), { timeout: 15_000 })
    puts[2]!.settle(new Error('storage down'))
    await failed
  })

  it('[E2.7] deletes every object of a folder together', async () => {
    const { storage, deletes } = slowStorage(['a', 'b', 'c'])
    const done = deleteFolder(storage, 'media', 'p/')

    await vi.waitFor(() => expect(deletes).toHaveLength(3))
    deletes.forEach(call => call.settle())
    await done
  })
})
