import type { Browser, Locator, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { categoriesEn } from '../../src/features/categories/messages'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [E4.18][AC87] N23, Content > Categories, against the real API on Chromium in English (playwright.config.ts): the phone
// drill-in at 375x812 and the grouped table at 1280x900. Drags use the real mouse on the handle, and the order is read
// back from the API after a reload.
// The Owner comes through the E2.3 path, as in members.api.spec.ts. The pin that tags a category is seeded with the
// Owner's own session through the merchant API.
const EVIDENCE = '/home/ross-geller/Projects/minastik/swiss-keepsakes/.factory/runs/20261028-sprint-6/evidence/T-E4.18'
const WIDTH = 375
const DESKTOP = { width: 1280, height: 900 }
// The first load of a page and of its API answers is slow on the remote Neon branch.
const FIRST_LOAD = 60_000

// A failed run keeps its trace, so a stalled request can be told from a product bug.
test.use({ trace: 'retain-on-failure' })

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
  const mail = await ownerInvitationMail(ownerEmail)
  const owner = await newVisitor(browser, 'en')

  await followLinkAs(owner, 'en', mail.link, ownerEmail)
  await expect(owner.getByText(say('en', 'stores.checklist.title'))).toBeVisible()

  return owner
}

/** No sideways scroll, and no text cut off by its own box or by the screen edge. */
async function expectFits(page: Page) {
  const found = await page.evaluate((width) => {
    const clipped: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      const element = node.parentElement

      if (!text || !element || element.closest('[aria-hidden="true"], .sr-only'))
        continue
      const style = getComputedStyle(element)

      if (style.visibility === 'hidden' || style.display === 'none')
        continue
      const range = document.createRange()

      range.selectNodeContents(node)
      const box = range.getBoundingClientRect()

      if (box.width === 0)
        continue
      if (box.right > width + 0.5 || box.left < -0.5)
        clipped.push(`${text} (off screen)`)
      if (style.overflowX !== 'visible' && element.scrollWidth > element.clientWidth + 1 && style.textOverflow === 'ellipsis')
        clipped.push(`${text} (ellipsis)`)
    }

    return { scrollWidth: document.documentElement.scrollWidth, clipped }
  }, WIDTH)

  expect(found.scrollWidth).toBeLessThanOrEqual(WIDTH)
  expect(found.clipped).toEqual([])
}

function answered(owner: Page, path: string) {
  return owner.waitForResponse(
    response => new URL(response.url()).pathname.endsWith(path) && response.request().method() === 'GET',
    { timeout: FIRST_LOAD },
  )
}

async function openCategories(owner: Page) {
  await owner.goto('/store')
  await owner.getByRole('navigation', { name: 'Shop' }).getByRole('button', { name: 'More' }).click()
  await owner.getByRole('link', { name: 'Content' }).click()
  await expect(owner).toHaveURL(/\/store\/content$/)
  // The dashboard does not ask for /api/me; the Categories screen does, then reads the list.
  const me = answered(owner, '/api/me')
  const map = answered(owner, '/categories/map')

  await owner.getByRole('tab', { name: categoriesEn['merchantContent.tab.categories'] }).click()
  await expect(owner).toHaveURL(/\/store\/content\/categories$/)
  expect((await me).ok()).toBe(true)
  expect((await map).ok()).toBe(true)
  await expect(owner.getByRole('button', { name: categoriesEn['categories.add'] })).toBeVisible({ timeout: FIRST_LOAD })
  await expect(owner.getByRole('tab', { name: categoriesEn['categories.tab.map'] })).toHaveAttribute('aria-selected', 'true')
}

const en = categoriesEn
const dragLabel = (name: string) => en['categories.drag'].replace('{name}', name)
const handleOf = (page: Page, name: string) => page.getByRole('button', { name: dragLabel(name) })

interface Item { id: string, name: { en: string | null }, parentId: string | null }

async function listOf(owner: Page, storeId: string) {
  const response = await owner.request.get(`/api/store/${storeId}/categories/map`)

  expect(response.ok()).toBe(true)

  return (await response.json() as { items: Item[] }).items
}

/** The API's order as `Parent` for a top-level category and `Parent/Child` for a sub-category. */
function shape(items: Item[]) {
  const name = (id: string | null) => items.find(item => item.id === id)?.name.en
  const parents = items.filter(item => item.parentId === null).map(item => name(item.id)!)
  const kids = items.filter(item => item.parentId !== null).map(item => `${name(item.parentId)}/${name(item.id)}`)

  return { parents, kids }
}

