import { expect, test } from '@playwright/test'
import { newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { clickInMiddle, closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, openLink, say, sayStart, signedInSuperAdmin, signInFromSheet, tokenOf, words } from './invitation-flows'

// [E2.3][S8] The invitation screens against the real API (Better Auth, its own database) on one origin, at 375x812,
// on Chromium in English (playwright.config.ts). The first specs drive what a visitor can reach with no invitation: the token
// leaving the address, the sign-in round trip, the real refusals, and the guard of A01. The last two drive the whole
// path with a real Super Admin and a real N20 link: the test server grants the Super Admin through the use case
// behind `admin:grant` and returns the link that the real mail attempt builds (api/test/support/e2e-server.ts).
const token = 'e2e-invitation-token-abcdefghijklmnopqrstuvwxyz0123456789'

test.afterEach(closeVisitors)

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

test('[E2.3][S8] the token leaves the address before anything else, and a link the API does not know shows its own state before sign-in', async ({ page }, testInfo) => {
  const t = words[languageOf(testInfo)]
  const addresses: string[] = []

  page.on('framenavigated', frame => addresses.push(frame.url()))
  await page.goto(`/store/onboarding#invitation=${token}`)

  await expect(page.getByRole('heading', { name: t.unknownTitle })).toBeVisible()
  // The first address is the link as the mail holds it. Every address after it is the app's own, token-free.
  expect(addresses[0]).toContain(token)
  expect(addresses.slice(1).join('\n')).not.toContain(token)
  expect(page.url()).not.toContain(token)
  // The preview refused the link for good, so the token is gone from the tab and from the query keys.
  expect(await page.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(token)
  await expect(page.getByRole('button', { name: t.signOut })).toHaveCount(0)
})

test('[E2.3][S8] A02 without a link sends a visitor who has not signed in to sign-in and back, and asks the API for no store and no invitation', async ({ page }) => {
  const calls: string[] = []

  page.on('request', request => calls.push(new URL(request.url()).pathname))
  await page.goto('/store/onboarding')

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/sign-in\?returnTo=%2Fstore%2Fonboarding$/)
  expect(calls.filter(path => path.startsWith('/api/store') || path.startsWith('/api/me/invitations'))).toEqual([])
})

test('[E2.3][S8] A01 sends a visitor who has not signed in to sign-in, and shows not found to a signed-in user who is not the Super Admin', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)

  await page.goto('/admin')
  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/sign-in\?returnTo=%2Fadmin$/)

  await signInFromSheet(page, language, newEmail())

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/admin$/)
  await expect(page.getByText(words[language].notFound)).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
})

test('[E2.3][S8][E3.4][AC02] the Super Admin creates the store, the Owner follows the N20 link and accepts, another email is refused, a second accept by the Owner answers as the first did, and open for sale is refused with the checklist', async ({ browser }, testInfo) => {
  // About 110 steps, each API call taking 2 to 6 s against the remote Neon branch. Passing runs took 1.8 to 2.2 min
  // (alone and with four workers on one dev server); 180 s leaves room, and a stalled step fails at its own bounded wait.
  testInfo.setTimeout(180_000)
  const language = languageOf(testInfo)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)
  const { name, card } = await createStore(admin, language, ownerEmail)

  // The real mail attempt built this link: the N20 template in the store's language, at the SPA's origin.
  const mail = await ownerInvitationMail(ownerEmail)

  expect(mail.to).toBe(ownerEmail)
  expect(mail.subject).toContain(name)
  expect(mail.link.startsWith(`${SPA_ORIGIN}/store/onboarding#invitation=`)).toBe(true)
  const token = tokenOf(mail.link)

  expect(token.length).toBeGreaterThan(16)
  expect(mail.text).toContain(mail.link)

  // A Super Admin who follows the Owner's link gets a refusal with the sign-out alone, and the invitation stays open.
  await openLink(admin, mail.link)
  await expect(admin).toHaveURL(/^https?:\/\/[^/#]+\/store\/onboarding$/)
  await expect(admin.getByRole('heading', { name: say(language, 'stores.refusal.superAdmin.title') })).toBeVisible()
  await expect(admin.getByText(say(language, 'stores.refusal.superAdmin.text'))).toBeVisible()
  await expect(admin.getByRole('button', { name: say(language, 'stores.onboarding.signOutOnly'), exact: true })).toBeVisible()
  await expect(admin.getByRole('button', { name: say(language, 'stores.onboarding.signOut') })).toHaveCount(0)
  await admin.goto('/admin')
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
  // The screen read the session first and sent no accept before sign-in, so the one accept after sign-in took the invitation.
  expect(keys).toHaveLength(1)
  expect(keys.every(key => (key?.length ?? 0) > 10)).toBe(true)
  // No request address and no referer of any person held the token (the fragment stays in the browser): followLinkAs and openLink watch, and the afterEach checks.

  // A second accept of the same link by the same Owner, on another phone, answers as the first did (E2.4, so a lost answer cannot strand the Owner).
  const phone = await newVisitor(browser, language)

  await followLinkAs(phone, language, mail.link, ownerEmail)
  await expect(phone.getByText(say(language, 'stores.checklist.title'))).toBeVisible()
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
  const { name, card } = await createStore(admin, language, ownerEmail)
  const first = await ownerInvitationMail(ownerEmail)

  await clickInMiddle(card.getByRole('button', { name: say(language, 'stores.actions.label', { name }) }))
  await admin.getByRole('menuitem', { name: say(language, 'stores.resend.action') }).click()
  await expect(admin.getByText(say(language, 'stores.resend.done', { email: ownerEmail }))).toBeVisible()
  const second = await ownerInvitationMail(ownerEmail)

  expect(second.link).not.toBe(first.link)

  const stale = await newVisitor(browser, language)

  await openLink(stale, first.link)
  await expect(stale.getByRole('heading', { name: say(language, 'stores.refusal.notFound.title') })).toBeVisible()
  // A link that can never work again offers no sign-in.
  await expect(stale.getByRole('button', { name: words[language].send })).toHaveCount(0)

  const fresh = await newVisitor(browser, language)

  await followLinkAs(fresh, language, second.link, ownerEmail)
  await expect(fresh.getByText(say(language, 'stores.checklist.title'))).toBeVisible()
})

test('[E2.3][S8] a link opened in a tab that already shows A02 leaves the address and is taken up and leaves the address', async ({ page }, testInfo) => {
  const language = languageOf(testInfo)
  const addresses: string[] = []

  // A02 sends a visitor who has not signed in to sign-in, so sign in first: the tab then shows A02 with no link.
  await page.goto('/store/onboarding')
  await signInFromSheet(page, language, newEmail())
  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/store\/onboarding$/)
  await expect(page.getByRole('heading', { name: words[language].missingTitle })).toBeVisible()
  page.on('framenavigated', frame => addresses.push(frame.url()))
  await page.evaluate((value: string) => {
    window.location.hash = `invitation=${value}`
  }, token)

  await expect(page.getByRole('heading', { name: say(language, 'stores.refusal.notFound.title') })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBeNull()
  expect(page.url()).not.toContain(token)
  expect(addresses.at(-1)).not.toContain(token)
})
