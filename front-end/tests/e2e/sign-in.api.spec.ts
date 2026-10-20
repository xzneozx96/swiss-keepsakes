import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { endSessions, expireCode, latestCode, newEmail, SPA_ORIGIN } from './api-server'

// [E2.1][AC01] The sign-in sheet C05 against the real API (Better Auth, its own database) on one origin.
// Only Google's side is stubbed. Run on WebKit and Chromium, EN and DE, at 375x812 (playwright.config.ts).
const words = {
  en: { signOut: 'Sign out', send: 'Email me a code', newCode: 'Send a new code', google: 'Continue with Google', wrong: 'That code isn’t right', expired: 'This code has expired', locked: 'Too many wrong codes', googleFailed: 'Google sign-in didn’t finish', prompt: 'Sign in to see your orders', twoLeft: '2 tries left', oneLeft: '1 try left' },
  de: { signOut: 'Abmelden', send: 'Code per E-Mail senden', newCode: 'Neuen Code senden', google: 'Weiter mit Google', wrong: 'Dieser Code stimmt nicht', expired: 'Dieser Code ist abgelaufen', locked: 'Zu viele falsche Codes', googleFailed: 'Die Anmeldung mit Google wurde nicht abgeschlossen', prompt: 'Anmelden und Bestellungen sehen', twoLeft: 'Noch 2 Versuche', oneLeft: 'Noch 1 Versuch' },
}

type Language = keyof typeof words

// The API rate-limits the code routes to 3 calls a minute per client address, which it reads from Fly-Client-IP
// (D8). Each test gets an address of its own, as separate guests would have.
async function newClientAddress(context: BrowserContext) {
  const octet = () => Math.floor(Math.random() * 250) + 1

  await context.setExtraHTTPHeaders({ 'fly-client-ip': `198.51.${octet()}.${octet()}` })
}

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  const language = testInfo.project.name.endsWith('-de') ? 'de' : 'en'

  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    language,
  )
})

function languageOf(testInfo: { project: { name: string } }): Language {
  return testInfo.project.name.endsWith('-de') ? 'de' : 'en'
}