async function create(owner: Page, storeId: string, name: string, parentId?: string) {
  const response = await owner.request.post(`/api/store/${storeId}/categories/map`, {
    headers: { 'Idempotency-Key': randomUUID(), 'Origin': SPA_ORIGIN },
    data: { name: { en: name }, ...(parentId ? { parentId } : {}) },
  })

  expect(response.status()).toBe(201)

  return (await response.json() as Item).id
}

/** Walks (Hill, Lake, Pond), Museums, Cafes, in this order. */
async function seedTree(owner: Page) {
  const me = await (await owner.request.get('/api/me')).json() as { stores: Array<{ storeId: string }> }
  const { storeId } = me.stores[0]
  const walks = await create(owner, storeId, 'Walks')

  await create(owner, storeId, 'Museums')
  await create(owner, storeId, 'Cafes')
  for (const name of ['Hill', 'Lake', 'Pond'])
    await create(owner, storeId, name, walks)

  return storeId
}

const SEEDED = { parents: ['Walks', 'Museums', 'Cafes'], kids: ['Walks/Hill', 'Walks/Lake', 'Walks/Pond'] }

/** The first line of each row, which is the category's name (a handle has no text). */
async function names(rows: Locator) {
  return (await rows.allInnerTexts()).map(text => text.split('\n')[0].trim())
}

/**
 * Presses the handle with the real mouse, moves in steps to just past `target`'s edge and releases there. The
 * move is checked against the API: one PUT that is ok, with `parentId` and the full order of that level.
 */
async function dragHandle(page: Page, handle: Locator, target: Locator, where: 'below' | 'above') {
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!
  const x = from.x + from.width / 2
  const y = from.y + from.height / 2
  const endY = where === 'below' ? to.y + to.height + 15 : to.y - 15
  const put = page.waitForResponse(response => response.url().endsWith('/categories/map/order') && response.request().method() === 'PUT')

  await page.mouse.move(x, y)
  await page.mouse.down()
  // The first move passes the drag threshold; the drag starts there.
  await page.mouse.move(x, y + (where === 'below' ? 24 : -24), { steps: 4 })
  await page.mouse.move(x, endY, { steps: 30 })
  await page.mouse.up()
  const response = await put

  expect(response.ok()).toBe(true)
  expect(response.request().headers()['idempotency-key']).toBeTruthy()

  return response.request().postDataJSON() as { parentId: string | null, ids: string[] }
}

const idsOf = (items: Item[], list: string[]) => list.map(name => items.find(item => item.name.en === name)!.id)

/** The tab list fills the screen on a phone and is only as wide as its tabs on a desktop. */
async function tabsWidth(owner: Page) {
  const list = owner.getByRole('tablist', { name: en['categories.tabs'] })
  const container = (await list.locator('xpath=..').boundingBox())!
  const screen = (await owner.getByTestId('categories-screen').boundingBox())!
  const tabs = await owner.getByRole('tab').evaluateAll(nodes => nodes.reduce((sum, node) => sum + node.getBoundingClientRect().width, 0))

  return { container: container.width, screen: screen.width, tabs }
}

/** A desktop browser with the Owner's session, so the setup (the invitation) runs once on the phone. */
async function desktopOf(browser: Browser, owner: Page) {
  const context = await browser.newContext({
    storageState: await owner.context().storageState(),
    baseURL: SPA_ORIGIN,
    viewport: DESKTOP,
    locale: 'en-CH',
  })

  await newClientAddress(context)
  await context.addInitScript((value: string) => localStorage.setItem('sk.language', JSON.stringify(value)), 'en')

  return { context, page: await context.newPage() }
}

async function openDesktop(page: Page) {
  const map = answered(page, '/categories/map')

  await page.goto('/store/content/categories')
  expect((await map).ok()).toBe(true)
  await expect(page.getByRole('button', { name: en['categories.add'], exact: true })).toBeVisible({ timeout: FIRST_LOAD })
  await expect(page.getByRole('grid')).toBeVisible()
}

const phoneTop = (owner: Page) => owner.getByRole('list', { name: en['categories.phone.topList'] }).locator('xpath=./li')
const phoneSubs = (owner: Page, parent: string) => owner.getByRole('list', { name: en['categories.phone.subList'].replace('{name}', parent) }).locator('xpath=./li')
const tableRows = (page: Page) => page.getByRole('row').filter({ has: page.locator('[data-grip]') })
const rowWith = (page: Page, name: string) => tableRows(page).filter({ has: handleOf(page, name) })

