import type { APIResponse, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { expect, test } from '@playwright/test'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [E3.6] /sitemap.xml and /robots.txt on the BUILT front-end server (pnpm build, then the Nitro output), not the dev server.
// This guards the zod alias of vite.config.ts: without it the server build bundles zod/v3 and the contract schemas throw.
// The Owner publishes through the dev SPA (it proxies /api), the built server reads the same API directly:
//   PORT=5395 API_ORIGIN=http://127.0.0.1:5394 node .output/server/index.mjs     (build made with VITE_SITE_URL=http://localhost:3002)
//   E2E_BUILT_URL=http://localhost:5395 pnpm test:e2e tests/e2e/sitemap-built.api.spec.ts
// It skips when E2E_BUILT_URL is unset.
const BUILT = process.env.E2E_BUILT_URL
const SITE_URL = 'http://localhost:3002'

test.skip(!BUILT, 'E2E_BUILT_URL names no built server')
test.describe.configure({ mode: 'serial', retries: 0 })
test.afterEach(closeVisitors)

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

async function send(owner: Page, path: string, body: unknown, version?: number): Promise<APIResponse> {
  return owner.request.fetch(`${SPA_ORIGIN}${path}`, {
    method: 'post',
    data: body,
    headers: { 'Origin': SPA_ORIGIN, 'Idempotency-Key': randomUUID(), ...(version === undefined ? {} : { 'If-Match': `"${version}"` }) },
  })
}

async function ok<T>(response: APIResponse, status: number): Promise<T> {
  expect(response.status(), await response.text()).toBe(status)

  return response.json() as Promise<T>
}

const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }
const draft = (title: string) => ({ title, excerpt: 'Excerpt', authorName: 'Anna', authorRole: 'Guide', coverMediaId: null, body })

test('[E3.6][AC61][E3.9] the built server serves the sitemap with alternates after a publish, and robots.txt disallows outside production', async ({ browser, request }, testInfo) => {
  testInfo.setTimeout(240_000)
  const language = languageOf(testInfo)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)

  await createStore(admin, language, ownerEmail)
  const owner = await newVisitor(browser, language)

  await followLinkAs(owner, language, (await ownerInvitationMail(ownerEmail)).link, ownerEmail)
  await expect(owner.getByRole('heading', { level: 1, name: say(language, 'stores.onboarding.title') })).toBeVisible()
  const me = await ok<{ stores: Array<{ storeId: string }> }>(await owner.request.get(`${SPA_ORIGIN}/api/me`), 200)
  const base = `/api/store/${me.stores[0].storeId}/story-groups`
  const tag = Math.random().toString(36).slice(2, 8)
  const slug = `built-${tag}`
  const group = await ok<{ id: string }>(await send(owner, base, {}), 201)

  for (const [lang, versionSlug, title] of [['en', slug, 'Built story'], ['de', `${slug}-de`, 'Gebaute Geschichte']] as const) {
    const created = await ok<{ rowVersion: number }>(await send(owner, `${base}/${group.id}/versions`, { language: lang, slug: versionSlug, draft: draft(title) }), 201)

    await ok(await send(owner, `${base}/${group.id}/versions/${lang}/publish`, undefined, created.rowVersion), 200)
  }

  const response = await request.get(`${BUILT}/sitemap.xml`)
  const xml = await response.text()

  await testInfo.attach('sitemap.xml', { body: xml, contentType: 'application/xml' })
  expect(response.status(), xml.slice(0, 300)).toBe(200)
  expect(response.headers()['content-type']).toContain('xml')
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  const enLoc = `${SITE_URL}/en/stories/${slug}`
  const deLoc = `${SITE_URL}/de/stories/${slug}-de`

  expect(xml).toContain(`<loc>${enLoc}</loc>`)
  expect(xml).toContain(`<loc>${deLoc}</loc>`)
  for (const loc of [enLoc, deLoc]) {
    const entry = xml.split('<url>').find(part => part.startsWith(`<loc>${loc}</loc>`)) ?? ''

    expect(entry).toContain(`hreflang="en" href="${enLoc}"`)
    expect(entry).toContain(`hreflang="de" href="${deLoc}"`)
    expect(entry).toContain(`hreflang="x-default" href="${enLoc}"`)
  }

  const robots = await request.get(`${BUILT}/robots.txt`)
  const robotsBody = await robots.text()

  expect(robots.status()).toBe(200)
  expect(robotsBody).toContain('Disallow: /')
  expect(robotsBody).not.toContain('Sitemap:')
  expect((await request.get(`${BUILT}/en`)).headers()['x-robots-tag']).toContain('noindex')
})
