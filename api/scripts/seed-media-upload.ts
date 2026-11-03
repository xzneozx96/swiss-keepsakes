import type { Localized } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Pool } from 'pg'
import process from 'node:process'
import { createMediaRepository } from '../src/modules/content/adapters/media-repository.ts'
import { createS3Storage } from '../src/modules/content/adapters/s3-storage.ts'
import { makeConfirmUpload, makeDescribeMedia, makeProcessMedia, makeRequestUpload } from '../src/modules/content/index.ts'
import { createAuditLog } from '../src/platform/audit.ts'
import { systemClock } from '../src/platform/clock.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'
import { createS3Client } from '../src/platform/storage.ts'

// The media path the curated seed and the stories step share: signed PUT, confirm, process, and the alt text, for one file.
// Its message names a record and a reason, never the connection string, so the entry point may print it.
export class SeedError extends Error {
  override name = 'SeedError'
}

export function objectStorageSettings(): { endpoint: string, region: string, accessKeyId: string, secretAccessKey: string } | null {
  const { AWS_ENDPOINT_URL_S3: endpoint, AWS_REGION: region, AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey } = process.env
  return endpoint && region && accessKeyId && secretAccessKey ? { endpoint, region, accessKeyId, secretAccessKey } : null
}

export function createMediaStorage() {
  const settings = objectStorageSettings()
  return createS3Storage(createS3Client({ endpoint: settings?.endpoint ?? '', region: settings?.region ?? '', accessKeyId: settings?.accessKeyId ?? '', secretAccessKey: settings?.secretAccessKey ?? '' }), settings?.endpoint ?? '')
}

export type MediaUploader = (name: string, bytes: Uint8Array, alt?: Localized) => Promise<string>

// The seed runs the media job itself right after the confirm, so no queue is needed: the job is not sent.
export function createMediaUploader(pool: Pool, storeId: string, actor: Actor, storage: ReturnType<typeof createMediaStorage>): MediaUploader {
  const uow = createUnitOfWork(createDatabase(pool))
  const media = createMediaRepository()
  const audit = createAuditLog(systemClock)
  const requestUpload = makeRequestUpload({ storage, clock: systemClock, newId: () => crypto.randomUUID() })
  const confirmUpload = makeConfirmUpload({ uow, media, storage, jobs: { send: async () => {} }, audit, clock: systemClock, newId: () => crypto.randomUUID() })
  const processMedia = makeProcessMedia({ uow, media, storage, clock: systemClock })
  const describeMedia = makeDescribeMedia({ uow, media, audit, clock: systemClock })
  return async (name, bytes, alt) => {
    const contentType = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    const grant = await requestUpload(actor, storeId, { contentType, byteSize: bytes.byteLength })
    if (!grant.ok)
      throw new SeedError(`Upload of ${name} was refused: ${grant.reason}`)
    const put = await fetch(grant.value.url, { method: grant.value.method, headers: grant.value.headers, body: bytes })
    if (!put.ok)
      throw new SeedError(`The storage refused the PUT of ${name}: ${put.status}`)
    const confirmed = await confirmUpload(actor, storeId, { uploadKey: grant.value.uploadKey, fileName: name.slice(name.lastIndexOf('/') + 1) }, null)
    if (!confirmed.ok)
      throw new SeedError(`Confirm of ${name} was refused: ${confirmed.reason}`)
    await processMedia({ storeId, mediaId: confirmed.value.id })
    if (alt) {
      const described = await describeMedia(actor, storeId, confirmed.value.id, { alt }, null)
      if (!described.ok)
        throw new SeedError(`Alt text of ${name} was refused: ${described.reason}`)
    }
    return confirmed.value.id
  }
}