async function openPhonePage(owner: Page, name: string) {
  await owner.getByRole('list', { name: en['categories.phone.topList'] }).getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(owner.getByRole('heading', { name })).toBeVisible()
}

async function addCategory(owner: Page, name: string) {
  await owner.getByRole('button', { name: en['categories.add'], exact: true }).click()
  await owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] }).fill(name)
  await expectFits(owner)
  await owner.getByRole('button', { name: en['categories.sheet.create'], exact: true }).click()
  await expect(phoneTop(owner).filter({ hasText: name })).toBeVisible()
  await expect(owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] })).toHaveCount(0)
}

test('[E4.18][AC87] the Owner adds, nests and deletes map categories on a phone, a category in use is refused in words, and the page never scrolls sideways', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const owner = await storeWithOwner(browser)
  const me = await (await owner.request.get('/api/me')).json() as { stores: Array<{ storeId: string }> }
  const { storeId } = me.stores[0]

  await openCategories(owner)
  await expectFits(owner)
  await expect(owner.getByText(en['categories.empty.map'])).toBeVisible()

  // The tabs fill the screen on a phone.
  const widths = await tabsWidth(owner)

  expect(widths.container).toBeGreaterThan(WIDTH - 40)
  expect(Math.abs(widths.container - widths.screen)).toBeLessThanOrEqual(40)

  // The add sheet opens and closes without a request.
  await owner.getByRole('button', { name: en['categories.add'], exact: true }).click()
  await expect(owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] })).toBeVisible()
  await expectFits(owner)
  // The sheet slides in; the picture is taken once it has settled.
  await owner.waitForTimeout(800)
  await owner.screenshot({ path: `${EVIDENCE}/add-sheet.png` })
  await owner.getByRole('button', { name: en['categories.sheet.cancel'] }).click()
  await expect(owner.getByRole('textbox', { name: en['categories.sheet.nameEn'] })).toHaveCount(0)
  expect(await listOf(owner, storeId)).toEqual([])

  await addCategory(owner, 'Walks')
  await addCategory(owner, 'Trails')
  await addCategory(owner, 'Museums')
  await addCategory(owner, 'Cafes')
  await expectFits(owner)
  expect(await names(phoneTop(owner))).toEqual(['Walks', 'Trails', 'Museums', 'Cafes'])

  // Nest Trails under Walks from Trails' own page.
  await openPhonePage(owner, 'Trails')
  await owner.getByRole('button', { name: en['categories.edit'], exact: true }).click()
  await owner.getByRole('button', { name: new RegExp(en['categories.sheet.parent']) }).click()
  await owner.getByRole('option', { name: 'Walks' }).click()
  await expectFits(owner)
  await owner.getByRole('button', { name: en['categories.sheet.save'], exact: true }).click()
  await expect(owner.getByText(en['categories.phone.subOf'].replace('{name}', 'Walks'))).toBeVisible()
  await owner.getByRole('button', { name: 'Walks' }).click()
  await expect(phoneSubs(owner, 'Walks')).toHaveCount(1)
  await expect(owner.getByRole('heading', { name: en['categories.phone.subsTitle'].replace('{n}', '1') })).toBeVisible()
  await expectFits(owner)
  expect(shape(await listOf(owner, storeId)).kids).toEqual(['Walks/Trails'])

  // Walks has a sub-category, so its delete is blocked and says so; the API refuses it too.
  await expect(owner.getByRole('button', { name: en['categories.delete.confirm'] })).toBeDisabled()
  await expect(owner.getByText(en['categories.refusal.children.one'].replace('{n}', '1').replace('{names}', 'Trails'))).toBeVisible()
  const items = await listOf(owner, storeId)
  const walks = items.find(item => item.name.en === 'Walks')!
  const blocked = await owner.request.delete(`/api/store/${storeId}/categories/map/${walks.id}`, { headers: { 'Idempotency-Key': randomUUID(), 'Origin': SPA_ORIGIN } })

  expect(blocked.status()).toBe(409)
  await owner.getByRole('button', { name: en['categories.phone.all'] }).click()

  // Move Walks below Museums with the keyboard on its handle; the order holds after a reload.
  expect(await names(phoneTop(owner))).toEqual(['Walks', 'Museums', 'Cafes'])
  const ordered = owner.waitForResponse(response => response.url().endsWith('/categories/map/order') && response.request().method() === 'PUT')

  await handleOf(owner, 'Walks').focus()
  await owner.keyboard.press('ArrowDown')
  expect((await ordered).ok()).toBe(true)
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  expect(await names(phoneTop(owner))).toEqual(['Museums', 'Walks', 'Cafes'])
  expect(shape(await listOf(owner, storeId))).toEqual({ parents: ['Museums', 'Walks', 'Cafes'], kids: ['Walks/Trails'] })
  await expectFits(owner)

  // A pin tagged with Museums blocks its delete.
  const museums = items.find(item => item.name.en === 'Museums')!
  const pin = await owner.request.post(`/api/store/${storeId}/pins`, {
    headers: { 'Idempotency-Key': randomUUID(), 'Origin': SPA_ORIGIN },
    data: { categoryIds: [museums.id] },
  })

  expect(pin.status()).toBe(201)
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  await owner.screenshot({ path: `${EVIDENCE}/map-tab.png` })
  await openPhonePage(owner, 'Museums')
  await expect(owner.getByText(en['categories.refusal.uses.map.one'].replace('{n}', '1'))).toBeVisible()
  await expect(owner.getByRole('button', { name: en['categories.delete.confirm'] })).toBeDisabled()
  await expectFits(owner)
  const inUse = await owner.request.delete(`/api/store/${storeId}/categories/map/${museums.id}`, { headers: { 'Idempotency-Key': randomUUID(), 'Origin': SPA_ORIGIN } })

  expect(inUse.status()).toBe(409)
  await owner.getByRole('button', { name: en['categories.phone.all'] }).click()

  // An unused category is deleted after a confirm, and the list holds after a reload.
  await openPhonePage(owner, 'Cafes')
  await owner.getByRole('button', { name: en['categories.delete.confirm'] }).click()
  await owner.getByRole('alertdialog').getByRole('button', { name: en['categories.sheet.cancel'] }).click()
  expect((await listOf(owner, storeId)).some(item => item.name.en === 'Cafes')).toBe(true)
  await owner.getByRole('button', { name: en['categories.delete.confirm'] }).click()
  await owner.getByRole('alertdialog').getByRole('button', { name: en['categories.delete.confirm'] }).click()
  await expect(phoneTop(owner).filter({ hasText: 'Cafes' })).toHaveCount(0)
  await expectFits(owner)
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(2, { timeout: FIRST_LOAD })
  expect(await names(phoneTop(owner))).toEqual(['Museums', 'Walks'])
  expect(shape(await listOf(owner, storeId))).toEqual({ parents: ['Museums', 'Walks'], kids: ['Walks/Trails'] })

  // The Blog tab, empty for this store.
  await owner.getByRole('tab', { name: en['categories.tab.blog'] }).click()
  await expect(owner.getByText(en['categories.empty.blog'])).toBeVisible()
  await expectFits(owner)
  await owner.screenshot({ path: `${EVIDENCE}/blog-tab.png` })
})

