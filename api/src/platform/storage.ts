import type { Bucket, ObjectStorage, StoredObject } from '../modules/content/ports.ts'
import type { StorageConfig } from './config.ts'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StorageUnavailableError } from '../modules/content/ports.ts'

const trailingSlashes = /\/+$/

// The S3 client for Neon Object Storage. Path-style and SigV4, as the SP5 spike ran against Neon. Retries are the
// SDK's own: standard mode retries a 503 SlowDown and a dropped connection with backoff, so this file has no loop.
export function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 5,
    retryMode: 'standard',
  })
}

// The part of the client the adapter sends commands through. A test passes its own.
export interface S3Sender {
  send: (command: any) => Promise<any>
}

function statusOf(error: unknown): number | undefined {
  return (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode
}

function isMissing(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name
  return name === 'NoSuchKey' || name === 'NotFound' || statusOf(error) === 404
}

// After the SDK's retries, a server error means the storage is down. Other failures (403, 400) are our bug and surface as they are.
async function guarded<R>(work: () => Promise<R>): Promise<R> {
  try {
    return await work()
  }
  catch (error) {
    if ((statusOf(error) ?? 0) >= 500)
      throw new StorageUnavailableError('Object storage answered with a server error', { cause: error })
    throw error
  }
}

export function createS3Storage(config: StorageConfig, sender?: S3Sender): ObjectStorage {
  // Presigning needs the real client's configuration, so it is never replaced.
  const client = createS3Client(config)
  const s3: S3Sender = sender ?? client
  const endpoint = config.endpoint.replace(trailingSlashes, '')

  return {
    async presignPut({ key, contentType, byteSize, expiresInSeconds }) {
      // The content type is signed. The length is signed too, but Neon may not enforce signed headers, so the
      // confirm step re-checks the stored object.
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: 'uploads', Key: key, ContentType: contentType, ContentLength: byteSize }), { expiresIn: expiresInSeconds, signableHeaders: new Set(['content-type']) })
      return { url, headers: { 'Content-Type': contentType } }
    },
    async head(bucket, key) {
      try {
        const out = await guarded(() => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })))
        return { key, size: out.ContentLength ?? 0, contentType: out.ContentType, lastModified: out.LastModified }
      }
      catch (error) {
        if (isMissing(error))
          return undefined
        throw error
      }
    },
    async get(bucket, key) {
      try {
        const out = await guarded(() => s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })))
        return await out.Body.transformToByteArray()
      }
      catch (error) {
        if (isMissing(error))
          return undefined
        throw error
      }
    },
    async put(bucket, key, body, meta) {
      await guarded(() => s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: meta.contentType,
        ...(meta.cacheControl === undefined ? {} : { CacheControl: meta.cacheControl }),
        ...(meta.contentDisposition === undefined ? {} : { ContentDisposition: meta.contentDisposition }),
      })))
    },
    async delete(bucket, key) {
      try {
        await guarded(() => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })))
      }
      catch (error) {
        if (!isMissing(error))
          throw error
      }
    },
    async list(bucket, prefix) {
      const objects: StoredObject[] = []
      let token: string | undefined
      do {
        const out = await guarded(() => s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ...(token === undefined ? {} : { ContinuationToken: token }) })))
        for (const item of out.Contents ?? [])
          objects.push({ key: item.Key, size: item.Size ?? 0, contentType: undefined, lastModified: item.LastModified })
        token = out.IsTruncated ? out.NextContinuationToken : undefined
      } while (token !== undefined)
      return objects
    },
    publicUrl: key => `${endpoint}/media/${key}`,
  }
}

// The storage when AWS_* is unset (R5): the service starts, and every use fails with a 503 `storage-unavailable`.
export function createUnconfiguredStorage(): ObjectStorage {
  const fail = (): never => {
    throw new StorageUnavailableError('Object storage is not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 and AWS_REGION')
  }
  return {
    presignPut: async () => fail(),
    head: async () => fail(),
    get: async () => fail(),
    put: async () => fail(),
    delete: async () => fail(),
    list: async () => fail(),
    publicUrl: fail,
  }
}

export type { Bucket }
