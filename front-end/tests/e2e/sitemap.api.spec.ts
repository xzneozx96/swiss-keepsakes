import type { APIResponse, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [E3.6][AC61] /sitemap.xml and /robots.txt against the real API. An Owner (the E2.3 path) publishes stories over the
// store routes, then the sitemap is read once: the SPA server caches the published list for 60 s, so nothing may be
// published after that read. A published tour needs a PDF, and no route uploads media, so the tour is a draft here.
const SITE_URL = 'http://localhost:3002'
// No other spec may read /sitemap.xml in the same run: the dev server caches the published list for 60 s.

// A retry would read the sitemap from the 60 s cache of the first attempt and fail for the wrong reason.
test.describe.configure({ mode: 'serial', retries: 0 })
test.afterEach(closeVisitors)

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

interface Versioned { rowVersion: number, id: string }

async function send(owner: Page, method: 'post' | 'patch', path: string, body: unknown, version?: number): Promise<APIResponse> {
  return owner.request.fetch(`${SPA_ORIGIN}${path}`, {
    method,
    data: body,
    headers: {
      'Origin': SPA_ORIGIN,
      'Idempotency-Key': randomUUID(),
      ...(version === undefined ? {} : { 'If-Match': `"${version}"` }),
    },
  })
}

async function ok<T>(response: APIResponse, status: number): Promise<T> {
  expect(response.status(), await response.text()).toBe(status)

  return response.json() as Promise<T>
}

function draft(title: string) {
  return {
    title,
    excerpt: 'Excerpt',
    authorName: 'Anna',
    authorRole: 'Guide',
    coverMediaId: null,
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] }] },
  }
}

async function story(owner: Page, storeId: string, versions: Array<{ language: 'en' | 'de', slug: string, title: string }>, publish: boolean) {
  const base = `/api/store/${storeId}/story-groups`
  const group = await ok<{ id: string }>(await send(owner, 'post', base, {}), 201)

  for (const { language, slug, title } of versions) {
    const created = await ok<Versioned>(await send(owner, 'post', `${base}/${group.id}/versions`, { language, slug, draft: draft(title) }), 201)

    if (publish)
      await ok(await send(owner, 'post', `${base}/${group.id}/versions/${language}/publish`, undefined, created.rowVersion), 200)
  }

  return group.id
}

function locations(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]*)<\/loc>/g), match => match[1])
}

function alternatesOf(xml: string, loc: string): string[] {
  const entry = xml.split('<url>').find(part => part.startsWith(`<loc>${loc}</loc>`)) ?? ''

  return Array.from(entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g), match => `${match[1]} ${match[2]}`)
}