test('[E4.18][AC87] a real mouse drag reorders the parents and the sub-categories on a phone, a sub-category never changes its parent', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const owner = await storeWithOwner(browser)
  const storeId = await seedTree(owner)

  await openCategories(owner)
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  expect(shape(await listOf(owner, storeId))).toEqual(SEEDED)

  // Walks (with its sub-categories) to the bottom among the parents.
  let items = await listOf(owner, storeId)
  let sent = await dragHandle(owner, handleOf(owner, 'Walks'), phoneTop(owner).filter({ has: handleOf(owner, 'Cafes') }), 'below')

  expect(sent).toEqual({ parentId: null, ids: idsOf(items, ['Museums', 'Cafes', 'Walks']) })
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  expect(await names(phoneTop(owner))).toEqual(['Museums', 'Cafes', 'Walks'])
  expect(shape(await listOf(owner, storeId))).toEqual({ parents: ['Museums', 'Cafes', 'Walks'], kids: SEEDED.kids })

  // And the last one back to the top.
  items = await listOf(owner, storeId)
  sent = await dragHandle(owner, handleOf(owner, 'Walks'), phoneTop(owner).filter({ has: handleOf(owner, 'Museums') }), 'above')
  expect(sent).toEqual({ parentId: null, ids: idsOf(items, ['Walks', 'Museums', 'Cafes']) })
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  expect(await names(phoneTop(owner))).toEqual(SEEDED.parents)

  // Hill to the bottom among Walks' sub-categories, on Walks' page.
  await openPhonePage(owner, 'Walks')
  await expect(phoneSubs(owner, 'Walks')).toHaveCount(3)
  items = await listOf(owner, storeId)
  const walks = items.find(item => item.name.en === 'Walks')!
  const subSent = await dragHandle(owner, handleOf(owner, 'Hill'), phoneSubs(owner, 'Walks').filter({ has: handleOf(owner, 'Pond') }), 'below')

  expect(subSent).toEqual({ parentId: walks.id, ids: idsOf(items, ['Lake', 'Pond', 'Hill']) })
  await owner.reload()
  await expect(phoneTop(owner)).toHaveCount(3, { timeout: FIRST_LOAD })
  await openPhonePage(owner, 'Walks')
  expect(await names(phoneSubs(owner, 'Walks'))).toEqual(['Lake', 'Pond', 'Hill'])
  // The parents did not move, and every sub-category is still Walks'.
  const after = await listOf(owner, storeId)

  expect(shape(after)).toEqual({ parents: SEEDED.parents, kids: ['Walks/Lake', 'Walks/Pond', 'Walks/Hill'] })
  expect(after.filter(item => item.parentId !== null).every(item => item.parentId === walks.id)).toBe(true)
  await expectFits(owner)
})

