import type { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Buffer } from 'node:buffer'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it } from 'vitest'
import { StorageUnavailableError } from '../../src/modules/content/ports.ts'
import { createS3Client, createS3Storage, createUnconfiguredStorage } from '../../src/platform/storage.ts'

const config = { endpoint: 'https://storage.example.test', region: 'eu-central-1', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret-key' }

function awsError(name: string, status: number) {
  return Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } })
}

describe('[E2.7] object storage: the S3 client', () => {
  it('[E2.7] leaves retries to the SDK: standard mode, 5 attempts, which retries a 503 SlowDown', async () => {
    const client = createS3Client(config)

    expect(await client.config.maxAttempts()).toBe(5)
    expect(client.config.retryMode).toBe('standard')
    expect((await client.config.retryStrategy?.())?.constructor.name).toBe('StandardRetryStrategy')
  })

  it('[E2.7] uses path-style addressing and signs checksums only when required', async () => {
    const client = createS3Client(config)

    expect(client.config.forcePathStyle).toBe(true)
    expect(await client.config.requestChecksumCalculation()).toBe('WHEN_REQUIRED')
  })
})

describe('[E2.7] object storage: the S3 adapter', () => {
  it('[E2.7] presignPut signs a URL under /uploads/<key> that lasts the requested time, and names the content type header', async () => {
    const storage = createS3Storage(config)

    const { url, headers } = await storage.presignPut({ key: 'store-1/abc.jpg', contentType: 'image/jpeg', byteSize: 1234, expiresInSeconds: 900 })

    const parsed = new URL(url)
    expect(parsed.origin).toBe(config.endpoint)
    expect(parsed.pathname).toBe('/uploads/store-1/abc.jpg')
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('900')
    expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type')
    expect(headers['Content-Type']).toBe('image/jpeg')
  })

  it('[E2.7] publicUrl is the endpoint, the media bucket and the key', () => {
    expect(createS3Storage(config).publicUrl('a/b.jpg')).toBe('https://storage.example.test/media/a/b.jpg')
    expect(createS3Storage({ ...config, endpoint: 'https://storage.example.test/' }).publicUrl('a/b.jpg')).toBe('https://storage.example.test/media/a/b.jpg')
  })

  it('[E2.7] delete of a missing key resolves, and any other failure surfaces', async () => {
    const sent: unknown[] = []
    const storage = createS3Storage(config, { send: async (command) => {
      sent.push(command)
      throw awsError('NoSuchKey', 404)
    } })

    await expect(storage.delete('media', 'missing.jpg')).resolves.toBeUndefined()
    expect(sent[0]).toBeInstanceOf(DeleteObjectCommand)
    expect((sent[0] as DeleteObjectCommand).input).toEqual({ Bucket: 'media', Key: 'missing.jpg' })

    const denied = createS3Storage(config, { send: () => Promise.reject(awsError('AccessDenied', 403)) })
    await expect(denied.delete('media', 'x')).rejects.toThrow('AccessDenied')
  })

  it('[E2.7] list follows the continuation token across two pages', async () => {
    const at = new Date('2026-10-01T10:00:00Z')
    const inputs: unknown[] = []
    const storage = createS3Storage(config, { send: async (command) => {
      const input = (command as ListObjectsV2Command).input
      inputs.push(input)
      return input.ContinuationToken === undefined
        ? { IsTruncated: true, NextContinuationToken: 'next', Contents: [{ Key: 'p/a', Size: 1, LastModified: at }] }
        : { IsTruncated: false, Contents: [{ Key: 'p/b', Size: 2, LastModified: at }] }
    } })

    const objects = await storage.list('uploads', 'p/')

    expect(objects).toEqual([
      { key: 'p/a', size: 1, contentType: undefined, lastModified: at },
      { key: 'p/b', size: 2, contentType: undefined, lastModified: at },
    ])
    expect(inputs).toEqual([
      { Bucket: 'uploads', Prefix: 'p/' },
      { Bucket: 'uploads', Prefix: 'p/', ContinuationToken: 'next' },
    ])
  })

  it('[E2.7] head returns the stored size and type, and undefined for a missing key', async () => {
    const at = new Date('2026-10-01T10:00:00Z')
    const found = createS3Storage(config, { send: async () => ({ ContentLength: 5, ContentType: 'image/png', LastModified: at }) })
    const missing = createS3Storage(config, { send: () => Promise.reject(awsError('NotFound', 404)) })

    expect(await found.head('uploads', 'k')).toEqual({ key: 'k', size: 5, contentType: 'image/png', lastModified: at })
    expect(await missing.head('uploads', 'k')).toBeUndefined()
  })

  it('[E2.7] get returns the bytes, and undefined for a missing key', async () => {
    const found = createS3Storage(config, { send: async () => ({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } }) })
    const missing = createS3Storage(config, { send: () => Promise.reject(awsError('NoSuchKey', 404)) })

    expect(await found.get('uploads', 'k')).toEqual(new Uint8Array([1, 2, 3]))
    expect(await missing.get('uploads', 'k')).toBeUndefined()
  })

  it('[E2.7] put sends the body with its content type, cache control and disposition', async () => {
    const sent: { input: Record<string, unknown> }[] = []
    const storage = createS3Storage(config, { send: async (command) => {
      sent.push(command as { input: Record<string, unknown> })
      return {}
    } })

    await storage.put('media', 'k.pdf', Buffer.from('x'), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable', contentDisposition: 'inline' })

    expect(sent[0]?.input).toEqual({ Bucket: 'media', Key: 'k.pdf', Body: Buffer.from('x'), ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable', ContentDisposition: 'inline' })
  })

  it('[E2.7] a server error that outlasts the SDK retries becomes StorageUnavailableError', async () => {
    const storage = createS3Storage(config, { send: () => Promise.reject(awsError('SlowDown', 503)) })

    await expect(storage.head('uploads', 'k')).rejects.toBeInstanceOf(StorageUnavailableError)
  })

  it('[E2.7] builds from a real S3Client by default', () => {
    expect(createS3Client(config)).toBeInstanceOf(S3Client)
  })
})

describe('[E2.7] object storage: unconfigured', () => {
  it('[E2.7] every method rejects with StorageUnavailableError, and publicUrl throws it too', async () => {
    const storage = createUnconfiguredStorage()

    await expect(storage.presignPut({ key: 'k', contentType: 'image/png', byteSize: 1, expiresInSeconds: 900 })).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(storage.head('uploads', 'k')).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(storage.get('uploads', 'k')).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(storage.put('media', 'k', new Uint8Array(), { contentType: 'image/png' })).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(storage.delete('media', 'k')).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(storage.list('media', '')).rejects.toBeInstanceOf(StorageUnavailableError)
    expect(() => storage.publicUrl('k')).toThrow(StorageUnavailableError)
  })
})