test('[E3.6][AC61] the sitemap lists published story pages by language with alternates, and leaves out drafts, pins and unpublished tours', async ({ browser, request }, testInfo) => {
  testInfo.setTimeout(240_000)
  const language = languageOf(testInfo)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)

  await createStore(admin, language, ownerEmail)
  const mail = await ownerInvitationMail(ownerEmail)
  const owner = await newVisitor(browser, language)

  await followLinkAs(owner, language, mail.link, ownerEmail)
  // The checklist shows once the Owner's invitation is accepted, so the membership exists.
  await expect(owner.getByText(say(language, 'stores.checklist.title'))).toBeVisible()
  const me = await ok<{ stores: Array<{ storeId: string }> }>(await owner.request.get(`${SPA_ORIGIN}/api/me`), 200)
  const storeId = me.stores[0].storeId
  const tag = Math.random().toString(36).slice(2, 8)
  const both = `pair-${tag}`
  const onlyEn = `english-${tag}`

  const pairGroup = await story(owner, storeId, [
    { language: 'en', slug: both, title: 'Pair story' },
    { language: 'de', slug: `${both}-de`, title: 'Paar Geschichte' },
  ], true)

  await story(owner, storeId, [{ language: 'en', slug: onlyEn, title: 'English only story' }], true)
  await story(owner, storeId, [{ language: 'en', slug: `draft-${tag}`, title: 'Draft story' }], false)

  const pins = `/api/store/${storeId}/pins`
  const pinBody = (name: string, extra: object) => ({ title: { en: name }, slug: { en: `${name.toLowerCase().replace(/ /g, '-')}-${tag}` }, latitude: 47.05, longitude: 8.31, ...extra })
  const dated = await ok<Versioned>(await send(owner, 'post', pins, pinBody('Dated pin', { dates: [{ firstDay: '2030-05-01', lastDay: '2030-05-02' }] })), 201)
  const linked = await ok<Versioned>(await send(owner, 'post', pins, pinBody('Linked pin', { mainStoryGroupId: pairGroup })), 201)
  const hidden = await ok<Versioned>(await send(owner, 'post', pins, pinBody('Hidden pin', {})), 201)

  for (const pin of [dated, linked])
    await ok(await send(owner, 'post', `${pins}/${pin.id}/publish`, undefined, pin.rowVersion), 200)
  const live = await ok<Versioned>(await send(owner, 'post', `${pins}/${hidden.id}/publish`, undefined, hidden.rowVersion), 200)

  await ok(await send(owner, 'post', `${pins}/${hidden.id}/hide`, undefined, live.rowVersion), 200)

  const tour = await ok<{ id: string }>(await send(owner, 'post', `/api/store/${storeId}/tours`, { slug: { en: `tour-${tag}` }, draft: { title: { en: 'Draft tour' } } }), 201)

  const response = await request.get(`${SPA_ORIGIN}/sitemap.xml`)
  const xml = await response.text()

  writeFileSync(testInfo.outputPath('sitemap.xml'), xml)
  await testInfo.attach('sitemap.xml', { body: xml, contentType: 'application/xml' })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('xml')

  // AC-1: absolute addresses on the site URL, and the EN and DE versions point at each other and at x-default.
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  const all = locations(xml)

  expect(all.every(loc => loc.startsWith(`${SITE_URL}/`))).toBe(true)
  expect(all).toEqual(expect.arrayContaining([`${SITE_URL}/en`, `${SITE_URL}/de`, `${SITE_URL}/en/stories`, `${SITE_URL}/de/tours`]))
  expect(all).toEqual(expect.arrayContaining([`${SITE_URL}/en/stories/${both}`, `${SITE_URL}/de/stories/${both}-de`]))
  const pairAlternates = [`en ${SITE_URL}/en/stories/${both}`, `de ${SITE_URL}/de/stories/${both}-de`, `x-default ${SITE_URL}/en/stories/${both}`]

  expect(alternatesOf(xml, `${SITE_URL}/en/stories/${both}`)).toEqual(pairAlternates)
  expect(alternatesOf(xml, `${SITE_URL}/de/stories/${both}-de`)).toEqual(pairAlternates)

  // AC-2: an English-only story has its /en address with en and x-default alternates, and no /de address.
  expect(alternatesOf(xml, `${SITE_URL}/en/stories/${onlyEn}`)).toEqual([`en ${SITE_URL}/en/stories/${onlyEn}`, `x-default ${SITE_URL}/en/stories/${onlyEn}`])
  expect(xml).not.toContain(`/de/stories/${onlyEn}`)

  // AC-3: no draft story, no pin of any state, no tour that is not published, no place or pin id.
  expect(xml).not.toContain(`draft-${tag}`)
  expect(xml).not.toContain(`pin-${tag}`)
  expect(xml).not.toContain(`tour-${tag}`)
  expect(xml).not.toContain('/place')
  expect(all.every(loc => !loc.includes('place') && !loc.includes('?'))).toBe(true)
  expect(new Set(all).size).toBe(all.length)
  for (const id of [dated.id, linked.id, hidden.id, tour.id])
    expect(xml).not.toContain(id)

  // The e2e SPA has no VITE_SITE_ENV, so it is not production: robots.txt disallows everything, and pages carry noindex.
  const robots = await request.get(`${SPA_ORIGIN}/robots.txt`)

  const robotsBody = await robots.text()

  expect(robots.headers()['content-type']).toContain('text/plain')
  expect(robotsBody).toContain('Disallow: /')
  expect(robotsBody).not.toMatch(/^Allow: \/$/m)
  expect(robotsBody).not.toContain('Sitemap:')
  expect((await request.get(`${SPA_ORIGIN}/en`)).headers()['x-robots-tag']).toContain('noindex')
})
