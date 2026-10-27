import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.7 / AC24: /r/{code} is a server 302 to a same-site language path, else to the guest's language home.

async function visitCount(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('sk.demo')

    return raw ? (JSON.parse(raw).data?.referralVisits?.length ?? 0) : 0
  })
}

test('[E3.7][AC24] a referral link with a target answers 302 to it, with nothing before it', async ({ request }) => {
  const response = await request.get('/r/abc?to=%2Fen%2Fstories%2Fzytturm', { maxRedirects: 0 })

  expect(response.status()).toBe(302)
  expect(response.headers().location).toBe('/en/stories/zytturm')
  expect(response.headers()['x-robots-tag']).toBe('noindex')
  expect(await response.text()).toBe('')
})

const HOSTILE = [
  'to=https://evil.example/en',
  'to=//evil.example',
  'to=/\\evil.example',
  'to=javascript:alert(1)',
  'to=%2F%2Fevil.example',
  'to=/store/orders',
  'to=/en/../store/orders',
  'to=/en/%2e%2e/store',
  'to=/en/x%0d%0aSet-Cookie:a=b',
  'to=%252F%252Fevil.example',
  'to=',
  '',
]

for (const query of HOSTILE) {
  test(`[E3.7][AC24] a foreign or missing target (${query || 'no to'}) falls back to /en`, async ({ request }) => {
    const response = await request.get(`/r/abc${query ? `?${query}` : ''}`, { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/en')
    expect(response.headers()['x-robots-tag']).toBe('noindex')
    expect(response.headers()['set-cookie']).toBeUndefined()
  })
}

test('[E3.7][AC24] the fallback follows Accept-Language and the language cookie', async ({ request }) => {
  const byHeader = await request.get('/r/abc', { maxRedirects: 0, headers: { 'accept-language': 'de-CH' } })

  expect(byHeader.status()).toBe(302)
  expect(byHeader.headers().location).toBe('/de')

  const byCookie = await request.get('/r/abc?to=//evil.example', { maxRedirects: 0, headers: { 'cookie': 'sk_lang=de', 'accept-language': 'en' } })

  expect(byCookie.headers().location).toBe('/de')
})

test('[E3.7][AC24] a known code and an unknown code get the same answer', async ({ request }) => {
  const [known, unknown] = await Promise.all(['HOTELAMSEE', 'zzz-unknown'].map(code =>
    request.get(`/r/${code}?to=%2Fen%2Fstories%2Fzytturm`, { maxRedirects: 0 })))

  expect(known.status()).toBe(302)
  expect(unknown.status()).toBe(302)
  expect(known.headers().location).toBe('/en/stories/zytturm')
  expect(unknown.headers().location).toBe('/en/stories/zytturm')
  expect(known.headers()['x-robots-tag']).toBe('noindex')
  expect(unknown.headers()['x-robots-tag']).toBe('noindex')
})

test('[E3.7][AC24] opening the link in a browser lands on the language home and records no visit', async ({ page }) => {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error')
      problems.push(message.text())
  })
  page.on('pageerror', error => problems.push(error.message))

  await page.goto('/en')
  const before = await visitCount(page)

  // A seeded, active partner code: the old client route recorded a visit for it.
  await page.goto('/r/HOTELAMSEE')
  await expect(page).toHaveURL(/\/en$/)
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')
  await expect(page.getByRole('region', { name: 'Prototype controls' })).toBeVisible()
  expect(await visitCount(page)).toBe(before)
  expect(problems).toEqual([])
})

test('[E3.7][AC24] the prototype bar partner QR lands on the language home and records no visit', async ({ page }) => {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error')
      problems.push(message.text())
  })
  page.on('pageerror', error => problems.push(error.message))

  await page.goto('/en')
  const bar = page.getByRole('region', { name: 'Prototype controls' })

  await expect(bar).toBeVisible()
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')
  const before = await visitCount(page)

  await bar.getByRole('button', { name: 'Guest' }).click()
  await page.getByRole('button', { name: 'Via Hotel am See QR' }).click()
  const referral = page.waitForRequest(/\/r\/[^/]+$/)

  await page.getByRole('button', { name: 'Open on this device' }).click()
  // The arrival is a document request to the server route, not a client navigation.
  expect((await referral).isNavigationRequest()).toBe(true)

  await expect(page).toHaveURL(/\/en$/)
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')
  await expect(page.getByRole('region', { name: 'Prototype controls' })).toBeVisible()
  expect(await visitCount(page)).toBe(before)
  expect(problems).toEqual([])
})
