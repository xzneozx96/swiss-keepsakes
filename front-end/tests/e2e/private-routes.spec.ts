import { expect, test } from '@playwright/test'

const PRIVATE_PATHS = ['/store', '/store/orders', '/admin', '/partner', '/partner/some-token', '/lab', '/account', '/cart', '/en/plan', '/de/plan', '/sign-in', '/invitation', '/Partner/some-token', '/PARTNER/some-token', '/%50artner/some-token', '/Store/orders', '/ADMIN']
const PARTNER_PATHS = ['/partner', '/partner/some-token', '/Partner/some-token', '/PARTNER/some-token', '/%50artner/some-token']

/** A piece of each screen's own text, so the test can see the server did not render the screen. `/partner` shows none. */
const SCREEN_TEXT: Record<string, string> = {
  '/store': 'Conversion',
  '/admin': 'Stores',
  '/partner/some-token': 'Commission report',
  '/lab': 'UI experiments for the prototype',
  '/account': 'Sign in to see your orders',
  '/cart': 'Your cart is empty',
  '/en/plan': 'Plan my day in Luzerne',
  '/de/plan': 'Plan my day in Luzerne',
  '/sign-in': 'Sign in to continue',
  '/invitation': 'Join a store',
}

/** The screen text for a path: its family's, with case and a %-escape in the first segment read as the router does. */
function screenText(path: string) {
  const [, first = '', ...rest] = decodeURIComponent(path).toLowerCase().split('/')

  return SCREEN_TEXT[`/${[first, ...rest].join('/')}`] ?? (first === 'store' ? SCREEN_TEXT['/store'] : undefined)
}

for (const path of PRIVATE_PATHS) {
  test(`[E3.3][AC12] ${path} is a client shell with noindex`, async ({ page, request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    const html = await response.text()

    expect(response.status()).toBeLessThan(400)
    expect(html).toContain('<script')
    // The server renders no private screen: the body holds the shell and no page content.
    expect(html).not.toMatch(/<main\b/)
    expect(html).toContain('<meta name="robots" content="noindex"')
    const text = screenText(path)

    // `/sign-in` has no `<main>`, so its absence above proves nothing there: look for the screen's own text.
    if (text)
      expect(html).not.toContain(text)
    expect(response.headers()['x-robots-tag']).toBe('noindex')
    if (PARTNER_PATHS.includes(path))
      expect(response.headers()['referrer-policy']).toBe('no-referrer')
    else
      expect(response.headers()['referrer-policy']).toBeUndefined()

    await page.goto(path)
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1)
    // The same text does show once the browser has rendered the screen, so the check above could have failed.
    if (text)
      await expect(page.getByText(text).first()).toBeVisible()
  })
}

test('[E3.7][AC24] /r/abc is a 302 with noindex and no shell', async ({ request }) => {
  const response = await request.get('/r/abc', { maxRedirects: 0 })
  const body = await response.text()

  expect(response.status()).toBe(302)
  expect(response.headers()['x-robots-tag']).toBe('noindex')
  expect(response.headers()['referrer-policy']).toBeUndefined()
  expect(body).not.toContain('<script')
  expect(body).not.toMatch(/<main\b/)
  expect(body).not.toContain('Make yourself at home')
})

test('[E3.3][AC12] a public path has neither header', async ({ request }) => {
  const response = await request.get('/')

  expect(response.headers()['x-robots-tag']).toBeUndefined()
  expect(response.headers()['referrer-policy']).toBeUndefined()
})

test('[E3.3][AC12] a bad %-escape is refused by the server before any screen is served', async ({ request }) => {
  const response = await request.get('/%50artner/tok%E0', { maxRedirects: 0 })

  expect(response.status()).toBe(400)
  expect(await response.text()).not.toContain('<script')
})

test('[E3.3][AC12] a 404 under a private prefix carries the headers too', async ({ request }) => {
  const response = await request.get('/partner/some-token/x', { maxRedirects: 0 })

  expect(response.status()).toBe(404)
  expect(response.headers()['x-robots-tag']).toBe('noindex')
  expect(response.headers()['referrer-policy']).toBe('no-referrer')
})
