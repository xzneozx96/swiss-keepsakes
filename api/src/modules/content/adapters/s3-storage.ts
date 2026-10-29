import type { S3Client } from '@aws-sdk/client-s3'
import type { ObjectStorage, StoredObject } from '../ports.ts'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ObjectTooLargeError, StorageUnavailableError } from '../ports.ts'

const trailingSlashes = /\/+$/

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

// After the SDK's retries, a server error, or no answer at all (a refused connection, a timeout: no HTTP status), means
// the storage is down. Other failures (403, 400) are our bug and surface as they are.
async function guarded<R>(work: () => Promise<R>): Promise<R> {
  try {
    return await work()
  }
  catch (error) {
    const status = statusOf(error)
    if (!isMissing(error) && (status === undefined || status >= 500))
      throw new StorageUnavailableError(status === undefined ? 'Object storage did not answer' : 'Object storage answered with a server error', { cause: error })
    throw error
  }
}

// The ObjectStorage over the platform's S3 client (platform/storage.ts). Presigning needs the real client's
// configuration, so a test replaces only `send`, through `sender`.
export function createS3Storage(client: S3Client, endpointUrl: string, sender?: S3Sender): ObjectStorage {
  const s3: S3Sender = sender ?? client
  const endpoint = endpointUrl.replace(trailingSlashes, '')

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
    async get(bucket, key, maxBytes) {
      try {
        const out = await guarded(() => s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })))
        // Refuse from the declared length before reading the body, and again on what was read.
        if (maxBytes !== undefined && (out.ContentLength ?? 0) > maxBytes) {
          // Release the connection: an unread body keeps the socket open.
          out.Body?.destroy?.()
          throw new ObjectTooLargeError(`Object is larger than ${maxBytes} bytes`)
        }
        const body: Uint8Array = await out.Body.transformToByteArray()
        if (maxBytes !== undefined && body.byteLength > maxBytes)
          throw new ObjectTooLargeError(`Object is larger than ${maxBytes} bytes`)
        return body
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
