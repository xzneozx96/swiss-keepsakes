import type { Bucket, ObjectStorage } from '../../src/modules/content/ports.ts'
import type { Clock } from '../../src/platform/clock.ts'

export interface FakeObject {
  body: Uint8Array
  contentType: string | undefined
  cacheControl?: string
  contentDisposition?: string
  lastModified: Date
}

export type FakeStorage = ObjectStorage & {
  objects: (bucket: Bucket) => Map<string, FakeObject>
  seed: (bucket: Bucket, key: string, body: Uint8Array, meta?: { contentType?: string, lastModified?: Date }) => void
}

// An in-memory ObjectStorage. `lastModified` is the clock's time at put, so the abandoned-upload sweep can be tested.
export function createFakeStorage(clock: Clock, publicBase = 'https://storage.test'): FakeStorage {
  const buckets: Record<Bucket, Map<string, FakeObject>> = { uploads: new Map(), media: new Map() }
  const stored = (key: string, o: FakeObject) => ({ key, size: o.body.byteLength, contentType: o.contentType, lastModified: o.lastModified })
  return {
    objects: bucket => buckets[bucket],
    seed(bucket, key, body, meta) {
      buckets[bucket].set(key, { body, contentType: meta?.contentType, lastModified: meta?.lastModified ?? clock.now() })
    },
    async presignPut({ key, contentType, expiresInSeconds }) {
      return { url: `${publicBase}/uploads/${key}?X-Amz-Expires=${expiresInSeconds}`, headers: { 'Content-Type': contentType } }
    },
    async head(bucket, key) {
      const o = buckets[bucket].get(key)
      return o && stored(key, o)
    },
    async get(bucket, key) {
      return buckets[bucket].get(key)?.body
    },
    async put(bucket, key, body, meta) {
      buckets[bucket].set(key, { body, contentType: meta.contentType, cacheControl: meta.cacheControl, contentDisposition: meta.contentDisposition, lastModified: clock.now() })
    },
    async delete(bucket, key) {
      buckets[bucket].delete(key)
    },
    async list(bucket, prefix) {
      return [...buckets[bucket]]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, o]) => ({ ...stored(key, o), contentType: undefined }))
    },
    publicUrl: key => `${publicBase}/media/${key}`,
  }
}
