// @ts-nocheck -- Playwright is a front-end dependency, loaded through that package (see `require` below), so the spikes project has no types for it.
// Browser check (T-E2.7 AC-7): a page at origin http://localhost:3002 (served through page.route, no dev server)
// PUTs a small file to a presigned URL of the `uploads` bucket with fetch, then reads it back.
// Run: flock <e2e.lock> node --env-file=../../api/.env.local --import tsx browser-put.ts <evidence-dir>
import { createRequire } from 'node:module'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, ORIGIN } from './live-checks.ts'

const require = createRequire(new URL('../../front-end/package.json', import.meta.url))
const { chromium } = require('@playwright/test') as typeof import('@playwright/test')

const evidence = process.argv[2]
const key = `sp5-e27-${Date.now()}/browser.txt`
const body = 'sp5 browser put'
const log: string[] = []
const browser = await chromium.launch({ headless: true })
let ok = false
try {
  const putUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: 'uploads', Key: key, ContentType: 'text/plain' }), { expiresIn: 300 })
  const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: 'uploads', Key: key }), { expiresIn: 300 })
  const page = await browser.newPage()
  page.on('requestfinished', async (r) => { const res = await r.response(); log.push(`${r.method()} ${new URL(r.url()).host === ORIGIN.slice(7) ? r.url() : '<storage>' + new URL(r.url()).pathname.replace(key, '<key>')} -> ${res?.status()} acao=${res?.headers()['access-control-allow-origin']}`) })
  page.on('requestfailed', (r) => log.push(`${r.method()} <storage> FAILED ${r.failure()?.errorText}`))
  await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>sp5</title><p>sp5 cors check</p>' }))
  await page.goto(`${ORIGIN}/`)
  const result = await page.evaluate(async ({ putUrl, getUrl, body }) => {
    try {
      const put = await fetch(putUrl, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body })
      const get = await fetch(getUrl)
      return { origin: location.origin, put: put.status, get: get.status, text: await get.text() }
    } catch (e) { return { origin: location.origin, error: String(e) } }
  }, { putUrl, getUrl, body })
  console.log(JSON.stringify(result))
  ok = result.put === 200 && result.get === 200 && result.text === body
  await page.screenshot({ path: `${evidence}/browser-put.png` })
} finally {
  await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: key })).then(() => console.log('deleted the test object'), (e) => console.log(`delete of the test object FAILED: ${(e as Error).name}`))
  await browser.close()
  console.log(log.join('\n'))
  console.log(ok ? 'ok   browser presigned PUT and read-back from origin ' + ORIGIN : 'FAIL browser presigned PUT and read-back')
}
process.exit(ok ? 0 : 1)
