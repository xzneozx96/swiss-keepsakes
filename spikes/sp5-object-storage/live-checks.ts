// Remaining SP5 checks (T-E2.7 AC-7): bucket CORS, public URL shape, headers kept on anonymous read, deletion.
// Probes bucket CORS (saving the existing rule first and restoring it if a put ever succeeds), then the media checks.
// Run: node --env-file=../../api/.env.local --import tsx live-checks.ts   (prints pass/fail and header names/values only)
import { DeleteBucketCorsCommand, DeleteObjectCommand, GetBucketCorsCommand, HeadBucketCommand, ListBucketsCommand, ListObjectsV2Command, PutBucketCorsCommand, PutObjectCommand, S3Client, type CORSRule } from '@aws-sdk/client-s3'

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
  const outcome = async (run: () => Promise<unknown>): Promise<{ ok: boolean; note: string }> => {
    try {
      await run()
      return { ok: true, note: 'accepted' }
    } catch (error) {
      const e = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
      return { ok: false, note: `${e.name} HTTP ${e.$metadata?.httpStatusCode}: ${e.message}` }
    }
  }
  const prefix = `sp5-e27-${Date.now()}/`
  const key = `${prefix}manual.pdf`
  const created: string[] = []
  const saved = new Map<string, CORSRule[] | undefined>()
  let putSucceeded = false
  const variants: [string, CORSRule[]][] = [
    ['four-field rule for the origin', corsRules],
    ['minimal rule (PUT)', [{ AllowedOrigins: [ORIGIN], AllowedMethods: ['PUT'] }]],
    ['PUT, GET and AllowedHeaders *', [{ AllowedOrigins: [ORIGIN], AllowedMethods: ['PUT', 'GET'], AllowedHeaders: ['*'] }]],
    ['wildcard origin', [{ AllowedOrigins: ['*'], AllowedMethods: ['PUT', 'GET'] }]],
  ]
  try {
    const listed = await s3.send(new ListBucketsCommand({}))
    check('ListBuckets shows uploads and media', ['uploads', 'media'].every((n) => listed.Buckets?.some((b) => b.Name === n)), `buckets ${JSON.stringify(listed.Buckets?.map((b) => b.Name))}`)
    for (const bucket of ['uploads', 'media']) {
      const head = await outcome(() => s3.send(new HeadBucketCommand({ Bucket: bucket })))
      check(`HeadBucket ${bucket}`, head.ok, head.note)
      const read = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }))
      saved.set(bucket, read.CORSRules)
      console.log(`     existing CORS rule of ${bucket}: ${JSON.stringify(read.CORSRules)}`)
      for (const [name, rules] of variants) {
        const put = await outcome(() => s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } })))
        if (put.ok) putSucceeded = true
        check(`PutBucketCors ${bucket}: ${name}`, put.ok, put.note)
      }
      const del = await outcome(() => s3.send(new DeleteBucketCorsCommand({ Bucket: bucket })))
      if (del.ok) putSucceeded = true
      check(`DeleteBucketCors ${bucket}`, del.ok, del.note)
    }

    const expected = {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/pdf',
      'content-disposition': 'inline',
    }
    await s3.send(new PutObjectCommand({ Bucket: 'media', Key: key, Body: Buffer.from('%PDF-1.4 sp5'), CacheControl: expected['cache-control'], ContentType: expected['content-type'], ContentDisposition: expected['content-disposition'] }))
    created.push(key)
    const url = `${endpoint}/media/${key}`
    const res = await fetch(url)
    await res.arrayBuffer()
    check('anonymous GET of ${AWS_ENDPOINT_URL_S3}/media/<key> returns 200', res.status === 200, `HTTP ${res.status}`)
    for (const name of Object.keys(expected)) console.log(`     ${name}: ${res.headers.get(name)}`)
    const bad = headerMismatches(expected, res.headers)
    check('cache-control, content-type and content-disposition kept verbatim', bad.length === 0, bad.length ? `differ: ${bad.join(', ')}` : '')
    await s3.send(new DeleteObjectCommand({ Bucket: 'media', Key: key }))
    created.pop()
    const after = await fetch(url)
    await after.arrayBuffer()
    check('anonymous GET after delete is 404', after.status === 404, `HTTP ${after.status}`)
  } finally {
    for (const k of created) await s3.send(new DeleteObjectCommand({ Bucket: 'media', Key: k })).catch((e) => console.log(`cleanup of ${k} failed: ${(e as Error).name}`))
    for (const [bucket, rules] of saved) {
      const now = await outcome(() => s3.send(new GetBucketCorsCommand({ Bucket: bucket })))
      if (putSucceeded && rules) {
        const restored = await outcome(() => s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } })))
        console.log(`restore of the saved CORS rule on ${bucket}: ${restored.note}`)
      }
      const after = await s3.send(new GetBucketCorsCommand({ Bucket: bucket })).catch(() => undefined)
      console.log(`     CORS rule of ${bucket} at the end: ${JSON.stringify(after?.CORSRules)} (unchanged: ${JSON.stringify(after?.CORSRules) === JSON.stringify(rules)}, probe ${now.note})`)
    }
    for (const bucket of ['uploads', 'media']) {
      const left = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'sp5-e27-' })).catch(() => undefined)
      console.log(`     objects left under sp5-e27- in ${bucket}: ${left?.KeyCount}`)
    }
  }
  const mediaChecks = results.filter(([n]) => !/CORS|Bucket/.test(n))
  console.log(`media checks ${mediaChecks.every((r) => r[1]) ? 'PASS' : 'FAIL'}; CORS probes ${results.filter(([n]) => n.includes('PutBucketCors')).some((r) => r[1]) ? 'some accepted' : 'all rejected'}`)
  process.exit(mediaChecks.every((r) => r[1]) ? 0 : 1)
}
