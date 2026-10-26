import { expect, test } from '@playwright/test'

const PRIVATE_PATHS = ['/store', '/store/orders', '/admin', '/partner', '/partner/some-token', '/lab', '/account', '/cart', '/plan', '/sign-in', '/invitation']
const PARTNER_PATHS = ['/partner', '/partner/some-token']

for (const path of PRIVATE_PATHS) {
  test(`[E3.3][AC12] ${path} is a client shell with noindex`, async ({ page, request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    const html = await response.text()

    expect(response.status()).toBeLessThan(400)
    expect(html).toContain('<script')
    // The server renders no private screen: the body holds the shell and no page content.
    expect(html).not.toMatch(/<main\b/)
    expect(response.headers()['x-robots-tag']).toBe('noindex')
    if (PARTNER_PATHS.includes(path))
      expect(response.headers()['referrer-policy']).toBe('no-referrer')
    else
      expect(response.headers()['referrer-policy']).toBeUndefined()

    await page.goto(path)
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1)
  })
}

test('[E3.3][AC12] a public path has neither header', async ({ request }) => {
  const response = await request.get('/')

  expect(response.headers()['x-robots-tag']).toBeUndefined()
  expect(response.headers()['referrer-policy']).toBeUndefined()
})
