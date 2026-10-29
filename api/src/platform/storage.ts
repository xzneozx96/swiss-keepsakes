import type { StorageConfig } from './config.ts'
import { S3Client } from '@aws-sdk/client-s3'

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
