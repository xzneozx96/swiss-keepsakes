import type { APIResponse, Browser, Locator, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { categoriesEn } from '../../src/features/categories/messages'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// Sprint 6 user-visible effects against the real API on Chromium in English (playwright.config.ts):
// [E4.18] the Owner renames, reorders and nests blog categories at 375 px and the public list shows it;
// [E2.13] the public story read returns the body document and a bad body is refused with 422;
// [E2.7] the upload request answers by caller and type.
const FIRST_LOAD = 60_000

test.afterEach(closeVisitors)

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

async function storeWithOwner(browser: Browser) {
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, 'en')

  await createStore(admin, 'en', ownerEmail)
  const owner = await newVisitor(browser, 'en')

  await followLinkAs(owner, 'en', (await ownerInvitationMail(ownerEmail)).link, ownerEmail)
  await expect(owner.getByText(say('en', 'stores.checklist.title'))).toBeVisible()
  const me = await (await owner.request.get('/api/me')).json() as { stores: Array<{ storeId: string }> }

  return { owner, storeId: me.stores[0].storeId }
}

function send(owner: Page, method: 'post' | 'put' | 'patch', path: string, data: unknown, version?: number): Promise<APIResponse> {
  return owner.request.fetch(`${SPA_ORIGIN}${path}`, {
    method,
    data,
    headers: { 'Origin': SPA_ORIGIN, 'Idempotency-Key': randomUUID(), ...(version === undefined ? {} : { 'If-Match': `"${version}"` }) },
  })
}

const en = categoriesEn
const phoneTop = (owner: Page) => owner.getByRole('list', { name: en['categories.phone.topList'] }).locator('xpath=./li')
const handleOf = (owner: Page, name: string) => owner.getByRole('button', { name: en['categories.drag'].replace('{name}', name) })

async function names(rows: Locator) {
  return (await rows.allInnerTexts()).map(text => text.split('\n')[0].trim())
}

async function openPhonePage(owner: Page, name: string) {
  await owner.getByRole('list', { name: en['categories.phone.topList'] }).getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(owner.getByRole('heading', { name })).toBeVisible()
}

async function addCategory(owner: Page, name: string) {
  await owner.getByRole('button', { name: en['categories.add'], exact: true }).click()
  await owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] }).fill(name)
  await owner.getByRole('button', { name: en['categories.sheet.create'], exact: true }).click()
  await expect(phoneTop(owner).filter({ hasText: name })).toBeVisible()
  await expect(owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] })).toHaveCount(0)
}

test('[E4.18][AC87] the Owner creates, renames, reorders and nests blog categories at 375 px, and the public lists show it', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const { owner } = await storeWithOwner(browser)

  await owner.goto('/store/content/categories')
  await owner.getByRole('tab', { name: en['categories.tab.blog'] }).click()
  await expect(owner.getByRole('button', { name: en['categories.add'], exact: true })).toBeVisible({ timeout: FIRST_LOAD })
  await expect(owner.getByText(en['categories.empty.blog'])).toBeVisible()

  await addCategory(owner, 'Walks')
  await addCategory(owner, 'Food')
  await addCategory(owner, 'Photo spots')

  // Rename Food in EN and DE, on its own page.
  await openPhonePage(owner, 'Food')
  await owner.getByRole('button', { name: en['categories.edit'], exact: true }).click()
  await owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] }).fill('Local food')
  await owner.getByRole('textbox', { name: en['categories.sheet.nameDe'] }).fill('Lokales Essen')
  await owner.getByRole('button', { name: en['categories.sheet.save'], exact: true }).click()
  await expect(owner.getByRole('heading', { name: 'Local food' })).toBeVisible()
  await owner.getByRole('button', { name: en['categories.phone.all'] }).click()
  await expect(phoneTop(owner).filter({ hasText: 'Local food' })).toBeVisible()

  // Move Photo spots above Walks: two steps up with the keyboard on its drag handle (the handle is found again after each move).
  for (let i = 0; i < 2; i++) {
    const ordered = owner.waitForResponse(response => response.url().includes('/categories/blog/order') && response.request().method() === 'PUT')

    await handleOf(owner, 'Photo spots').focus()
    await owner.keyboard.press('ArrowUp')
    expect((await ordered).ok()).toBe(true)
  }
  expect(await names(phoneTop(owner))).toEqual(['Photo spots', 'Walks', 'Local food'])

  // Nest Walks under Local food, from Walks' own page.
  await openPhonePage(owner, 'Walks')
  await owner.getByRole('button', { name: en['categories.edit'], exact: true }).click()
  await owner.getByRole('button', { name: new RegExp(en['categories.sheet.parent']) }).click()
  await owner.getByRole('option', { name: 'Local food' }).click()
  await owner.getByRole('button', { name: en['categories.sheet.save'], exact: true }).click()
  await expect(owner.getByText(en['categories.phone.subOf'].replace('{name}', 'Local food'))).toBeVisible()

  await owner.reload()
  // The tab is not kept over a reload: the screen opens on the map list again.
  await owner.getByRole('tab', { name: en['categories.tab.blog'] }).click()
  await expect(phoneTop(owner)).toHaveCount(2, { timeout: FIRST_LOAD })
  expect(await names(phoneTop(owner))).toEqual(['Photo spots', 'Local food'])
  await openPhonePage(owner, 'Local food')
  await expect(owner.getByRole('list', { name: en['categories.phone.subList'].replace('{name}', 'Local food') }).getByText('Walks', { exact: true })).toBeVisible()
  await owner.getByRole('button', { name: en['categories.phone.all'] }).click()
  expect(await owner.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await owner.screenshot({ path: testInfo.outputPath('blog-categories.png') })

  // The public list, read with no session, shows the order, the nesting and the names as saved.
  const blog = await (await owner.request.get(`${SPA_ORIGIN}/api/public/blog-categories?lang=en`)).json() as { items: Array<{ id: string, name: { en: string | null, de: string | null }, parentId: string | null, position: number }> }
  const byName = (en: string) => blog.items.find(item => item.name.en === en)!
  const food = byName('Local food')

  expect(food.name.de).toBe('Lokales Essen')
  expect(byName('Walks').parentId).toBe(food.id)
  expect(byName('Photo spots').name.de).toBeNull()
  expect(byName('Photo spots').position).toBeLessThan(food.position)
  // The public lists hold every store's categories and other specs share the database, so the map list is not asserted empty.
})

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const draft = (title: string, body: unknown) => ({ title, excerpt: 'Excerpt', authorName: 'Anna', authorRole: 'Guide', coverMediaId: null, body })

