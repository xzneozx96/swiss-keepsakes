import type { Page } from '@playwright/test'
import process from 'node:process'
import { expect, test } from '@playwright/test'

// Set E41_EVIDENCE_DIR to also save the screenshots of the menu; a normal run writes nothing.
const EVIDENCE_DIR = process.env.E41_EVIDENCE_DIR

const LANGUAGES = {
  en: {
    shop: 'Shop',
    more: 'More',
    notFound: 'This page does not exist',
    groups: ['Dashboard', 'Operations', 'Products', 'Partners', 'Content', 'Settings'],
    bar: ['Dashboard', 'Operations', 'Calendar', 'More'],
    sheet: ['Products', 'Partners', 'Content', 'Inquiries', 'Analytics', 'Settings'],
    gone: ['Marketing', 'Bookings'],
  },
  de: {
    shop: 'Laden',
    more: 'Mehr',
    notFound: 'Diese Seite gibt es nicht',
    groups: ['Dashboard', 'Tagesgeschäft', 'Produkte', 'Partner', 'Inhalte', 'Einstellungen'],
    bar: ['Dashboard', 'Tagesgeschäft', 'Kalender', 'Mehr'],
    sheet: ['Produkte', 'Partner', 'Inhalte', 'Anfragen', 'Analysen', 'Einstellungen'],
    gone: ['Marketing', 'Buchungen'],
  },
} as const

const ROLES = {
  owner: 'Merchant · Owner',
  manager: 'Merchant · Store Manager',
} as const

type Language = keyof typeof LANGUAGES
type RoleName = keyof typeof ROLES

/** Arrives as the guest, then picks the role in the prototype bar, as a presenter does. */
async function signInAs(page: Page, language: Language, role: RoleName) {
  if (language === 'de')
    await page.addInitScript(() => localStorage.setItem('sk.language', JSON.stringify('de')))
  await page.goto('/')
  // The radio input is visually hidden: the label text is what a presenter clicks.
  const roleRadio = page.getByRole('dialog').getByText(ROLES[role], { exact: true })

  // The dev server hydrates after the first paint, so the first click can be lost: retry until the drawer is open.
  await expect(async () => {
    await page.getByRole('region', { name: 'Prototype controls' }).getByRole('button', { name: 'Guest' }).click()
    await expect(roleRadio).toBeVisible({ timeout: 2000 })
  }).toPass()
  await roleRadio.click()
  await expect(page).toHaveURL(/\/store/)
}

async function expectScreen(page: Page, language: Language) {
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText(LANGUAGES[language].notFound)).toHaveCount(0)
  expect(page.url()).not.toContain('booking')
}

async function save(page: Page, name: string) {
  if (EVIDENCE_DIR) {
    // Lets the sheet finish sliding in before the picture is taken.
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${EVIDENCE_DIR}/${name}.png` })
  }
}

for (const language of ['en', 'de'] as const) {
  const words = LANGUAGES[language]

  for (const role of ['owner', 'manager'] as const) {
    test.describe(`${language} ${role}`, () => {
      test.describe('desktop', () => {
        test.use({ viewport: { width: 1280, height: 900 } })

        test(`[E4.1][AC50] sidebar groups and every link open a screen (${language}, ${role}, 1280 px)`, async ({ page }) => {
          await signInAs(page, language, role)
          const sidebar = page.getByRole('navigation', { name: words.shop })

          await expect(sidebar.locator(':scope > ul > li > button, :scope > ul > li > a')).toHaveText(words.groups)
          for (const word of words.gone)
            await expect(sidebar).not.toContainText(word)
          if (role === 'owner')
            await save(page, `sidebar-${language}`)

          const hrefs = await sidebar.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''))

          expect(hrefs.length).toBeGreaterThan(words.groups.length)
          for (const href of new Set(hrefs)) {
            expect(href).not.toContain('booking')
            await sidebar.locator(`a[href="${href}"]`).first().click()
            await expect(page).toHaveURL(new RegExp(`${href.replace(/\//g, '\\/')}$`))
            await expectScreen(page, language)
          }
        })
      })

      test.describe('phone', () => {
        test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

        test(`[E4.1][AC50] bar, More sheet and every link open a screen (${language}, ${role}, 375 px)`, async ({ page }) => {
          await signInAs(page, language, role)
          const bar = page.getByRole('navigation', { name: words.shop })
          const items = bar.locator('a, button')

          await expect(items).toHaveText(words.bar)
          if (role === 'owner')
            await save(page, `phone-bar-${language}`)

          const sheet = page.getByRole('dialog')
          const openSheet = async () => {
            await bar.getByRole('button', { name: words.more }).click()
            await expect(sheet).toBeVisible()
          }

          await openSheet()
          await expect(sheet.getByRole('link')).toHaveText(words.sheet)
          for (const word of words.gone)
            await expect(sheet).not.toContainText(word)
          if (role === 'owner')
            await save(page, `more-sheet-${language}`)
          const sheetHrefs = await sheet.getByRole('link').evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''))

          for (const href of sheetHrefs) {
            expect(href).not.toContain('booking')
            await sheet.getByRole('link').and(page.locator(`a[href="${href}"]`)).click()
            await expect(page).toHaveURL(new RegExp(`${href.replace(/\//g, '\\/')}$`))
            await expectScreen(page, language)
            await openSheet()
          }
          await page.keyboard.press('Escape')

          const barHrefs = await bar.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''))

          expect(barHrefs).toHaveLength(3)
          for (const href of barHrefs) {
            expect(href).not.toContain('booking')
            await bar.locator(`a[href="${href}"]`).click()
            await expect(page).toHaveURL(new RegExp(`${href.replace(/\//g, '\\/')}$`))
            await expectScreen(page, language)
          }
        })
      })
    })
  }
}
