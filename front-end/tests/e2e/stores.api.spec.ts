import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { latestCode, newEmail } from './api-server'

// [E2.3][S8] The invitation screens against the real API (Better Auth, its own database) on one origin, at 375x812,
// on WebKit and Chromium, EN and DE. The harness has no Super Admin and no way to read the N20 link, so a real
// invitation cannot be created here: see the questions in the pull request. What this drives is everything a
// visitor can reach without one: the token leaving the address, the sign-in round trip, the real refusals, and the
// guard of A01.
const words = {
  en: { send: 'Email me a code', signOut: 'Sign out', unknownTitle: 'This invitation link is not valid', missingTitle: 'Open the link from your email', notFound: /This page does not exist/ },
  de: { send: 'Code per E-Mail senden', signOut: 'Abmelden', unknownTitle: 'Dieser Einladungslink ist nicht gültig', missingTitle: 'Öffnen Sie den Link aus Ihrer E-Mail', notFound: /Diese Seite gibt es nicht/ },
}

type Language = keyof typeof words

const token = 'e2e-invitation-token-abcdefghijklmnopqrstuvwxyz0123456789'

async function newClientAddress(context: BrowserContext) {
  const octet = () => Math.floor(Math.random() * 250) + 1

  await context.setExtraHTTPHeaders({ 'fly-client-ip': `198.51.${octet()}.${octet()}` })
}

function languageOf(testInfo: { project: { name: string } }): Language {
  return testInfo.project.name.endsWith('-de') ? 'de' : 'en'
}

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

async function signInFromSheet(page: Page, language: Language, email: string) {
  await page.getByRole('textbox', { name: /e-?mail/i }).fill(email)
  await page.getByRole('button', { name: words[language].send }).click()
  await expect(page.locator('#sign-in-code')).toBeVisible()
  await page.locator('#sign-in-code').pressSequentially((await latestCode(email)).code)
}

test('[E2.3][S8] the token leaves the address before sign-in, the sign-in return never carries it, and a refused token shows its own state', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const t = words[language]
  const addresses: string[] = []

  page.on('framenavigated', frame => addresses.push(frame.url()))
  await page.goto(`/#/store/onboarding?invitation=${token}`)

  await expect(page).toHaveURL(/#\/sign-in\?returnTo=%2Fstore%2Fonboarding$/)
  // The first address is the link as the mail holds it. Every address after it is the app's own, token-free.
  expect(addresses[0]).toContain(token)
  expect(addresses.slice(1).join('\n')).not.toContain(token)
  expect(await page.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBe(token)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(token)

  await signInFromSheet(page, language, newEmail())

  await expect(page).toHaveURL(/#\/store\/onboarding$/)
  await expect(page.getByRole('heading', { name: t.unknownTitle })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()
  expect(page.url()).not.toContain(token)
  await expect(page.getByRole('button', { name: t.signOut })).toHaveCount(0)
})

test('[E2.3][S8] A02 without a link or a store says to open the email link, and asks the API nothing', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const calls: string[] = []

  page.on('request', request => calls.push(new URL(request.url()).pathname))
  await page.goto('/#/store/onboarding')

  await expect(page.getByRole('heading', { name: words[language].missingTitle })).toBeVisible()
  expect(calls.filter(path => path.startsWith('/api/store') || path.startsWith('/api/me/invitations'))).toEqual([])
})

test('[E2.3][S8] A01 sends a visitor who has not signed in to sign-in, and shows not found to a signed-in user who is not the Super Admin', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)

  await page.goto('/#/admin')
  await expect(page).toHaveURL(/#\/sign-in\?returnTo=%2Fadmin$/)

  await signInFromSheet(page, language, newEmail())

  await expect(page).toHaveURL(/#\/admin$/)
  await expect(page.getByText(words[language].notFound)).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
})
