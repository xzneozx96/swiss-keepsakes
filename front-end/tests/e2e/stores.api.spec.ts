import type { Browser, BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { storesEn } from '../../src/features/stores/messages'
import { storesDe } from '../../src/features/stores/messages.de'
import { grantSuperAdmin, latestCode, newEmail, newStoreName, ownerInvitationMail, SPA_ORIGIN } from './api-server'

// [E2.3][S8] The invitation screens against the real API (Better Auth, its own database) on one origin, at 375x812,
// on WebKit and Chromium, EN and DE. The first specs drive what a visitor can reach with no invitation: the token
// leaving the address, the sign-in round trip, the real refusals, and the guard of A01. The last two drive the whole
// path with a real Super Admin and a real N20 link: the test server grants the Super Admin through the use case
// behind `admin:grant` and returns the link that the real mail attempt builds (api/test/support/e2e-server.ts).
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

type MessageKey = keyof typeof storesEn

const copy = { en: storesEn, de: storesDe }

/** The screen's own copy, so the spec follows a wording change instead of breaking on it. `{param}`s are filled in. */
function say(language: Language, key: MessageKey, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[language][key])
}

/** The part of a message before its first parameter, for text that holds a date or a list. */
function sayStart(language: Language, key: MessageKey, params: Record<string, string> = {}): RegExp {
  const filled = say(language, key, params)

  const end = filled.indexOf('{')

  return new RegExp(filled.slice(0, end === -1 ? undefined : end).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
}

const visitors: BrowserContext[] = []

test.afterEach(async () => {
  await Promise.all(visitors.splice(0).map(context => context.close()))
})

/** A browser of its own, at 375x812, with its own client address: a separate person on a separate phone. */
async function newVisitor(browser: Browser, language: Language): Promise<Page> {
  const context = await browser.newContext({
    baseURL: SPA_ORIGIN,
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    locale: language === 'de' ? 'de-CH' : 'en-CH',
  })

  visitors.push(context)
  await newClientAddress(context)
  await context.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    language,
  )

  return context.newPage()
}

