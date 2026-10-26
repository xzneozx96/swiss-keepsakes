import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Public pages the server renders. `text` is real visible text that must be in the first HTML. */
const PUBLIC_ROUTES: { path: string, text: string }[] = [
  { path: '/', text: 'Come and see it for yourself' },
  { path: '/stories', text: 'A morning on the Musegg wall' },
  { path: '/stories/musegg-morning', text: 'Climb the old town wall before the city wakes up' },
  { path: '/credits', text: 'Photo credits' },
  { path: '/tours', text: 'Pilatus' },
  { path: '/tours/pilatus-above-the-city', text: 'bus, gondola and the Dragon Ride to the summit' },
  { path: '/gifts', text: 'Luzerne gift box' },
  { path: '/gifts/lucerne-gift-box', text: 'Three small things from Luzerne makers' },
  // The no-results message repeats the query, so the expected text is a title that shows only on a hit.
  { path: '/search?q=Pilatus', text: 'Pilatus keyring' },
]

/**
 * Waits until React has committed the hydrated page. The root layout sets `data-hydrated` from an effect, which
 * runs after the root commit. `<main>` must then hold at least one element (an empty `<main>` must not pass) and every
 * element in it must carry `__reactFiber` (icon paths are set as markup, and the map's canvas, controls and pins are made by maplibre, so not those): the lazily loaded `_guest`
 * layout and the routed content are hydrated or client-rendered. The nav is not used: detail pages hide it.
 * No single signal is enough.
 */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const inMain = [...document.querySelectorAll('main *:not(svg *):not(.tour-map-frame *)')]

    return document.documentElement.dataset.hydrated === 'true'
      && inMain.length > 0
      && inMain.every(element => Object.keys(element).some(key => key.startsWith('__reactFiber')))
  })
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' }

/** The visible text of the first `<main>` in the HTML, with entities decoded as the browser does. */
function mainText(html: string) {
  const inner = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? ''

  return inner
    .replaceAll(/<div data-client-only[^>]*>(?:<div[^>]*><\/div>)*<\/div>/g, '')
    .replaceAll(/<!--.*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, '')
    .replaceAll(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (whole, hex, dec, name) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : ENTITIES[name.toLowerCase()] ?? whole)
}

/**
 * The visible text of the first `<main>` in the browser, without the client-only region (`data-client-only`, the tour
 * map): the map's chunk may or may not have loaded yet, and the server does not render it.
 */
function clientText(page: Page) {
  return page.locator('main').first().evaluate((main) => {
    const copy = main.cloneNode(true) as HTMLElement

    copy.querySelectorAll('[data-client-only]').forEach(region => region.remove())

    return copy.textContent ?? ''
  })
}

/** Collects console errors, warnings and page errors; a hydration mismatch shows up here. */
function collectProblems(page: Page) {
  const problems: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

  return problems
}

for (const { path, text } of PUBLIC_ROUTES) {
  test(`[E3.3][AC-1] ${path} server HTML has its text`, async ({ request }) => {
    const response = await request.get(path)
    const html = await response.text()

    expect(response.status()).toBe(200)
    expect(mainText(html)).toContain(text)
    // Scoped to `<main>`: the document itself carries `skeleton` in CSS and scripts.
    expect(/<main\b[^>]*>[\s\S]*?<\/main>/.exec(html)?.[0] ?? '').not.toMatch(/class="[^"]*\bskeleton\b/)
  })

  test(`[E3.3][AC-1] ${path} hydrates with no hydration or console error`, async ({ page, request }) => {
    const problems = collectProblems(page)
    const serverText = mainText(await (await request.get(path)).text())

    await page.goto(path)
    await waitForHydration(page)

    expect(serverText).not.toBe('')
    // One read after the commit: the hydrated page must already show the server text. A mismatch also shows up as a console error.
    expect(await clientText(page)).toBe(serverText)
    expect(problems).toEqual([])
  })

  test(`[E3.3][AC-1] ${path} shows the server text in a browser on another time zone and locale`, async ({ browser, request }) => {
    const serverText = mainText(await (await request.get(path)).text())

    expect(serverText).not.toBe('')
    // One zone ahead of the server's and one behind it, so a local-time date reading differs either way.
    for (const timezoneId of ['Pacific/Auckland', 'Pacific/Honolulu']) {
      const context = await browser.newContext({ timezoneId, locale: 'de-CH' })

      try {
        const page = await context.newPage()
        const problems = collectProblems(page)

        await page.goto(path)
        await waitForHydration(page)

        expect(await clientText(page)).toBe(serverText)
        expect(problems).toEqual([])
      }
      finally {
        await context.close()
      }
    }
  })
}

