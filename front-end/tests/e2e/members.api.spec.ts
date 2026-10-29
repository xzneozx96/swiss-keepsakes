import type { Browser, Page } from '@playwright/test'
import type { Language } from './invitation-flows'
import { expect, test } from '@playwright/test'
import { managerInvitationMail, newEmail, ownerInvitationMail, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, languageOf, newClientAddress, newVisitor, openLink, say, signedInSuperAdmin, tokenOf, words } from './invitation-flows'

// [E2.4][AC02] M22 and M01 against the real API on one origin, at 375x812, on Chromium in English (playwright.config.ts). The Owner
// comes through the E2.3 path (the Super Admin creates the store, the N20 link, accept). The N18 link is the one
// the real mail attempt builds for the Manager's invitation (api/test/support/e2e-server.ts, `template=N18`).
test.afterEach(closeVisitors)

test.beforeEach(async ({ page, context }, testInfo) => {
  await newClientAddress(context)
  await page.addInitScript(
    (value: string) => localStorage.setItem('sk.language', JSON.stringify(value)),
    languageOf(testInfo),
  )
})

// The Manager screen's title, with any store name in place of {store}.
function managerTitle(language: Language) {
  const marker = '\u0000'
  const parts = say(language, 'stores.invite.managerTitle', { store: marker }).split(marker)

  return new RegExp(`^${parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)).join('.+')}$`)
}

async function storeWithOwner(browser: Browser, language: Language) {
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, language)

  await createStore(admin, language, ownerEmail)
  const mail = await ownerInvitationMail(ownerEmail)
  const owner = await newVisitor(browser, language)

  await followLinkAs(owner, language, mail.link, ownerEmail)
  await expect(owner.getByRole('heading', { level: 1, name: say(language, 'stores.onboarding.title') })).toBeVisible()

  return { owner, ownerEmail }
}

async function openMembers(owner: Page, language: Language) {
  await owner.goto('/store/settings')
  await owner.getByRole('tab', { name: say(language, 'stores.members.title') }).click()
  await expect(owner.getByRole('textbox', { name: say(language, 'stores.members.invite.email') })).toBeVisible()
}

async function invite(owner: Page, language: Language, email: string) {
  await owner.getByRole('textbox', { name: say(language, 'stores.members.invite.email') }).fill(email)
  await owner.getByRole('button', { name: say(language, 'stores.members.invite.submit') }).click()
  await expect(owner.locator('[data-invitation="open"]').filter({ hasText: email })).toBeVisible()
}

/** The display-name form M01 shows to an account with no name, filled in if it appears, then the store opens. */
async function acceptAsManager(page: Page, language: Language, link: string, email: string) {
  await followLinkAs(page, language, link, email, '/invitation')
  await page.getByRole('button', { name: say(language, 'stores.invite.accept') }).click()
  const name = page.getByRole('textbox', { name: say(language, 'stores.name.label') })

  await expect.poll(async () => new URL(page.url()).pathname === '/store' || await name.isVisible()).toBe(true)
  if (new URL(page.url()).pathname !== '/store') {
    await name.fill('Mia Manager')
    await page.getByRole('button', { name: say(language, 'stores.name.saveContinue') }).click()
  }
  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/store$/)
}