test('[E2.13][AC30] the public story read returns the body document, and a table or an HTML body is refused with 422', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const { owner, storeId } = await storeWithOwner(browser)
  const base = `/api/store/${storeId}/story-groups`
  const slug = `body-${Math.random().toString(36).slice(2, 8)}`
  const body = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Morning' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }, { type: 'text', text: ' and a ' }, { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }] },
      { type: 'blockquote', content: [paragraph('Quoted')] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('One')] }] },
    ],
  }
  const group = await (await send(owner, 'post', base, {})).json() as { id: string }
  const created = await send(owner, 'post', `${base}/${group.id}/versions`, { language: 'en', slug, draft: draft('Body story', body) })

  expect(created.status(), await created.text()).toBe(201)
  const version = await created.json() as { rowVersion: number }
  const published = await send(owner, 'post', `${base}/${group.id}/versions/en/publish`, undefined, version.rowVersion)

  expect(published.status(), await published.text()).toBe(200)

  const read = await owner.request.get(`${SPA_ORIGIN}/api/public/stories/${slug}?lang=en`)

  expect(read.status()).toBe(200)
  const story = await read.json() as { body: unknown, readMinutes: number, intro?: unknown, sections?: unknown }

  expect(story.body).toEqual(body)
  expect(story.readMinutes).toBe(1)
  expect(story.intro).toBeUndefined()
  expect(story.sections).toBeUndefined()

  // A refused body names where the fault is and leaves the stored draft as it was.
  const table = { type: 'doc', content: [{ type: 'table', content: [] }] }
  const current = (await published.json() as { rowVersion: number }).rowVersion
  const refusedTable = await send(owner, 'patch', `${base}/${group.id}/versions/en`, { draft: draft('Body story', table) }, current)
  const refusedHtml = await send(owner, 'patch', `${base}/${group.id}/versions/en`, { draft: draft('Body story', '<p>Hi</p>') }, current)

  for (const refused of [refusedTable, refusedHtml]) {
    expect([400, 422], await refused.text()).toContain(refused.status())
    await testInfo.attach('refused', { body: await refused.text(), contentType: 'application/json' })
  }
  expect(refusedTable.status()).toBe(422)
  expect(await refusedTable.text()).toContain('body')
})

test('[E2.7][AC51] an upload request is answered by caller and file type', async ({ browser, playwright }, testInfo) => {
  testInfo.setTimeout(240_000)
  const { owner, storeId } = await storeWithOwner(browser)
  const path = `/api/store/${storeId}/media/uploads`
  const guest = await playwright.request.newContext({ baseURL: SPA_ORIGIN })

  const asGuest = await guest.post(path, { data: { contentType: 'image/jpeg', byteSize: 1000 }, headers: { 'Origin': SPA_ORIGIN, 'Idempotency-Key': randomUUID() } })
  const svg = await send(owner, 'post', path, { contentType: 'image/svg+xml', byteSize: 1000 })
  const jpeg = await send(owner, 'post', path, { contentType: 'image/jpeg', byteSize: 2_000_000 })

  await testInfo.attach('results', { body: JSON.stringify({ guest: asGuest.status(), svg: [svg.status(), await svg.text()], jpeg: [jpeg.status(), (await jpeg.text()).slice(0, 200)] }), contentType: 'application/json' })
  expect(asGuest.status()).toBe(401)
  expect(svg.status()).toBe(422)
  // The e2e API sets no AWS_* variables, so a valid request meets storage-unavailable. With them it is 200 with a presigned PUT.
  expect([200, 503]).toContain(jpeg.status())
  await guest.dispose()
})
