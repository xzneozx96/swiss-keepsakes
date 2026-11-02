import type { Browser, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { newEmail, ownerInvitationMail } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [T-005][T-008] A new keepsake in the stepped editor, against the real API on Chromium in English (playwright.config.ts):
// Details and Options and variants are held in the browser, Save as draft on Review and publish makes the draft with its
// variants in one request, and the same editor opens on Review and publish, where the name autosaves. The owner comes through the E2.3 path, as in
// categories.api.spec.ts.
const EVIDENCE = '/home/ross-geller/Projects/minastik/swiss-keepsakes/.factory/runs/20261030-keepsake-editor-polish/evidence/T-003-005'
const FIRST_LOAD = 60_000

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
  await expect(owner.getByRole('heading', { level: 1, name: say('en', 'stores.onboarding.title') })).toBeVisible()

  return owner
}

const bar = (page: Page) => page.getByTestId('step-bar')

test('[T-005][T-008] creates a keepsake in one request from Review and publish and opens the saved editor there', async ({ browser }) => {
  test.setTimeout(180_000)
  const owner = await storeWithOwner(browser)
  const name = `E2E Card ${Math.random().toString(36).slice(2, 7)}`
  const writes: string[] = []

  owner.on('request', (request) => {
    if (request.method() !== 'GET' && new URL(request.url()).pathname.includes('/products'))
      writes.push(`${request.method()} ${new URL(request.url()).pathname.replace(/^.*\/products/, '/products')}`)
  })
  await owner.goto('/store/products/gifts/new')
  await expect(owner.getByRole('heading', { name: 'Name and text' })).toBeVisible({ timeout: FIRST_LOAD })
  await expect(bar(owner).getByText('Not saved yet')).toBeVisible()
  await owner.screenshot({ path: `${EVIDENCE}/api-new-details-375.png` })
  await owner.getByLabel('Name (English)').fill(name)
  await owner.getByLabel('Description (English)').fill('A card with tools.')
  await bar(owner).getByRole('button', { name: 'Next' }).click()
  await expect(owner.getByRole('region', { name: 'Price' })).toBeVisible()
  await owner.getByLabel('SKU code').fill(`E2E-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
  await owner.getByLabel('Price, CHF').fill('39')
  await owner.getByLabel('Price, CHF').press('Tab')
  await owner.screenshot({ path: `${EVIDENCE}/api-new-variants-375.png` })
  await bar(owner).getByRole('button', { name: 'Next' }).click()
  await expect(owner.getByTestId('review-screen')).toBeVisible({ timeout: FIRST_LOAD })
  // Nothing was written before Save as draft.
  expect(writes).toEqual([])
  await owner.getByRole('button', { name: 'Save as draft' }).click()

  await expect(owner.getByTestId('review-screen')).toBeVisible({ timeout: FIRST_LOAD })
  await expect(owner).toHaveURL(/\/store\/products\/gifts\/[0-9a-f-]{36}\?step=review$/)
  expect(writes).toEqual(['POST /products'])
  await expect(owner.getByTestId('publish-checks').getByText('1 thing stops publishing')).toBeVisible()
  await expect(bar(owner).getByText('1 thing stops publishing')).toBeVisible()
  await expect(owner.getByText('Add at least one photo.')).toBeVisible()
  await owner.screenshot({ path: `${EVIDENCE}/api-created-review-375.png` })

  // The same editor, now with autosave: Edit goes to the Details step, and a typed change saves by itself.
  await owner.getByRole('button', { name: 'Edit' }).click()
  await expect(owner.getByRole('heading', { name: 'Photos' })).toBeVisible()
  await owner.getByLabel('Name (English)').fill(`${name} II`)
  await expect(bar(owner).getByText(/^Saved \d/)).toBeVisible({ timeout: 15_000 })
  expect(writes.filter(line => line.startsWith('PATCH'))).toHaveLength(1)
  await owner.setViewportSize({ width: 1280, height: 900 })
  await owner.screenshot({ path: `${EVIDENCE}/api-saved-details-1280.png` })
  await owner.goto('/store/products')
  await expect(owner.getByText(`${name} II`).locator('visible=true').first()).toBeVisible({ timeout: FIRST_LOAD })
})
