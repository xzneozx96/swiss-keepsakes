import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { finish, requireEnv, secret } from '../lib/env.ts'

const SPIKE = 'SP5'
const env = requireEnv(SPIKE, {
  AWS_ACCESS_KEY_ID: secret(),
  AWS_SECRET_ACCESS_KEY: secret(),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: secret(),
  SP5_BUCKET_PRIVATE: z.string().default('sp5-private'),
  SP5_BUCKET_PUBLIC: z.string().default('sp5-public'),
})

const s3 = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

const results: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  results.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}

const payload = Buffer.from(`sp5-${randomUUID()}`)
const created: { bucket: string; key: string }[] = []

async function presignedUpload(bucket: string, key: string): Promise<number> {
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'text/plain' }), { expiresIn: 300 })
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: payload })
  await res.arrayBuffer()
  if (res.ok) created.push({ bucket, key })
  return res.status
}

try {
  check('AWS_REGION is eu-central-1 (Frankfurt)', env.AWS_REGION === 'eu-central-1', `region ${env.AWS_REGION}`)

  const privateKey = `sp5/${randomUUID()}.txt`
  const putPrivate = await presignedUpload(env.SP5_BUCKET_PRIVATE, privateKey)
  check('presigned PUT into the private bucket works', putPrivate === 200, `HTTP ${putPrivate}${putPrivate === 200 ? '' : '; if presigned URLs are unsupported, D14 moves to Cloudflare R2'}`)
  const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: env.SP5_BUCKET_PRIVATE, Key: privateKey }), { expiresIn: 300 })
  const signedGet = await fetch(getUrl)
  check('presigned GET returns the uploaded bytes', signedGet.ok && Buffer.from(await signedGet.arrayBuffer()).equals(payload), `HTTP ${signedGet.status}`)
  const anonPrivate = await fetch(`${env.AWS_ENDPOINT_URL_S3}/${env.SP5_BUCKET_PRIVATE}/${privateKey}`)
  await anonPrivate.arrayBuffer()
  check('anonymous GET of a private object is refused', anonPrivate.status === 401 || anonPrivate.status === 403, `HTTP ${anonPrivate.status}`)

  const publicKey = `sp5/${randomUUID()}.txt`
  const putPublic = await presignedUpload(env.SP5_BUCKET_PUBLIC, publicKey)
  check('presigned PUT into the public_read bucket works', putPublic === 200, `HTTP ${putPublic}`)
  const anonPublic = await fetch(`${env.AWS_ENDPOINT_URL_S3}/${env.SP5_BUCKET_PUBLIC}/${publicKey}`)
  const publicBytes = Buffer.from(await anonPublic.arrayBuffer())
  check('anonymous GET of a published object returns the bytes', anonPublic.status === 200 && publicBytes.equals(payload), `HTTP ${anonPublic.status}, content-type ${anonPublic.headers.get('content-type') ?? 'none'}`)
} finally {
  for (const object of created) {
    await s3.send(new DeleteObjectCommand({ Bucket: object.bucket, Key: object.key })).catch(() => undefined)
  }
}

finish({ spike: SPIKE, ran: true, scope: 'remote', pass: results.every((r) => r.ok), missing: [] })
