import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.11 / AC30: the guest tabs keep the language prefix, and the Profile language change returns to the public page.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

type Lang = 'en' | 'de'

const TABS: Record<Lang, { label: string, to: string, heading: string }[]> = {
  en: [
    { label: 'Explore', to: '/en', heading: 'Make yourself at home' },
    { label: 'Keepsakes', to: '/en/gifts', heading: 'Keepsakes' },
    { label: 'Tours', to: '/en/tours', heading: 'Tours around Luzerne' },
    { label: 'Account', to: '/account', heading: 'Account' },
  ],
  de: [
    { label: 'Entdecken', to: '/de', heading: 'Fühlen Sie sich wie zu Hause' },
    { label: 'Andenken', to: '/de/gifts', heading: 'Andenken' },
    { label: 'Touren', to: '/de/tours', heading: 'Touren rund um Luzern' },
    { label: 'Konto', to: '/account', heading: 'Konto' },
  ],
}

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

async function signIn(page: Page) {
  await page.goto('/sign-in?returnTo=/account')
  await hydrated(page)
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await page.locator('#sign-in-code').pressSequentially('123456')
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

function nav(page: Page) {
  return page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Konto' }).or(page.getByRole('link', { name: 'Account' })) })
}

test.describe('[E3.11][AC30] guest tabs and the Profile language change', () => {
  for (const [lang, start] of [['de', '/de/stories'], ['en', '/en']] as const) {
    test(`AC-6: the tabs keep the ${lang} prefix`, async ({ page }) => {
      const problems = problemsOf(page)

      // The Account tab has no prefix, so its language is the saved one.
      await page.addInitScript(language => localStorage.setItem('sk.language', JSON.stringify(language)), lang)
      await page.goto(start)
      await hydrated(page)
      for (const { label, to, heading } of TABS[lang]) {
        const tab = nav(page).getByRole('link', { name: label, exact: true })

        await expect(tab).toBeVisible()
        await expect(tab).toHaveAttribute('href', to)
        await tab.click()
        await expect(page).toHaveURL(new RegExp(`${to}/?$`))
        await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      }
      expect(problems).toEqual([])
    })
  }

  test('AC-5a: a direct visit to the profile keeps the address when the language changes', async ({ page }) => {
    const problems = problemsOf(page)

    await signIn(page)
    await page.goto('/account?tab=profile')
    await hydrated(page)
    const before = new URL(page.url())

    await page.getByText('Deutsch', { exact: true }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sk.language'))).toBe('"de"')
    await expect(page.getByRole('radio', { name: 'Deutsch' })).toBeChecked()
    await expect(page.getByRole('heading', { name: 'Sprache', level: 2 })).toBeVisible()
    const after = new URL(page.url())

    expect(after.pathname + after.search).toBe(before.pathname + before.search)
    expect(problems).toEqual([])
  })

  test('AC-5b: a language change in the profile returns to the public page in the new language', async ({ page }) => {
    const problems = problemsOf(page)

    await signIn(page)
    await nav(page).getByRole('link', { name: 'Keepsakes', exact: true }).click()
    await expect(page).toHaveURL('/en/gifts')
    await nav(page).getByRole('link', { name: 'Account', exact: true }).click()
    await expect(page).toHaveURL('/account')
    await page.getByRole('link', { name: /Language/ }).click()
    await expect(page).toHaveURL('/account?tab=profile')

    await page.getByText('Deutsch', { exact: true }).click()
    await expect(page).toHaveURL('/de/gifts')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.getByRole('heading', { name: 'Andenken', level: 1, exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sk.language'))).toBe('"de"')
    expect(problems).toEqual([])
  })

  test('AC-5b: a visit to the cart ends the public context, so the profile stays put', async ({ page }) => {
    await signIn(page)
    await nav(page).getByRole('link', { name: 'Keepsakes', exact: true }).click()
    await expect(page).toHaveURL('/en/gifts')
    await page.getByRole('link', { name: /cart/i }).first().click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByRole('heading', { name: 'Cart', level: 1 })).toBeVisible()
    // The cart has no tab bar and no link to Account. A visitor goes from it to Account (the page the visit began on)
    // by the browser's history, two entries back. The jump skips Keepsakes, so no public page is shown in between
    // (its Back button would show Keepsakes again and put it back in the memory).
    await page.evaluate(() => history.go(-2))
    await expect(page).toHaveURL('/account')
    await page.getByRole('link', { name: /Language/ }).click()
    await page.getByText('Deutsch', { exact: true }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sk.language'))).toBe('"de"')
    await expect(page).toHaveURL('/account?tab=profile')
  })
})
