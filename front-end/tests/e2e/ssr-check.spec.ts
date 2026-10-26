import { expect, test } from '@playwright/test'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: '\u00A0' }

/** The visible text of the test page's `<main>`, taken from HTML, with its entities decoded as the browser does. */
function mainText(html: string) {
  const inner = /<main[^>]*data-ssr-check[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? ''

  return inner
    .replaceAll(/<!--.*?-->|<[^>]+>/g, '')
    .replaceAll(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (whole, hex, dec, name) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : ENTITIES[name.toLowerCase()] ?? whole)
}

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

  expect(text).toContain('Language: en')
  // The first HTML carried the same visible text.
  expect(text).toBe(mainText(serverHtml))
  expect(text).not.toBe('')
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

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/ssr-check-b$/)
  await expect(page.getByRole('heading', { name: 'SSR check B' })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
  expect(await page.getByText('Sign in').count()).toBe(0)
  expect(urls.some(url => url.includes('sign-in'))).toBe(false)
})

test('[E3.2][AC01] a first visit with empty storage moves to a guest page on the client, with no sign-in prompt', async ({ page }) => {
  const urls: string[] = []

  page.on('framenavigated', frame => urls.push(frame.url()))
  // A new browser context starts with empty storage.
  await page.goto('/')
  await expect(page.getByRole('navigation').first()).toBeVisible()
  // The server HTML shows the links before React owns them; a click then would load the page again.
  await page.waitForFunction(() => Object.keys(document.querySelector('nav a') ?? {}).some(key => key.startsWith('__reactProps')))
  await page.evaluate(() => {
    (window as unknown as { marker: string }).marker = 'kept'
  })
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)

  await page.locator('nav a[href="/tours"]').first().click()

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/tours$/)
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)
  expect(urls.some(url => url.includes('sign-in'))).toBe(false)
})

test('[E3.2][AC-2] saved German and a saved sign-in hydrate with no error', async ({ page, request }) => {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

  // Let the app write its own current saved state, then sign the demo guest in as the owner.
  await page.goto('/lab')
  await page.waitForFunction(() => localStorage.getItem('sk.demo') !== null)
  const saved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('sk.demo') as string)

    state.role = 'owner'
    state.data.signedInGuestId = state.data.guests[0].id

    return JSON.stringify(state)
  })

  await page.addInitScript((demo) => {
    localStorage.setItem('sk.language', '"de"')
    localStorage.setItem('sk.demo', demo)
  }, saved)

  const html = await (await request.get('/ssr-check')).text()

  expect(html).toContain('data-language="en"')
  expect(html).toContain('Signed out')

  await page.goto('/ssr-check')
  await expect(page.locator('[data-ssr-check]')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.locator('[data-ssr-check]')).toHaveAttribute('data-language', 'de')
  await expect(page.getByText('Signed in')).toBeVisible()
  expect(problems).toEqual([])
})
