import { S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it } from 'vitest'
import { createS3Client } from '../../src/platform/storage.ts'

const config = { endpoint: 'https://storage.example.test', region: 'eu-central-1', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret-key' }

describe('[E2.7] object storage: the S3 client', () => {
  it('[E2.7] leaves retries to the SDK: standard mode, 5 attempts, which retries a 503 SlowDown', async () => {
    const client = createS3Client(config)

    expect(await client.config.maxAttempts()).toBe(5)
    expect(client.config.retryMode).toBe('standard')
  })

  it('[E2.7] uses path-style addressing and signs checksums only when required', async () => {
    const client = createS3Client(config)

    expect(client.config.forcePathStyle).toBe(true)
    expect(await client.config.requestChecksumCalculation()).toBe('WHEN_REQUIRED')
  })

  it('[E2.7] builds from a real S3Client by default', () => {
    expect(createS3Client(config)).toBeInstanceOf(S3Client)
  })
})
