import type { ListObjectsV2Command } from '@aws-sdk/client-s3'
import type { S3Sender } from '../../../src/modules/content/adapters/s3-storage.ts'
import { Buffer } from 'node:buffer'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { describe, expect, it } from 'vitest'
import { createS3Storage, createUnconfiguredStorage } from '../../../src/modules/content/adapters/s3-storage.ts'
import { ObjectTooLargeError, StorageUnavailableError } from '../../../src/modules/content/ports.ts'
import { createS3Client } from '../../../src/platform/storage.ts'

const config = { endpoint: 'https://storage.example.test', region: 'eu-central-1', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret-key' }

const s3 = (sender?: S3Sender) => createS3Storage(createS3Client(config), config.endpoint, sender)

function awsError(name: string, status: number) {
  return Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } })
}

describe('[E2.7] object storage: the S3 adapter', () => {
  it('[E2.7] presignPut signs a URL under /uploads/<key> that lasts the requested time, and names the content type header', async () => {
    const storage = s3()

    const { url, headers } = await storage.presignPut({ key: 'store-1/abc.jpg', contentType: 'image/jpeg', byteSize: 1234, expiresInSeconds: 900 })

    const parsed = new URL(url)
    expect(parsed.origin).toBe(config.endpoint)
    expect(parsed.pathname).toBe('/uploads/store-1/abc.jpg')
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('900')
    expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type')
    expect(headers['Content-Type']).toBe('image/jpeg')
  })

  it('[E2.7] publicUrl is the endpoint, the media bucket and the key', () => {
    expect(s3().publicUrl('a/b.jpg')).toBe('https://storage.example.test/media/a/b.jpg')
    expect(createS3Storage(createS3Client(config), 'https://storage.example.test/').publicUrl('a/b.jpg')).toBe('https://storage.example.test/media/a/b.jpg')
  })

  it('[E2.7] delete of a missing key resolves, and any other failure surfaces', async () => {
    const sent: unknown[] = []
    const storage = s3({ send: async (command) => {
      sent.push(command)
      throw awsError('NoSuchKey', 404)
    } })

    await expect(storage.delete('media', 'missing.jpg')).resolves.toBeUndefined()
    expect(sent[0]).toBeInstanceOf(DeleteObjectCommand)
    expect((sent[0] as DeleteObjectCommand).input).toEqual({ Bucket: 'media', Key: 'missing.jpg' })

    const denied = s3({ send: () => Promise.reject(awsError('AccessDenied', 403)) })
    await expect(denied.delete('media', 'x')).rejects.toThrow('AccessDenied')
  })

  it('[E2.7] list follows the continuation token across two pages', async () => {
    const at = new Date('2026-10-01T10:00:00Z')
    const inputs: unknown[] = []
    const storage = s3({ send: async (command) => {
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
    const found = s3({ send: async () => ({ ContentLength: 5, ContentType: 'image/png', LastModified: at }) })
    const missing = s3({ send: () => Promise.reject(awsError('NotFound', 404)) })

    expect(await found.head('uploads', 'k')).toEqual({ key: 'k', size: 5, contentType: 'image/png', lastModified: at })
    expect(await missing.head('uploads', 'k')).toBeUndefined()
  })

  it('[E2.7] get returns the bytes, and undefined for a missing key', async () => {
    const found = s3({ send: async () => ({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } }) })
    const missing = s3({ send: () => Promise.reject(awsError('NoSuchKey', 404)) })

    expect(await found.get('uploads', 'k')).toEqual(new Uint8Array([1, 2, 3]))
    expect(await missing.get('uploads', 'k')).toBeUndefined()
  })

  it('[E2.7] get with a cap refuses from ContentLength without reading the body, and backstops on the bytes read', async () => {
    let reads = 0
    const body = (bytes: Uint8Array) => ({ transformToByteArray: async () => {
      reads++
      return bytes
    } })
    const declared = s3({ send: async () => ({ ContentLength: 11, Body: body(new Uint8Array(11)) }) })
    const lying = s3({ send: async () => ({ ContentLength: 3, Body: body(new Uint8Array(11)) }) })
    const fitting = s3({ send: async () => ({ ContentLength: 10, Body: body(new Uint8Array(10)) }) })

    await expect(declared.get('uploads', 'k', 10)).rejects.toBeInstanceOf(ObjectTooLargeError)
    expect(reads).toBe(0)
    let destroyed = 0
    const open = s3({ send: async () => ({ ContentLength: 11, Body: { destroy: () => void destroyed++, transformToByteArray: async () => new Uint8Array(11) } }) })
    await expect(open.get('uploads', 'k', 10)).rejects.toBeInstanceOf(ObjectTooLargeError)
    expect(destroyed).toBe(1)
    await expect(lying.get('uploads', 'k', 10)).rejects.toBeInstanceOf(ObjectTooLargeError)
    expect(reads).toBe(1)
    expect((await fitting.get('uploads', 'k', 10))?.byteLength).toBe(10)
    expect((await declared.get('uploads', 'k'))?.byteLength).toBe(11)
  })

  it('[E2.7] put sends the body with its content type, cache control and disposition', async () => {
    const sent: { input: Record<string, unknown> }[] = []
    const storage = s3({ send: async (command) => {
      sent.push(command as { input: Record<string, unknown> })
      return {}
    } })

    await storage.put('media', 'k.pdf', Buffer.from('x'), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable', contentDisposition: 'inline' })

    expect(sent[0]?.input).toEqual({ Bucket: 'media', Key: 'k.pdf', Body: Buffer.from('x'), ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable', ContentDisposition: 'inline' })
  })

  it('[E2.7] a server error that outlasts the SDK retries becomes StorageUnavailableError', async () => {
    const storage = s3({ send: () => Promise.reject(awsError('SlowDown', 503)) })

    await expect(storage.head('uploads', 'k')).rejects.toBeInstanceOf(StorageUnavailableError)
  })

  it('[E2.7] a network failure with no HTTP status becomes StorageUnavailableError, a 403 surfaces as it is', async () => {
    const refused = s3({ send: () => Promise.reject(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })) })
    const denied = s3({ send: () => Promise.reject(awsError('AccessDenied', 403)) })

    await expect(refused.put('media', 'k', new Uint8Array(), { contentType: 'image/png' })).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(denied.get('uploads', 'k')).rejects.toThrow('AccessDenied')
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
