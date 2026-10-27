import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.5 / AC30: guest routes live under /en and /de, the URL decides the page language, cart and account keep the stored one.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

type Lang = 'en' | 'de'
const LANGS: Lang[] = ['en', 'de']

/** The h1 of each guest list page, in each language (the dictionaries are read by the app, so these are the shipped words). */
const HEADINGS: Record<Lang, Record<string, string>> = {
  en: { '': 'Make yourself at home', '/stories': 'Local stories', '/tours': 'Tours around Luzerne', '/gifts': 'Keepsakes' },
  de: { '': 'Fühlen Sie sich wie zu Hause', '/stories': 'Geschichten aus Luzern', '/tours': 'Touren rund um Luzern', '/gifts': 'Andenken' },
}

/** A message key shown raw, such as `nav.account` or `cart.empty.message`. */
const RAW_KEY = /(?:^|\s)[a-z]{2,}(?:\.[a-z]{2}[a-zA-Z0-9]*){1,3}(?=\s|$)/

async function hydrated(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')
}

function problemsOf(page: Page) {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

  return problems
}

function htmlLang(html: string) {
  return /<html\s[^>]*?\blang="([^"]*)"/.exec(html)?.[1]
}

function switchTo(page: Page, language: Lang) {
  return page.getByRole('group', { name: 'Language' }).getByRole('button', { name: language.toUpperCase(), exact: true }).click()
}

function stored(page: Page) {
  return page.evaluate(() => localStorage.getItem('sk.language'))
}

// AC-1
const REDIRECTS: { cookie?: string, accept?: string, path: string, target: string }[] = [
  { path: '/', target: '/en' },
  { accept: 'de-CH', path: '/', target: '/de' },
  { cookie: 'sk_lang=en', accept: 'de-CH', path: '/', target: '/en' },
  { path: '/stories', target: '/en/stories' },
  { cookie: 'sk_lang=de', path: '/tours', target: '/de/tours' },
  // Case and a %-escape in the old root are read as the router reads them.
  { path: '/Stories', target: '/en/stories' },
  { path: '/%47ifts/lucerne-gift-box', target: '/en/gifts/lucerne-gift-box' },
]

for (const { cookie, accept, path, target } of REDIRECTS) {
  test(`[E3.5][AC30] AC-1 ${path} with cookie ${cookie ?? 'none'} and Accept-Language ${accept ?? 'none'} answers 302 to ${target}`, async ({ request }) => {
    const headers: Record<string, string> = { 'Accept-Language': accept ?? '' }

    if (cookie)
      headers.Cookie = cookie
    const response = await request.get(path, { maxRedirects: 0, headers })

    expect(response.status()).toBe(302)
    expect(new URL(response.headers().location!, 'http://x').pathname).toBe(target)
  })
}

test('[E3.5][AC30] AC-1 a redirect keeps the query string', async ({ request }) => {
  const response = await request.get('/search?q=Pilatus', { maxRedirects: 0 })

  expect(response.status()).toBe(302)
  expect(response.headers().location).toMatch(/^\/en\/search\?q=Pilatus$|\/en\/search\?q=Pilatus$/)
})

for (const lang of LANGS) {
  for (const [suffix, heading] of Object.entries(HEADINGS[lang])) {
    test(`[E3.5][AC30] AC-1 /${lang}${suffix} renders a page in ${lang} with its heading`, async ({ page }) => {
      const problems = problemsOf(page)

      await page.goto(`/${lang}${suffix}`)
      await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: heading }).first()).toBeVisible()
      await hydrated(page)
      expect(problems).toEqual([])
    })
  }
}

// AC-2
for (const lang of LANGS) {
  test(`[E3.5][AC30] AC-2 /${lang}/stories shows its chrome in ${lang} with no raw message key`, async ({ page }) => {
    await page.goto(`/${lang}/stories`)
    await hydrated(page)

    await expect(page.locator('nav a[href$="/account"]').first()).toHaveText(lang === 'de' ? 'Konto' : 'Account')
    await expect(page.locator('nav a[href$="/gifts"]').first()).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    // Prototype bar excluded: it is not guest copy. innerText is the text a guest can see.
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- visible text only
    const visible = await page.locator('main, nav').evaluateAll(parts => parts.map(part => (part as HTMLElement).innerText).join('\n'))

    expect(visible).not.toMatch(RAW_KEY)
    // The other language's list heading is not on the page.
    await expect(page.getByRole('heading', { level: 1, name: HEADINGS[lang === 'en' ? 'de' : 'en']['/stories'] })).toHaveCount(0)
  })
}

test('[E3.5][AC30] AC-2 a stored de preference does not change /en/stories and is not overwritten', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sk.language', '"de"'))
  await page.goto('/en/stories')
  await hydrated(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Local stories' })).toBeVisible()
  await expect(page.locator('nav a[href$="/account"]').first()).toHaveText('Account')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await stored(page)).toBe('"de"')
})

// AC-3
for (const lang of LANGS) {
  test(`[E3.5][AC30] AC-3 the server HTML of /${lang}/stories has lang="${lang}"`, async ({ request }) => {
    const response = await request.get(`/${lang}/stories`)

    expect(response.status()).toBe(200)
    expect(htmlLang(await response.text())).toBe(lang)
  })
}

test('[E3.5][AC30] AC-3 /de/stories hydrates with no console error or React #418', async ({ page }) => {
  const problems = problemsOf(page)

  await page.goto('/de/stories')
  await hydrated(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Geschichten aus Luzern' })).toBeVisible()
  expect(problems).toEqual([])
})

test('[E3.5][AC30] AC-3 the language switch on /en/stories goes to /de/stories with lang de and a stored de', async ({ page }) => {
  await page.goto('/en/stories')
  await hydrated(page)
  await switchTo(page, 'de')

  await expect(page).toHaveURL(/\/de\/stories$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('heading', { level: 1, name: 'Geschichten aus Luzern' })).toBeVisible()
  expect(await stored(page)).toBe('"de"')
  expect(await page.evaluate(() => document.cookie)).toContain('sk_lang=de')
})

test('[E3.5][AC30] AC-3 the language switch keeps the query string', async ({ page }) => {
  await page.goto('/en/search?q=Pilatus')
  await hydrated(page)
  await switchTo(page, 'de')

  await expect(page).toHaveURL(/\/de\/search\?q=Pilatus$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

// AC-4
test('[E3.5][AC30] AC-4 with a stored de, /cart and /account stay unprefixed and are German', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sk.language', '"de"'))

  await page.goto('/cart')
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByText('Ihr Warenkorb ist leer.')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  await page.goto('/account')
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByText('Anmelden und Bestellungen sehen')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('[E3.5][AC30] AC-4 switching the language on /cart keeps the URL and stores en', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sk.language', '"de"'))
  await page.goto('/cart')
  await expect(page.getByText('Ihr Warenkorb ist leer.')).toBeVisible()
  await hydrated(page)
  await switchTo(page, 'en')

  await expect(page.getByText('Your cart is empty.')).toBeVisible()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await stored(page)).toBe('"en"')
})
