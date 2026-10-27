import type { Browser, BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { storesEn } from '../../src/features/stores/messages'
import { storesDe } from '../../src/features/stores/messages.de'
import { grantSuperAdmin, latestCode, newEmail, newStoreName, SPA_ORIGIN } from './api-server'

// What the real-API specs of the invitation screens share (stores.api.spec.ts, members.api.spec.ts): the screens'
// own copy in both languages, a separate browser per person, the sign-in sheet, and the Super Admin who creates a store.
const EMAIL_FIELD = /e-?mail/i
const REGEXP_MARKS = /[.*+?^${}()|[\]\\]/g
const ADMIN_SIGN_IN = /^https?:\/\/[^/#]+\/sign-in\?returnTo=%2Fadmin$/
const ADMIN_SCREEN = /^https?:\/\/[^/#]+\/admin$/

export const words = {
  en: { send: 'Email me a code', signOut: 'Sign out', unknownTitle: 'This invitation link is not valid', missingTitle: 'Open the link from your email', notFound: /This page does not exist/ },
  de: { send: 'Code per E-Mail senden', signOut: 'Abmelden', unknownTitle: 'Dieser Einladungslink ist nicht gültig', missingTitle: 'Öffnen Sie den Link aus Ihrer E-Mail', notFound: /Diese Seite gibt es nicht/ },
}

export type Language = keyof typeof words

export async function newClientAddress(context: BrowserContext) {
  const octet = () => Math.floor(Math.random() * 250) + 1

  await context.setExtraHTTPHeaders({ 'fly-client-ip': `198.51.${octet()}.${octet()}` })
}

export function languageOf(testInfo: { project: { name: string } }): Language {
  return testInfo.project.name.endsWith('-de') ? 'de' : 'en'
}

export async function signInFromSheet(page: Page, language: Language, email: string) {
  await page.getByRole('textbox', { name: EMAIL_FIELD }).fill(email)
  await page.getByRole('button', { name: words[language].send }).click()
  await expect(page.locator('#sign-in-code')).toBeVisible()
  await page.locator('#sign-in-code').pressSequentially((await latestCode(email)).code)
}

export type MessageKey = keyof typeof storesEn

const copy = { en: storesEn, de: storesDe }

/** The screen's own copy, so the spec follows a wording change instead of breaking on it. `{param}`s are filled in. */
export function say(language: Language, key: MessageKey, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[language][key])
}

/** The part of a message before its first parameter, for text that holds a date or a list. */
export function sayStart(language: Language, key: MessageKey, params: Record<string, string> = {}): RegExp {
  const filled = say(language, key, params)

  const end = filled.indexOf('{')

  return new RegExp(filled.slice(0, end === -1 ? undefined : end).replace(REGEXP_MARKS, String.raw`\$&`))
}

const visitors: BrowserContext[] = []

/** Closes every browser `newVisitor` opened. Each spec calls it after each test. */
export async function closeVisitors() {
  await Promise.all(visitors.splice(0).map(context => context.close()))
}

/** A browser of its own, at 375x812, with its own client address: a separate person on a separate phone. */
export async function newVisitor(browser: Browser, language: Language): Promise<Page> {
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

/**
 * Opens an invitation link. The screen shows the store from the preview first, and the sign-in button takes the
 * visitor to sign-in. It signs in with this email and waits for the screen to come back to `screen`, the
 * address of the link without its token (A02 or M01).
 */
export async function followLinkAs(page: Page, language: Language, link: string, email: string, screen: '/store/onboarding' | '/invitation' = '/store/onboarding') {
  await page.goto(link)
  await page.getByRole('button', { name: say(language, 'stores.invite.signIn') }).click()
  await expect(page).toHaveURL(new RegExp(`^https?://[^/#]+/sign-in\\?returnTo=${encodeURIComponent(screen)}$`))
  await signInFromSheet(page, language, email)
  await expect(page).toHaveURL(new RegExp(`^https?://[^/#]+${screen}$`))
}

/** The token of a mailed link: the link keeps it in the fragment (`<screen>#invitation=<token>`), never in the path or the query. */
export function tokenOf(link: string): string {
  return new URLSearchParams(new URL(link).hash.slice(1)).get('invitation') ?? ''
}

/**
 * Records every request of `page` (its address without the fragment, and its `referer`) so a test can assert that
 * none carried `token`. The preview and accept POST bodies carry the token by design (backend.md section 8:
 * a body is not logged and not sent as a referrer), so only addresses and headers are checked, never bodies.
 */
export function watchForToken(page: Page, token: string) {
  const seen: Array<Promise<string>> = []

  page.on('request', (request) => {
    // The fragment is never sent to a server, and the browser strips it from `referer`; `url()` may still show it.
    seen.push(request.allHeaders().then(headers => `${request.url().split('#')[0]}\n${headers.referer ?? ''}`, () => ''))
  })

  return async () => {
    const lines = await Promise.all(seen)

    expect(lines.length).toBeGreaterThan(0)
    expect(lines.filter(line => line.includes(token))).toEqual([])
  }
}

export async function signedInSuperAdmin(browser: Browser, language: Language) {
  const page = await newVisitor(browser, language)
  const email = newEmail()

  await page.goto('/admin')
  await expect(page).toHaveURL(ADMIN_SIGN_IN)
  await signInFromSheet(page, language, email)
  await expect(page).toHaveURL(ADMIN_SCREEN)
  await expect(page.getByText(words[language].notFound)).toBeVisible()
  await grantSuperAdmin(email)
  await page.reload()
  await expect(page.getByRole('heading', { name: say(language, 'stores.admin.title'), level: 1 })).toBeVisible()

  return page
}

export async function createStore(page: Page, language: Language, ownerEmail: string) {
  const { name, slug } = newStoreName()

  await page.getByRole('button', { name: say(language, 'stores.create.open') }).first().click()

  const sheet = page.getByRole('dialog', { name: say(language, 'stores.create.title') })

  await sheet.getByRole('textbox', { name: say(language, 'stores.create.name') }).fill(name)
  await expect(sheet.getByText(say(language, 'stores.create.slug', { slug }))).toBeVisible()
  await sheet.getByRole('textbox', { name: say(language, 'stores.create.email') }).fill(ownerEmail)
  await sheet.getByRole('button', { name: say(language, 'stores.create.submit') }).click()
  await expect(sheet).toHaveCount(0)

  const card = page.locator(`[data-store="${slug}"]`)

  await expect(card).toBeVisible()
  await expect(card.locator('[data-invitation]')).toHaveAttribute('data-invitation', 'open')
  await expect(card.getByText(sayStart(language, 'stores.invitation.open', { email: ownerEmail }))).toBeVisible()

  return { name, slug, card }
}