/** Opens the owner link, signs in with this email on the sign-in screen it lands on, and waits for the screen to come back. */
async function followLinkAs(page: Page, language: Language, link: string, email: string) {
  await page.goto(link)
  await expect(page).toHaveURL(/#\/sign-in\?returnTo=%2Fstore%2Fonboarding$/)
  await signInFromSheet(page, language, email)
  await expect(page).toHaveURL(/#\/store\/onboarding$/)
}

async function signedInSuperAdmin(browser: Browser, language: Language) {
  const page = await newVisitor(browser, language)
  const email = newEmail()

  await page.goto('/#/admin')
  await expect(page).toHaveURL(/#\/sign-in\?returnTo=%2Fadmin$/)
  await signInFromSheet(page, language, email)
  await expect(page).toHaveURL(/#\/admin$/)
  await expect(page.getByText(words[language].notFound)).toBeVisible()
  await grantSuperAdmin(email)
  await page.reload()
  await expect(page.getByRole('heading', { name: say(language, 'stores.create.title') })).toBeVisible()

  return page
}

async function createStore(page: Page, language: Language, ownerEmail: string) {
  const { name, slug } = newStoreName()

  await page.getByRole('textbox', { name: say(language, 'stores.create.name') }).fill(name)
  await expect(page.getByText(say(language, 'stores.create.slug', { slug }))).toBeVisible()
  await page.getByRole('textbox', { name: say(language, 'stores.create.email') }).fill(ownerEmail)
  await page.getByRole('button', { name: say(language, 'stores.create.submit') }).click()

  const card = page.locator(`[data-store="${slug}"]`)

  await expect(card).toBeVisible()
  await expect(card.locator('[data-invitation]')).toHaveAttribute('data-invitation', 'open')
  await expect(card.getByText(sayStart(language, 'stores.invitation.open', { email: ownerEmail }))).toBeVisible()

  return { name, slug, card }
}

test('[E2.3][S8] the Super Admin creates the store, the Owner follows the N20 link and accepts, another email and a second accept are refused, and open for sale is refused with the checklist', async ({ browser }, testInfo) => {
  testInfo.setTimeout(120_000)
  const language = languageOf(testInfo)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)
  const { name, card } = await createStore(admin, language, ownerEmail)

  // The real mail attempt built this link: the N20 template in the store's language, at the SPA's origin.
  const mail = await ownerInvitationMail(ownerEmail)

  expect(mail.to).toBe(ownerEmail)
  expect(mail.subject).toContain(name)
  expect(mail.link.startsWith(`${SPA_ORIGIN}/#/store/onboarding?invitation=`)).toBe(true)
  const token = new URL(mail.link.replace('/#/', '/')).searchParams.get('invitation') ?? ''

  expect(token.length).toBeGreaterThan(16)
  expect(mail.text).toContain(mail.link)

  // A Super Admin who follows the Owner's link gets a refusal with the sign-out alone, and the invitation stays open.
  await admin.goto(mail.link)
  await expect(admin).toHaveURL(/#\/store\/onboarding$/)
  await expect(admin.getByRole('heading', { name: say(language, 'stores.refusal.superAdmin.title') })).toBeVisible()
  await expect(admin.getByText(say(language, 'stores.refusal.superAdmin.text'))).toBeVisible()
  await expect(admin.getByRole('button', { name: say(language, 'stores.onboarding.signOutOnly'), exact: true })).toBeVisible()
  await expect(admin.getByRole('button', { name: say(language, 'stores.onboarding.signOut') })).toHaveCount(0)
  await admin.goto('/#/admin')
  await expect(card.locator('[data-invitation]')).toHaveAttribute('data-invitation', 'open')

  // Another email is refused, and the invitation stays open for the right one.
  const other = await newVisitor(browser, language)

  await followLinkAs(other, language, mail.link, newEmail())
  await expect(other.getByRole('heading', { name: say(language, 'stores.refusal.mismatch.title') })).toBeVisible()
  await expect(other.getByRole('button', { name: say(language, 'stores.onboarding.signOut') })).toBeVisible()
  expect(await other.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBe(token)
  await admin.reload()
  await expect(card.locator('[data-invitation]')).toHaveAttribute('data-invitation', 'open')

  // The Owner follows the link, signs in with the invited email and accepts.
  const owner = await newVisitor(browser, language)
  const keys: Array<string | undefined> = []

  owner.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/me/invitations/accept')
      keys.push(request.headers()['idempotency-key'])
  })
  await followLinkAs(owner, language, mail.link, ownerEmail)
  await expect(owner.getByText(say(language, 'stores.checklist.title'))).toBeVisible()
  await expect(owner.getByText(say(language, 'stores.checklist.count', { met: '1', total: '4' }))).toBeVisible()
  await expect(owner.locator('[data-condition="store-information"]')).toHaveAttribute('data-state', 'met')
  await expect(owner.locator('[data-condition="payment-account"]')).not.toHaveAttribute('data-state', 'met')
  await expect(owner.getByRole('button', { name: say(language, 'stores.open.action') })).toBeDisabled()
  expect(owner.url()).not.toContain(token)
  expect(await owner.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()
  // The first accept met no session (401) and the second one, after sign-in, took the invitation. Each has its own key, because a 401 is a final answer.
  expect(keys).toHaveLength(2)
  expect(new Set(keys).size).toBe(2)
  expect(keys.every(key => (key?.length ?? 0) > 10)).toBe(true)

  // A second accept of the same link is refused, even by the Owner on another phone.
  const phone = await newVisitor(browser, language)

  await followLinkAs(phone, language, mail.link, ownerEmail)
  await expect(phone.getByRole('heading', { name: say(language, 'stores.refusal.accepted.title') })).toBeVisible()
  expect(await phone.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()

  // Open for sale is refused by the API with the checklist. The screen is made to think the store may open, as a
  // screen that is out of date would, and the real 409 answers.
  await owner.route('**/api/store/*/onboarding', async (route) => {
    const response = await route.fetch()

    await route.fulfill({ response, json: { ...(await response.json()), mayOpenForSale: true } })
  })
  await owner.reload()
  await owner.getByRole('button', { name: say(language, 'stores.open.action') }).click()

  const alert = owner.getByRole('alert')

  await expect(alert).toContainText(sayStart(language, 'stores.open.incomplete'))
  await expect(alert).toContainText(say(language, 'stores.checklist.payment-account'))
  await expect(alert).toContainText(say(language, 'stores.checklist.catalogue'))
  await expect(alert).toContainText(say(language, 'stores.checklist.policies'))
  await expect(owner.getByText(say(language, 'stores.open.live'))).toHaveCount(0)
  await admin.reload()
  await expect(card.getByText(say(language, 'stores.status.onboarding'), { exact: true })).toBeVisible()
  await expect(card.locator('[data-invitation]')).toHaveAttribute('data-invitation', 'accepted')
})

test('[E2.3][S8] after the Super Admin sends the invitation again, the old link says the invitation is not found and the new one works', async ({ browser }, testInfo) => {
  testInfo.setTimeout(120_000)
  const language = languageOf(testInfo)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)
  const { card } = await createStore(admin, language, ownerEmail)
  const first = await ownerInvitationMail(ownerEmail)

  await card.getByRole('button', { name: say(language, 'stores.resend.action') }).click()
  await expect(admin.getByText(say(language, 'stores.resend.done', { email: ownerEmail }))).toBeVisible()
  const second = await ownerInvitationMail(ownerEmail)

  expect(second.link).not.toBe(first.link)

  const stale = await newVisitor(browser, language)

  await followLinkAs(stale, language, first.link, ownerEmail)
  await expect(stale.getByRole('heading', { name: say(language, 'stores.refusal.notFound.title') })).toBeVisible()
  expect(await stale.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()

  const fresh = await newVisitor(browser, language)

  await followLinkAs(fresh, language, second.link, ownerEmail)
  await expect(fresh.getByText(say(language, 'stores.checklist.title'))).toBeVisible()
})

test('[E2.3][S8] a link opened in a tab that already shows A02 leaves the address and is taken up and leaves the address', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const addresses: string[] = []

  await page.goto('/#/store/onboarding')
  await expect(page.getByRole('heading', { name: say(language, 'stores.refusal.missing.title') })).toBeVisible()
  page.on('framenavigated', frame => addresses.push(frame.url()))
  await page.evaluate((value: string) => {
    window.location.hash = `#/store/onboarding?invitation=${value}`
  }, token)

  await expect(page).toHaveURL(/#\/sign-in\?returnTo=%2Fstore%2Fonboarding$/)
  expect(await page.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBe(token)
  expect(page.url()).not.toContain(token)
  expect(addresses.at(-1)).not.toContain(token)
})
