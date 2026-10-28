import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.11 / AC30: the guest tabs keep the language prefix, and the Profile language change returns to the public page.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

type Lang = 'en' | 'de'

const TABS: Record<Lang, { label: string, to: string }[]> = {
  en: [
    { label: 'Explore', to: '/en' },
    { label: 'Keepsakes', to: '/en/gifts' },
    { label: 'Tours', to: '/en/tours' },
    { label: 'Account', to: '/account' },
  ],
  de: [
    { label: 'Entdecken', to: '/de' },
    { label: 'Andenken', to: '/de/gifts' },
    { label: 'Touren', to: '/de/tours' },
    { label: 'Konto', to: '/account' },
  ],
}

const BROKEN_TEXT = /\{\w+\}|undefined|\b(?:nav|account)\.[a-z.]+\b/

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

      await page.goto(start)
      await hydrated(page)
      for (const { label, to } of TABS[lang]) {
        const tab = nav(page).getByRole('link', { name: label, exact: true })

        await expect(tab).toBeVisible()
        await expect(tab).toHaveAttribute('href', to)
        await tab.click()
        await expect(page).toHaveURL(new RegExp(`${to === '/en' || to === '/de' ? `${to}/?` : to}(?:\\?.*)?$`))
        await expect(nav(page)).not.toContainText(BROKEN_TEXT)
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
    await nav(page).getByRole('link', { name: 'Explore', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/?$/)
    await page.locator('a[href^="/en/stories/"]').first().click()
    await expect(page).toHaveURL(/\/en\/stories\/[^/]+$/)
    const story = new URL(page.url()).pathname.split('/').pop()
    // The story page hides the tab bar; step to the profile with a client-side history entry, as a link would.
    await page.evaluate(() => {
      history.pushState({}, '', '/account?tab=profile')
      dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByRole('radio', { name: 'English' })).toBeVisible()

    await page.getByText('Deutsch', { exact: true }).click()
    await expect(page).toHaveURL(`/de/stories/${story}`)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sk.language'))).toBe('"de"')
    expect(problems).toEqual([])
  })
})