test('[E2.4][AC02][E3.4][AC02] the Owner invites a Manager, another email is refused, the Manager accepts and sees only that store and no members tab, and a removed Manager loses access', async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000)
  const language = languageOf(testInfo)
  const { owner } = await storeWithOwner(browser, language)
  const managerEmail = newEmail()

  await openMembers(owner, language)
  await expect(owner.locator('[data-member="owner"]')).toBeVisible()
  await expect(owner.locator('[data-member="owner"]').getByRole('button')).toHaveCount(0)
  await invite(owner, language, managerEmail)

  const mail = await managerInvitationMail(managerEmail)

  expect(mail.to).toBe(managerEmail)
  expect(mail.link.startsWith(`${SPA_ORIGIN}/invitation#invitation=`)).toBe(true)
  const token = tokenOf(mail.link)

  // Another email is refused, and the invitation stays open for the right one.
  const other = await newVisitor(browser, language)

  await followLinkAs(other, language, mail.link, newEmail(), '/invitation')
  await other.getByRole('button', { name: say(language, 'stores.invite.accept') }).click()
  await expect(other.getByRole('heading', { name: say(language, 'stores.refusal.mismatch.title') })).toBeVisible()
  await expect(other.getByRole('button', { name: say(language, 'stores.onboarding.signOut') })).toBeVisible()
  expect(await other.evaluate(() => sessionStorage.getItem('sk.invitationToken'))).toBe(token)

  // The Manager sees the store and the role before sign-in, and nothing is accepted until the button is tapped.
  const manager = await newVisitor(browser, language)
  const accepts: string[] = []

  manager.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/me/invitations/accept')
      accepts.push(request.method())
  })
  await openLink(manager, mail.link)
  await expect(manager.getByRole('heading', { level: 1, name: managerTitle(language) })).toBeVisible()
  await expect(manager.getByRole('button', { name: say(language, 'stores.invite.accept') })).toHaveCount(0)
  expect(accepts).toEqual([])
  expect(manager.url()).not.toContain(token)
  await acceptAsManager(manager, language, mail.link, managerEmail)
  expect(accepts).toHaveLength(1)
  // No request address and no referer of either person held the token: followLinkAs and openLink watch, and the afterEach checks.

  const me = await (await manager.request.get('/api/me')).json() as { stores: Array<{ storeId: string, role: string }> }

  expect(me.stores).toHaveLength(1)
  expect(me.stores[0].role).toBe('manager')
  const { storeId } = me.stores[0]

  expect((await manager.request.get(`/api/store/${storeId}/onboarding`)).ok()).toBe(true)
  await manager.goto('/store/settings')
  await expect(manager.getByRole('tab')).toHaveCount(0)
  expect((await manager.request.get(`/api/store/${storeId}/members`)).status()).toBe(403)

  // The Owner sees the Manager, and removing asks first.
  await owner.reload()
  await owner.getByRole('tab', { name: say(language, 'stores.members.title') }).click()
  const row = owner.locator('[data-member="manager"]').filter({ hasText: managerEmail })

  await expect(row).toBeVisible()
  await row.getByRole('button', { name: say(language, 'stores.members.removeLabel', { email: managerEmail }) }).click()
  await owner.getByRole('button', { name: say(language, 'stores.members.removeConfirm') }).click()
  await expect(owner.locator('[data-member="manager"]')).toHaveCount(0)

  // The Manager's next request is refused, and /api/me lists no store.
  expect((await manager.request.get(`/api/store/${storeId}/onboarding`)).status()).toBe(403)
  const after = await (await manager.request.get('/api/me')).json() as { stores: unknown[] }

  expect(after.stores).toHaveLength(0)
})

test('[E2.4][AC02] revoke kills the link and a new invitation of the same address gets a new one, and send again kills the old link', async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000)
  const language = languageOf(testInfo)
  const { owner } = await storeWithOwner(browser, language)
  const revoked = newEmail()
  const resent = newEmail()

  await openMembers(owner, language)
  await invite(owner, language, revoked)
  const revokedMail = await managerInvitationMail(revoked)

  await owner.getByRole('button', { name: say(language, 'stores.members.revokeLabel', { email: revoked }) }).click()
  await owner.getByRole('button', { name: say(language, 'stores.members.revokeConfirm') }).click()
  // The confirm button sits where the toast shows, and a toast under the pointer stays open and covers the form below.
  await owner.mouse.move(0, 0)
  await expect(owner.locator('[data-invitation]').filter({ hasText: revoked })).toHaveCount(0)
  const late = await newVisitor(browser, language)

  await openLink(late, revokedMail.link)
  await expect(late.getByRole('heading', { name: say(language, 'stores.refusal.revoked.manager.title') })).toBeVisible()
  await expect(late.getByText(say(language, 'stores.refusal.revoked.manager.text'))).toBeVisible()
  // A link that can never work again offers no sign-in.
  await expect(late.getByRole('button', { name: words[language].send })).toHaveCount(0)

  await invite(owner, language, resent)
  const first = await managerInvitationMail(resent)

  await owner.getByRole('button', { name: say(language, 'stores.members.resendLabel', { email: resent }) }).click()
  await expect(owner.getByText(say(language, 'stores.members.resent', { email: resent }))).toBeVisible()
  const second = await managerInvitationMail(resent)

  expect(second.link).not.toBe(first.link)
  const stale = await newVisitor(browser, language)

  await openLink(stale, first.link)
  await expect(stale.getByRole('heading', { name: say(language, 'stores.refusal.notFound.title') })).toBeVisible()
  const fresh = await newVisitor(browser, language)

  await openLink(fresh, second.link)
  await expect(fresh.getByRole('heading', { level: 1, name: managerTitle(language) })).toBeVisible()
  // The sign-in form sits on the invitation itself.
  await expect(fresh.getByRole('button', { name: words[language].send })).toBeVisible()
})