test('[E3.3][AC-1] a hard load of / has no skeleton in its first HTML, a client move to / still shows one', async ({ page, request }) => {
  const html = await (await request.get('/')).text()

  expect(mainText(html)).not.toContain('skeleton')
  expect(/<main\b[^>]*>[\s\S]*?<\/main>/.exec(html)?.[0] ?? '').not.toMatch(/class="[^"]*\bskeleton\b/)

  // A hard load of /tours, then a client-side move to the home page.
  await page.goto('/tours')
  await waitForHydration(page)
  await page.locator('nav a[href="/"]').first().click()
  await expect(page.locator('.skeleton').first()).toBeVisible()
  await expect(page.getByText('Come and see it for yourself')).toBeVisible()
  await expect(page.locator('.skeleton')).toHaveCount(0)
})

// The E3.2 provider and navigation checks, carried here from the former SSR test routes. The home page is the provider check:
// the Account tab of the guest shell shows the language (Account or Konto) and a photo only for a signed-in guest. `<html lang>` is fixed in the root shell, so only its value after hydration (de) is a language signal.

/** The Account tab's link in the first HTML, or an empty string. */
function accountTab(html: string) {
  return /<a [^>]*href="\/account"[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0] ?? ''
}

test('[E3.2][AC-2] server HTML contains the providers text', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()

  expect(response.status()).toBe(200)
  expect(mainText(html)).toContain('Come and see it for yourself')
  // Signed out: the Account tab is there with its icon and no profile photo.
  expect(accountTab(html)).toContain('Account')
  expect(accountTab(html)).not.toContain('<img')
})

test('[E3.2][AC-2] hydrates with no hydration or console error', async ({ page, request }) => {
  const problems = collectProblems(page)
  const serverText = mainText(await (await request.get('/')).text())

  await page.goto('/')
  await waitForHydration(page)

  await expect(page.locator('nav a[href="/account"]').first()).toContainText('Account')
  expect(serverText).not.toBe('')
  // The first HTML carried the same visible text.
  expect(await clientText(page)).toBe(serverText)
  expect(problems).toEqual([])
})

test('[E3.2][AC01] a guest moves between two pages with no sign-in prompt', async ({ page }) => {
  const urls: string[] = []

  page.on('framenavigated', frame => urls.push(frame.url()))
  await page.goto('/')
  await waitForHydration(page)
  await page.evaluate(() => {
    (window as unknown as { marker: string }).marker = 'kept'
  })
  await expect(page.getByText('Come and see it for yourself')).toBeVisible()
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)

  await page.locator('main a[href="/stories"]').first().click()

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/stories$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Local stories' })).toBeVisible()
  await expect(page.getByText('Come and see it for yourself')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)
  expect(urls.some(url => url.includes('sign-in'))).toBe(false)
})

test('[E3.2][AC01] a first visit with empty storage moves to a guest page on the client, with no sign-in prompt', async ({ page }) => {
  const urls: string[] = []

  page.on('framenavigated', frame => urls.push(frame.url()))
  // A new browser context starts with empty storage.
  await page.goto('/')
  await expect(page.getByRole('navigation').first()).toBeVisible()
  // The server HTML shows the links before React owns them; a click then would load the page again.
  await page.waitForFunction(() => Object.keys(document.querySelector('nav a') ?? {}).some(key => key.startsWith('__reactProps')))
  await page.evaluate(() => {
    (window as unknown as { marker: string }).marker = 'kept'
  })
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)

  await page.locator('nav a[href="/tours"]').first().click()

  await expect(page).toHaveURL(/^https?:\/\/[^/#]+\/tours$/)
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('kept')
  expect(await page.getByText('Sign in', { exact: true }).count()).toBe(0)
  expect(urls.some(url => url.includes('sign-in'))).toBe(false)
})

test('[E3.2][AC-2] saved German and a saved sign-in hydrate with no error', async ({ page, request }) => {
  const problems = collectProblems(page)

  // Let the app write its own current saved state, then sign the demo guest in as the owner, with a profile photo.
  await page.goto('/lab')
  await page.waitForFunction(() => localStorage.getItem('sk.demo') !== null)
  const saved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('sk.demo') as string)

    state.role = 'owner'
    state.data.guests[0].avatar = 'sample:anna-k'
    state.data.signedInGuestId = state.data.guests[0].id

    return JSON.stringify(state)
  })

  await page.addInitScript((demo) => {
    localStorage.setItem('sk.language', '"de"')
    localStorage.setItem('sk.demo', demo)
  }, saved)

  // The server knows neither choice: its HTML is English and signed out.
  const html = await (await request.get('/')).text()

  expect(accountTab(html)).toContain('Account')
  expect(accountTab(html)).not.toContain('<img')

  await page.goto('/')
  await waitForHydration(page)
  // The saved language and sign-in arrive after hydration.
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('nav a[href="/account"]').first()).toContainText('Konto')
  await expect(page.locator('nav a[href="/account"] img').first()).toBeVisible()
  expect(problems).toEqual([])
})