async function requestCode(page: Page, language: Language, email: string, returnTo = '/account') {
  await page.goto(`/#/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  await page.getByRole('textbox', { name: /e-?mail/i }).fill(email)
  await page.getByRole('button', { name: words[language].send }).click()
  await expect(page.locator('#sign-in-code')).toBeVisible()
}

async function typeCode(page: Page, code: string) {
  await page.locator('#sign-in-code').pressSequentially(code)
}

async function signIn(page: Page, language: Language, email = newEmail()) {
  await requestCode(page, language, email)
  const { code } = await latestCode(email)

  await typeCode(page, code)
  await expect(page.getByRole('button', { name: words[language].signOut })).toBeVisible()

  return email
}

function wrongCodeFor(real: string) {
  return real === '000000' ? '111111' : '000000'
}

test('[E2.1][AC01] signs in with the emailed code, stays signed in across a reload, and no token reaches JavaScript', async ({ page, context }, testInfo) => {
  const language = languageOf(testInfo)
  const authorized: string[] = []

  page.on('request', (request) => {
    if (request.headers().authorization)
      authorized.push(request.url())
  })
  const email = await signIn(page, language)

  await expect(page).toHaveURL(/#\/account$/)
  await page.reload()
  await expect(page.getByRole('button', { name: words[language].signOut })).toBeVisible()

  const cookies = await context.cookies()
  const session = cookies.find(cookie => cookie.name.endsWith('session_token'))

  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe('Lax')
  const visible = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }))
  const token = decodeURIComponent(session?.value ?? '').split('.')[0] ?? ''

  expect(token.length).toBeGreaterThan(10)
  expect(visible.cookie).not.toContain('session_token')
  expect(visible.cookie).not.toContain(token)
  expect(visible.local).not.toContain(token)
  expect(visible.session).not.toContain(token)
  expect(authorized).toEqual([])
  expect(email).toContain('@example.ch')
})

test('[E2.1][AC01] a code requested in the SPA\'s language is the N01 in that language', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const email = newEmail()

  await requestCode(page, language, email)

  expect(await latestCode(email)).toMatchObject({ template: 'N01', language })
})

test('[E2.1][AC01] sign out ends the session, also across a reload', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)

  await signIn(page, language)
  await page.getByRole('button', { name: words[language].signOut }).click()
  await expect(page.getByText(words[language].prompt)).toBeVisible()

  await page.reload()
  await expect(page.getByText(words[language].prompt)).toBeVisible()
  const response = await page.request.get('/api/auth/get-session')

  expect(response.status()).toBe(200)
  expect(await response.json()).toBeNull()
})

test('[E2.1][AC01] a wrong code shows the tries left and the third wrong code locks it', async ({ page, context }, testInfo) => {
  const language = languageOf(testInfo)
  const t = words[language]
  const email = newEmail()

  await requestCode(page, language, email)
  const { code } = await latestCode(email)
  const wrong = wrongCodeFor(code)

  await typeCode(page, wrong)
  await expect(page.getByText(t.wrong)).toBeVisible()
  await expect(page.getByText(t.twoLeft)).toBeVisible()

  await page.locator('#sign-in-code').clear()
  await typeCode(page, wrong)
  await expect(page.getByText(t.oneLeft)).toBeVisible()

  await page.locator('#sign-in-code').clear()
  await typeCode(page, wrong)
  await expect(page.getByText(t.locked)).toBeVisible()
  await expect(page.getByRole('button', { name: t.newCode })).toBeVisible()

  await newClientAddress(context)
  await page.getByRole('button', { name: t.newCode }).click()
  await expect(page.getByText(t.locked)).toBeHidden()
  await typeCode(page, (await latestCode(email)).code)
  await expect(page.getByRole('button', { name: t.signOut })).toBeVisible()
})

test('[E2.1][AC01] an expired code asks for a new one', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const t = words[language]
  const email = newEmail()

  await requestCode(page, language, email)
  const { code } = await latestCode(email)

  // Better Auth purges expired codes on any lookup, so with other guests signing in the API may answer
  // "unknown" for this one. The SPA knows when it sent the code, so the page's clock moves 6 minutes on too.
  await expireCode(email)
  await page.clock.setFixedTime(Date.now() + 6 * 60_000)
  await typeCode(page, code)
  await expect(page.getByText(t.expired)).toBeVisible()
  await expect(page.locator('.field-error').getByText(/5 (minutes|Minuten)/)).toBeVisible()
  await page.getByRole('button', { name: t.newCode }).click()
  await expect(page.getByText(t.expired)).toBeHidden()
})

test('[E2.1][AC01] a failed Google return shows an error and cleans the address', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const t = words[language]
  let consent: URL | undefined

  // Google's side only: its consent page sends the browser back to our callback with an error.
  await page.route('https://accounts.google.com/**', async (route) => {
    consent = new URL(route.request().url())
    const callback = new URL(consent.searchParams.get('redirect_uri') ?? '')

    callback.searchParams.set('error', 'access_denied')
    callback.searchParams.set('state', consent.searchParams.get('state') ?? '')
    // WebKit refuses a fulfilled redirect status, so a page that moves the browser on stands in for the 302.
    await route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(callback.toString())})</script>`,
    })
  })
  await page.goto('/#/sign-in')
  await page.getByRole('button', { name: t.google }).click()

  await expect(page.getByText(t.googleFailed)).toBeVisible()
  expect(consent?.searchParams.get('redirect_uri')).toBe(`${SPA_ORIGIN}/api/auth/callback/google`)
  expect(consent?.searchParams.get('client_id')).toContain('e2e-google-client-id')
  await expect(page).toHaveURL(`${SPA_ORIGIN}/#/sign-in`)
  await expect(page.getByRole('button', { name: t.google })).toBeEnabled()
})

test('[E2.1][AC01] the Google button is not stuck pending when Back restores the page from the cache', async ({ page }, testInfo) => {
  const t = words[languageOf(testInfo)]

  await page.goto('/#/sign-in')
  await page.route('https://accounts.google.com/**', route => route.abort())
  await page.getByRole('button', { name: t.google }).click()
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))

  await expect(page.getByRole('button', { name: t.google })).toBeEnabled()
})

test('[E2.1][AC01] a sign-out in another tab and a revoked session clear the signed-in state', async ({ page, context }, testInfo) => {
  const language = languageOf(testInfo)
  const t = words[language]
  const email = await signIn(page, language)
  const other = await context.newPage()

  await other.goto('/#/account')
  await expect(other.getByRole('button', { name: t.signOut })).toBeVisible()

  await page.getByRole('button', { name: t.signOut }).click()
  await expect(other.getByText(t.prompt)).toBeVisible()

  await newClientAddress(context)
  await signIn(other, language, email)
  await endSessions(email)
  await other.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(other.getByText(t.prompt)).toBeVisible()
})
