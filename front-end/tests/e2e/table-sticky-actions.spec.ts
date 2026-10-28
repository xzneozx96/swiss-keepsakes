import { expect, test } from '@playwright/test'

// The stories table shows from 1024 px (phones get cards), where the content column is about 700 px wide:
// the narrowest a DataTable with an Actions column ever renders.
test.use({ viewport: { width: 1024, height: 900 } })

test('[G-TABLE-STICKY] stories table keeps its widths, scrolls sideways and pins the actions column', async ({ page }) => {
  await page.goto('/')
  const roleRadio = page.getByRole('dialog').getByText('Merchant · Owner', { exact: true })
  // The dev server hydrates after the first paint, so the first click can be lost: retry until the drawer is open.
  await expect(async () => {
    await page.getByRole('region', { name: 'Prototype controls' }).getByRole('button', { name: 'Guest' }).click()
    await expect(roleRadio).toBeVisible({ timeout: 2000 })
  }).toPass()
  await roleRadio.click()
  await expect(page).toHaveURL(/\/store/)
  await page.getByRole('navigation', { name: 'Shop' }).locator('a[href="/store/content"]').first().click()

  const container = page.locator('.table__scroll-container').first()
  const actions = page.getByRole('button', { name: /actions/i }).first()

  await expect(actions).toBeVisible()
  const sizes = await container.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }))
  expect(sizes.scroll).toBeGreaterThan(sizes.client)

  // The article title keeps its width: at most two lines.
  const title = page.getByRole('rowheader').first().locator('span.font-semibold')
  const lines = await title.evaluate(el => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)))
  expect(lines).toBeLessThanOrEqual(2)

  for (const scrollLeft of [0, sizes.scroll]) {
    await container.evaluate((el, x) => { el.scrollLeft = x }, scrollLeft)
    await expect(actions).toBeVisible()
    const box = (await actions.boundingBox())!
    const edge = (await container.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(edge.x + edge.width)
    // Clickable: nothing sits on top of the button at its centre.
    const topmostIsButton = await actions.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
    })
    expect(topmostIsButton).toBe(true)
  }

  await actions.click()
  await expect(page.getByRole('menu')).toBeVisible()
  // The row is a link everywhere but on the actions cell: the menu opened and the page did not navigate.
  await expect(page).toHaveURL(/\/store\/content$/)
})