test('[E4.18][AC87] on a desktop the tabs fit their tabs, and a real mouse drag reorders the parents and the sub-categories in the table', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const phone = await storeWithOwner(browser)
  const storeId = await seedTree(phone)
  const { context, page } = await desktopOf(browser, phone)

  try {
    await openDesktop(page)
    expect(await names(tableRows(page))).toEqual(['Walks', 'Hill', 'Lake', 'Pond', 'Museums', 'Cafes'])
    const widths = await tabsWidth(page)

    expect(widths.container).toBeLessThan(widths.screen / 2)
    expect(widths.container).toBeGreaterThanOrEqual(widths.tabs)
    expect(widths.container).toBeLessThanOrEqual(widths.tabs + 8)
    // Search hides the handles; clearing it brings them back.
    await page.getByRole('searchbox', { name: en['categories.search.label'] }).fill('lake')
    await expect(page.locator('[data-grip]')).toHaveCount(0)
    await page.getByRole('searchbox', { name: en['categories.search.label'] }).fill('')
    await expect(page.locator('[data-grip]')).toHaveCount(6)

    // Walks (its sub-categories fold while it moves) to the bottom among the parents.
    let items = await listOf(phone, storeId)
    let sent = await dragHandle(page, handleOf(page, 'Walks'), rowWith(page, 'Cafes'), 'below')

    expect(sent).toEqual({ parentId: null, ids: idsOf(items, ['Museums', 'Cafes', 'Walks']) })
    await page.reload()
    await expect(page.locator('[data-grip]')).toHaveCount(6, { timeout: FIRST_LOAD })
    expect(await names(tableRows(page))).toEqual(['Museums', 'Cafes', 'Walks', 'Hill', 'Lake', 'Pond'])
    expect(shape(await listOf(phone, storeId))).toEqual({ parents: ['Museums', 'Cafes', 'Walks'], kids: SEEDED.kids })

    // The last parent back to the top.
    items = await listOf(phone, storeId)
    sent = await dragHandle(page, handleOf(page, 'Walks'), rowWith(page, 'Museums'), 'above')
    expect(sent).toEqual({ parentId: null, ids: idsOf(items, ['Walks', 'Museums', 'Cafes']) })
    await page.reload()
    await expect(page.locator('[data-grip]')).toHaveCount(6, { timeout: FIRST_LOAD })
    expect(await names(tableRows(page))).toEqual(['Walks', 'Hill', 'Lake', 'Pond', 'Museums', 'Cafes'])

    // Pond to the top among Walks' sub-categories; the parents and the parent of each sub-category stay.
    items = await listOf(phone, storeId)
    const walks = items.find(item => item.name.en === 'Walks')!

    sent = await dragHandle(page, handleOf(page, 'Pond'), rowWith(page, 'Hill'), 'above')
    expect(sent).toEqual({ parentId: walks.id, ids: idsOf(items, ['Pond', 'Hill', 'Lake']) })
    await page.reload()
    await expect(page.locator('[data-grip]')).toHaveCount(6, { timeout: FIRST_LOAD })
    expect(await names(tableRows(page))).toEqual(['Walks', 'Pond', 'Hill', 'Lake', 'Museums', 'Cafes'])
    const after = await listOf(phone, storeId)

    expect(shape(after)).toEqual({ parents: SEEDED.parents, kids: ['Walks/Pond', 'Walks/Hill', 'Walks/Lake'] })
    expect(after.filter(item => item.parentId !== null).every(item => item.parentId === walks.id)).toBe(true)
  }
  finally {
    await context.close()
  }
})
