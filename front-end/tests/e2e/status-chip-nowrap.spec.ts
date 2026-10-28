import type { Page } from '@playwright/test'
import process from 'node:process'
import { expect, test } from '@playwright/test'

// The merchant tables show from 1024 px. Long status labels must stay on one line in their narrow columns.
test.use({ viewport: { width: 1024, height: 900 } })

// CHIP_SHOTS=<dir> also saves the screenshots used as before/after evidence.
const shots = process.env.CHIP_SHOTS

async function signInAsOwner(page: Page) {
  await page.goto('/')
  const roleRadio = page.getByRole('dialog').getByText('Merchant · Owner', { exact: true })
  // The dev server hydrates after the first paint, so the first click can be lost: retry until the drawer is open.
  await expect(async () => {
    await page.getByRole('region', { name: 'Prototype controls' }).getByRole('button', { name: 'Guest' }).click()
    await expect(roleRadio).toBeVisible({ timeout: 2000 })
  }).toPass()
  await roleRadio.click()
  await expect(page).toHaveURL(/\/store/)
}

async function expectOneLineChips(page: Page, label: string) {
  // The phone cards are in the DOM but hidden from 1024 px: only the visible chips count.
  const labels = page.locator('.chip__label:visible')
  await expect(labels.first()).toBeVisible()
  const counts = await labels.evaluateAll(els => els.map(el => ({
    text: el.textContent,
    rects: el.getClientRects().length,
    height: el.closest('.chip')!.getBoundingClientRect().height,
  })))
  expect(counts.length, `${label} shows status chips`).toBeGreaterThan(0)
  for (const chip of counts) {
    expect.soft(chip.rects, `${label}: "${chip.text}" is one line`).toBe(1)
    expect.soft(chip.height, `${label}: "${chip.text}" chip height`).toBeLessThanOrEqual(32)
  }
}

test('[G-CHIP-NOWRAP] status chips stay on one line in the articles and comments tables', async ({ page }) => {
  await signInAsOwner(page)

  await page.getByRole('navigation', { name: 'Shop' }).locator('a[href="/store/content"]').first().click()
  await expect(page.getByText('1 linked item is unpublished').locator('visible=true').first()).toBeVisible()
  await expectOneLineChips(page, 'articles')
  if (shots)
    await page.screenshot({ path: `${shots}/articles-1024.png` })

  await page.goto('/store/content/comments')
  await expect(page.getByText('No reply yet').locator('visible=true').first()).toBeVisible()
  await expectOneLineChips(page, 'comments')
  if (shots)
    await page.screenshot({ path: `${shots}/comments-1024.png` })
})
