// Remaining SP5 checks (T-E2.7 AC-7): bucket CORS, public URL shape, headers kept on anonymous read, deletion.
// Run: node --env-file=../../api/.env.local --import tsx live-checks.ts   (prints pass/fail and header names/values only)
import { DeleteObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const ORIGIN = 'http://localhost:3002'
const need = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}
export const endpoint = need('AWS_ENDPOINT_URL_S3').replace(/\/$/, '')
export const s3 = new S3Client({
  region: need('AWS_REGION'),
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: need('AWS_ACCESS_KEY_ID'), secretAccessKey: need('AWS_SECRET_ACCESS_KEY') },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

export const corsRules = [{ AllowedOrigins: [ORIGIN], AllowedMethods: ['PUT', 'GET', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 300 }]

// Pure: which expected headers differ from the actual ones (names lower-cased).
export function headerMismatches(expected: Record<string, string>, actual: Headers): string[] {
  return Object.entries(expected).filter(([name, value]) => actual.get(name) !== value).map(([name]) => name)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results: [string, boolean, string][] = []
  const check = (name: string, ok: boolean, note = '') => {
    results.push([name, ok, note])
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
  }
  const prefix = `sp5-e27-${Date.now()}/`
  const key = `${prefix}manual.pdf`
  const created: string[] = []
  try {
    try {
      await s3.send(new PutBucketCorsCommand({ Bucket: 'uploads', CORSConfiguration: { CORSRules: corsRules } }))
      const read = await s3.send(new GetBucketCorsCommand({ Bucket: 'uploads' }))
      const rule = read.CORSRules?.[0]
      check('PutBucketCors accepted on uploads and read back', rule?.AllowedOrigins?.includes(ORIGIN) === true, `origins ${JSON.stringify(rule?.AllowedOrigins)}, methods ${JSON.stringify(rule?.AllowedMethods)}`)
    } catch (error) {
      const e = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
      check('PutBucketCors accepted on uploads', false, `${e.name} HTTP ${e.$metadata?.httpStatusCode}: ${e.message}`)
    }

    const expected = {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="sp5-check.pdf"',
    }
    await s3.send(new PutObjectCommand({ Bucket: 'media', Key: key, Body: Buffer.from('%PDF-1.4 sp5'), CacheControl: expected['cache-control'], ContentType: expected['content-type'], ContentDisposition: expected['content-disposition'] }))
    created.push(key)
    const url = `${endpoint}/media/${key}`
    check('public URL shape is ${AWS_ENDPOINT_URL_S3}/media/<key>', url.startsWith(`${endpoint}/media/sp5-e27-`), 'built from the env endpoint')
    const res = await fetch(url)
    await res.arrayBuffer()
    check('anonymous GET returns 200', res.status === 200, `HTTP ${res.status}`)
    for (const name of Object.keys(expected)) console.log(`     ${name}: ${res.headers.get(name)}`)
    const bad = headerMismatches(expected, res.headers)
    check('cache-control, content-type and content-disposition kept verbatim', bad.length === 0, bad.length ? `differ: ${bad.join(', ')}` : '')
    await s3.send(new DeleteObjectCommand({ Bucket: 'media', Key: key }))
    created.pop()
    const after = await fetch(url)
    await after.arrayBuffer()
    check('anonymous GET after delete is 404', after.status === 404, `HTTP ${after.status}`)
  } finally {
    for (const k of created) await s3.send(new DeleteObjectCommand({ Bucket: 'media', Key: k })).catch(() => undefined)
  }
  process.exit(results.every((r) => r[1]) ? 0 : 1)
}
