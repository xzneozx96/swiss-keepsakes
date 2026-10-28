import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.11 / AC64: a story address in a language the story has no version in.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

test.describe('[E3.11][AC64] story with no version in the URL language', () => {
  test('redirects the German address of an English-only story to the English one', async ({ request }) => {
    const response = await request.get('/de/stories/a-quiet-morning-on-the-reuss', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/en/stories/a-quiet-morning-on-the-reuss')
  })

  test('redirects the English address of a German-only story to the German one', async ({ request }) => {
    const response = await request.get('/en/stories/ein-ruhiger-morgen-an-der-reuss', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/de/stories/ein-ruhiger-morgen-an-der-reuss')
  })

  test('redirects the demo story water-tower the same way', async ({ request }) => {
    const response = await request.get('/de/stories/water-tower', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/en/stories/water-tower')
  })

  test('redirects the German-only demo story luzern-bei-nacht to its German address', async ({ request }) => {
    const response = await request.get('/en/stories/luzern-bei-nacht', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/de/stories/luzern-bei-nacht')
  })

  test('keeps the query string in the redirect', async ({ request }) => {
    const response = await request.get('/de/stories/a-quiet-morning-on-the-reuss?utm_source=x', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/en/stories/a-quiet-morning-on-the-reuss?utm_source=x')
  })

  test('answers 404 for a story with no version in either language', async ({ request }) => {
    const response = await request.get('/de/stories/nope', { maxRedirects: 0 })

    expect(response.status()).toBe(404)
  })
})

const FIXTURE = 'a-quiet-morning-on-the-reuss'
const SHARED = 'musegg-morning'
const NOTICE_EN = 'This page is only available in English.'
const BROKEN_TEXT = /\{\w+\}|undefined/

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

// The new round button, by its own name. Not the prototype bar's group, which is also named "Language".
function control(page: Page, name: 'Language' | 'Sprache' = 'Language') {
  return page.getByRole('button', { name, exact: true })
}

async function choose(page: Page, current: 'Language' | 'Sprache', option: 'English' | 'Deutsch') {
  await control(page, current).click()
  const sheet = page.getByRole('dialog')

  await expect(sheet).toBeVisible()
  await sheet.getByRole('radio', { name: option }).click()
  await expect(sheet).toHaveCount(0)
}

const stored = (page: Page) => page.evaluate(() => localStorage.getItem('sk.language'))

function seedLanguage(page: Page, language: 'en' | 'de') {
  return page.addInitScript(value => localStorage.setItem('sk.language', JSON.stringify(value)), language)
}

test.describe('[E3.11][AC64] notice', () => {
  test('stored de, hard load of the English-only story: English page with the notice, no console noise', async ({ page }) => {
    const problems = problemsOf(page)

    await seedLanguage(page, 'de')
    await page.goto(`/en/stories/${FIXTURE}`)
    await hydrated(page)

    await expect(page.getByRole('heading', { level: 1, name: 'A quiet morning on the Reuss' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(NOTICE_EN)
    await expect(page.locator('body')).not.toContainText(BROKEN_TEXT)
    expect(problems).toEqual([])
  })

  test('stored en: no notice on the English-only story', async ({ page }) => {
    await seedLanguage(page, 'en')
    await page.goto(`/en/stories/${FIXTURE}`)
    await hydrated(page)

    await expect(page.getByRole('heading', { level: 1, name: 'A quiet morning on the Reuss' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('a story with both versions opened at /en with stored de: no notice', async ({ page }) => {
    await seedLanguage(page, 'de')
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)

    await expect(control(page)).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})

test.describe('[E3.11][AC64] German-only notice', () => {
  const DE_ONLY = 'ein-ruhiger-morgen-an-der-reuss'
  const NOTICE_DE = 'Diese Seite gibt es nur auf Deutsch.'

  test('the server HTML has no notice, so a German guest never sees it flash', async ({ request }) => {
    const response = await request.get(`/de/stories/${DE_ONLY}`)

    expect(response.status()).toBe(200)
    expect(await response.text()).not.toContain(NOTICE_DE)
  })

  test('stored en: the notice shows in German after hydration', async ({ page }) => {
    await seedLanguage(page, 'en')
    await page.goto(`/de/stories/${DE_ONLY}`)
    await hydrated(page)

    await expect(page.getByRole('status')).toHaveText(NOTICE_DE)
  })

  test('nothing stored: no notice', async ({ page }) => {
    await page.goto(`/de/stories/${DE_ONLY}`)
    await hydrated(page)

    await expect(control(page, 'Sprache')).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})

test.describe('[E3.11][AC64] switch', () => {
  test('choosing DE on the English-only story stays at the English address with the notice and stores de', async ({ page }) => {
    await page.goto(`/en/stories/${FIXTURE}`)
    await hydrated(page)
    await choose(page, 'Language', 'Deutsch')

    await expect(page.getByRole('status')).toHaveText(NOTICE_EN)
    await expect(page).toHaveURL(new RegExp(`/en/stories/${FIXTURE}$`))
    expect(await stored(page)).toBe('"de"')
  })

  test('the control shows on the tab-bar-hidden story page and on /en/tours', async ({ page }) => {
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)
    await expect(control(page)).toBeVisible()
    await page.goto('/en/tours')
    await hydrated(page)
    await expect(control(page)).toBeVisible()
  })
})

test.describe('[E3.11][AC30] switch', () => {
  test('EN to DE and back keeps the page, stores the choice and leaves /cart and /account unprefixed', async ({ page }) => {
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)
    await choose(page, 'Language', 'Deutsch')

    await expect(page).toHaveURL(new RegExp(`/de/stories/${SHARED}$`))
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(control(page)).toHaveCount(0)
    await expect(control(page, 'Sprache')).toBeVisible()
    expect(await stored(page)).toBe('"de"')
    expect(await page.evaluate(() => document.cookie)).toContain('sk_lang=de')
    await expect(page.getByRole('status')).toHaveCount(0)

    await expect(page.getByRole('heading', { level: 1, name: 'Ein Morgen auf der Museggmauer' })).toBeVisible()

    await page.goto('/cart')
    expect(new URL(page.url()).pathname).toBe('/cart')
    await expect(page.getByText('Ihr Warenkorb ist leer.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Sprache|Language)$/ })).toHaveCount(0)
    await page.goto('/account')
    expect(new URL(page.url()).pathname).toBe('/account')
    await expect(page.getByText(/Entdecken|Andenken|Konto/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Sprache|Language)$/ })).toHaveCount(0)

    await page.goto(`/de/stories/${SHARED}`)
    await hydrated(page)
    await choose(page, 'Sprache', 'English')
    await expect(page).toHaveURL(new RegExp(`/en/stories/${SHARED}$`))
    expect(await stored(page)).toBe('"en"')
    await page.goto('/cart')
    expect(new URL(page.url()).pathname).toBe('/cart')
    await expect(page.getByText('Your cart is empty.')).toBeVisible()
  })
})

test.describe('[E3.11][AC30] language sheet', () => {
  test('opens with the current language checked and closes on Escape with focus back on the button', async ({ page }) => {
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)
    const button = control(page)

    await button.click()
    const sheet = page.getByRole('dialog')

    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('radio', { name: 'English' })).toBeChecked()
    await expect(sheet.getByRole('radio', { name: 'Deutsch' })).not.toBeChecked()
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(button).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`/en/stories/${SHARED}$`))
  })

  test('in German the button and the sheet are German and the German option is checked', async ({ page }) => {
    await page.goto(`/de/stories/${SHARED}`)
    await hydrated(page)
    await control(page, 'Sprache').click()
    const sheet = page.getByRole('dialog', { name: 'Sprache' })

    await expect(sheet.getByRole('radio', { name: 'Deutsch' })).toBeChecked()
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(control(page, 'Sprache')).toBeFocused()
  })

  test('arrow keys move focus between the language rows without choosing', async ({ page }) => {
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)
    await control(page).click()
    const sheet = page.getByRole('dialog')
    const english = sheet.getByRole('radio', { name: 'English' })
    const german = sheet.getByRole('radio', { name: 'Deutsch' })

    await english.focus()
    await page.keyboard.press('ArrowDown')
    await expect(german).toBeFocused()
    await expect(english).toBeChecked()
    await page.keyboard.press('ArrowUp')
    await expect(english).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`/en/stories/${SHARED}$`))
  })

  test('tapping the checked language only closes the sheet', async ({ page }) => {
    await page.goto(`/en/stories/${SHARED}`)
    await hydrated(page)
    await choose(page, 'Language', 'English')

    await expect(page).toHaveURL(new RegExp(`/en/stories/${SHARED}$`))
  })
})
