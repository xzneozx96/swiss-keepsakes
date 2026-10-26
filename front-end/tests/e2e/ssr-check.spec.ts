import { expect, test } from '@playwright/test'

test('[E3.2][AC-2] server HTML contains the providers text', async ({ request }) => {
  const response = await request.get('/ssr-check')
  const html = await response.text()

  expect(response.status()).toBe(200)
  expect(html).toContain('SSR check')
  expect(html).toContain('Signed out')
  expect(html).toContain('data-language="en"')
})

test('[E3.2][AC-2] hydrates with no hydration or console error', async ({ page, request }) => {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

  const serverHtml = await (await request.get('/ssr-check')).text()

  await page.goto('/ssr-check')
  await expect(page.locator('[data-ssr-check]')).toHaveAttribute('data-hydrated', 'true')

  const text = await page.locator('[data-ssr-check]').textContent() ?? ''

  expect(text).toContain('SSR check')
  expect(text).toContain('Signed out')
  expect(text).toContain('en')
  // The first HTML carried the same visible text.
  expect(serverHtml).toContain('Signed out')
  expect(problems).toEqual([])
})

test('[E3.2][AC01] a guest moves between two pages with no sign-in prompt', async ({ page }) => {
  const urls: string[] = []

  page.on('framenavigated', frame => urls.push(frame.url()))
  await page.goto('/ssr-check')
  await expect(page.locator('[data-ssr-check]')).toHaveAttribute('data-hydrated', 'true')
  await page.evaluate(() => {
    (window as unknown as { marker: string }).marker = 'kept'
  })
  await expect(page.getByRole('heading', { name: 'SSR check', exact: true })).toBeVisible()
  expect(await page.getByText('Sign in').count()).toBe(0)

  await page.getByRole('link', { name: 'Go to page B' }).click()

  await expect(page).toHaveURL(/\/ssr-check-b$/)
  await expect(page.getByRole('heading', { name: 'SSR check B' })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
  expect(await page.getByText('Sign in').count()).toBe(0)
  expect(urls.some(url => url.includes('sign-in'))).toBe(false)
})
