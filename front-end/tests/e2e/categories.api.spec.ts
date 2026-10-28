import type { Browser, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { categoriesEn } from '../../src/features/categories/messages'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [E4.18][AC87] N23, Content > Categories, against the real API at 375x812 on Chromium in English (playwright.config.ts).
// The Owner comes through the E2.3 path, as in members.api.spec.ts. The pin that tags a category is seeded with the
// Owner's own session through the merchant API.
const EVIDENCE = '/home/ross-geller/Projects/minastik/swiss-keepsakes/.factory/runs/20261028-sprint-6/evidence/T-E4.18'
const WIDTH = 375

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

async function openCategories(owner: Page) {
  await owner.goto('/store')
  await owner.getByRole('navigation', { name: 'Shop' }).getByRole('button', { name: 'More' }).click()
  await owner.getByRole('link', { name: 'Content' }).click()
  await expect(owner).toHaveURL(/\/store\/content$/)
  await owner.getByRole('tab', { name: categoriesEn['merchantContent.tab.categories'] }).click()
  await expect(owner).toHaveURL(/\/store\/content\/categories$/)
  await expect(owner.getByRole('button', { name: categoriesEn['categories.add'] })).toBeVisible()
  await expect(owner.getByRole('tab', { name: categoriesEn['categories.tab.map'] })).toHaveAttribute('aria-selected', 'true')
}

// The name is matched as a whole line: a sub-category's "In Walks" line must not make it a row of Walks.
const row = (owner: Page, name: string) => owner.locator('[data-category]').filter({ has: owner.getByText(name, { exact: true }) })

async function addCategory(owner: Page, name: string) {
  await owner.getByRole('button', { name: categoriesEn['categories.add'] }).click()
  await owner.getByRole('textbox', { name: categoriesEn['categories.sheet.nameEn'] }).fill(name)
  await expectFits(owner)
  await owner.getByRole('button', { name: categoriesEn['categories.sheet.create'], exact: true }).click()
  await expect(row(owner, name)).toBeVisible()
  await expect(owner.getByRole('textbox', { name: categoriesEn['categories.sheet.nameEn'] })).toHaveCount(0)
}

test('[E4.18][AC87] the Owner adds, nests and deletes map categories on a phone, a category in use is refused in words, and the page never scrolls sideways', async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000)
  const owner = await storeWithOwner(browser)
  const me = await (await owner.request.get('/api/me')).json() as { stores: Array<{ storeId: string }> }
  const { storeId } = me.stores[0]

  await openCategories(owner)
  await expectFits(owner)
  await expect(owner.getByText(categoriesEn['categories.empty.map'])).toBeVisible()

  // Create four map categories.
  await owner.getByRole('button', { name: categoriesEn['categories.add'] }).click()
  await expect(owner.getByRole('textbox', { name: categoriesEn['categories.sheet.nameEn'] })).toBeVisible()
  await expectFits(owner)
  // The sheet slides in; the picture is taken once it has settled.
  await owner.waitForTimeout(800)
  await owner.screenshot({ path: `${EVIDENCE}/add-sheet.png` })
  await owner.getByRole('button', { name: categoriesEn['categories.sheet.cancel'] }).click()
  await expect(owner.getByRole('textbox', { name: categoriesEn['categories.sheet.nameEn'] })).toHaveCount(0)

  await addCategory(owner, 'Walks')
  await expectFits(owner)
  await addCategory(owner, 'Trails')
  await addCategory(owner, 'Museums')
  await addCategory(owner, 'Cafes')
  await expectFits(owner)

  // Nest Trails under Walks.
  await owner.getByRole('button', { name: categoriesEn['categories.editLabel'].replace('{name}', 'Trails') }).click()
  await owner.getByRole('button', { name: new RegExp(categoriesEn['categories.sheet.parent']) }).click()
  await owner.getByRole('option', { name: 'Walks' }).click()
  await expectFits(owner)
  await owner.getByRole('button', { name: categoriesEn['categories.sheet.save'], exact: true }).click()
  await expect(row(owner, 'Trails').getByText(categoriesEn['categories.parentOf'].replace('{name}', 'Walks'))).toBeVisible()
  await expect(row(owner, 'Walks').getByText(categoriesEn['categories.count.children'].replace('{n}', '1'))).toBeVisible()
  await expectFits(owner)

  // A published or draft pin tagged with Museums blocks its delete.
  const list = await (await owner.request.get(`/api/store/${storeId}/categories/map`)).json() as { items: Array<{ id: string, slug: string }> }
  const museums = list.items.find(item => item.slug === 'museums')

  expect(museums).toBeDefined()
  const pin = await owner.request.post(`/api/store/${storeId}/pins`, {
    headers: { 'Idempotency-Key': randomUUID(), 'Origin': SPA_ORIGIN },
    data: { categoryIds: [museums!.id] },
  })

  expect(pin.status()).toBe(201)
  await owner.reload()
  await expect(row(owner, 'Museums').getByText(categoriesEn['categories.count.map'].replace('{n}', '1'))).toBeVisible()
  await owner.screenshot({ path: `${EVIDENCE}/map-tab.png` })

  await owner.getByRole('button', { name: categoriesEn['categories.deleteLabel'].replace('{name}', 'Museums') }).click()
  await owner.getByRole('button', { name: categoriesEn['categories.delete.confirm'] }).click()
  await expect(owner.getByRole('alert').filter({ hasText: categoriesEn['categories.problem.inUse'] })).toBeVisible()
  await expectFits(owner)
  await owner.getByRole('button', { name: categoriesEn['categories.delete.cancel'] }).click()
  await expect(row(owner, 'Museums')).toBeVisible()

  // An unused category is deleted, and the list holds after a reload.
  await owner.getByRole('button', { name: categoriesEn['categories.deleteLabel'].replace('{name}', 'Cafes') }).click()
  await owner.getByRole('button', { name: categoriesEn['categories.delete.confirm'] }).click()
  await expect(row(owner, 'Cafes')).toHaveCount(0)
  await expectFits(owner)
  await owner.reload()
  await expect(row(owner, 'Walks')).toBeVisible()
  await expect(row(owner, 'Museums')).toBeVisible()
  await expect(row(owner, 'Cafes')).toHaveCount(0)
  await expectFits(owner)

  // The Blog tab, empty for this store.
  await owner.getByRole('tab', { name: categoriesEn['categories.tab.blog'] }).click()
  await expect(owner.getByText(categoriesEn['categories.empty.blog'])).toBeVisible()
  await expectFits(owner)
  await owner.screenshot({ path: `${EVIDENCE}/blog-tab.png` })
})
