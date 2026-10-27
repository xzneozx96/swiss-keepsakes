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

/** Every seed story, tour and gift: its first HTML must carry its own title. The browser checks above stay on the sample slugs. */
const SEED_DETAIL_ROUTES: { path: string, text: string }[] = [
  { path: '/stories/musegg-morning', text: 'A morning on the Musegg wall' },
  { path: '/stories/lion-monument', text: 'The story behind the Lion Monument' },
  { path: '/stories/lake-steamboat', text: 'Crossing the lake by steamboat' },
  { path: '/stories/water-tower', text: 'The Water Tower, older than the bridge' },
  { path: '/stories/weinmarkt-oath', text: 'The square where Luzerne swore its oath' },
  { path: '/stories/spreuer-bridge', text: 'Under the Dance of Death on the Spreuer Bridge' },
  { path: '/stories/needle-dam', text: 'The wooden needles that hold back a lake' },
  { path: '/stories/old-pharmacy', text: 'The pharmacy that has stayed on its corner since 1833' },
  { path: '/stories/hammetschwand-lift', text: 'Europe’s highest outdoor lift, built in 1905' },
  { path: '/stories/victorinox-story', text: 'The knife that began in Ibach' },
  { path: '/tours/lucerne-the-things-that-remain', text: 'Luzerne: The Things That Remain' },
  { path: '/tours/pilatus-above-the-city', text: 'Pilatus: Above the City' },
  { path: '/tours/rigi-from-lake-to-sky', text: 'Rigi: From Lake to Sky' },
  { path: '/gifts/victorinox-swan', text: 'Victorinox Swan on the lake' },
  { path: '/gifts/victorinox-chapel-bridge', text: 'Victorinox Chapel Bridge' },
  { path: '/gifts/victorinox-pilatus', text: 'Victorinox Pilatus' },
  { path: '/gifts/victorinox-lion', text: 'Victorinox Lion Monument' },
  { path: '/gifts/victorinox-old-town', text: 'Victorinox Old town on the Reuss' },
  { path: '/gifts/victorinox-steamboat', text: 'Victorinox Paddle steamer' },
  { path: '/gifts/victorinox-furka', text: 'Victorinox Furka Pass' },
  { path: '/gifts/victorinox-grimsel', text: 'Victorinox Grimsel Pass' },
  { path: '/gifts/victorinox-susten', text: 'Victorinox Susten Pass' },
  { path: '/gifts/victorinox-gotthard', text: 'Victorinox Gotthard Pass' },
  { path: '/gifts/victorinox-nufenen', text: 'Victorinox Nufenen Pass' },
  { path: '/gifts/victorinox-finsterwald', text: 'Victorinox Finsterwald bees' },
  { path: '/gifts/lucerne-gift-box', text: 'Luzerne gift box' },
  { path: '/gifts/chocolate-set', text: 'Chocolate set' },
  { path: '/gifts/limited-edition-print', text: 'Limited-edition print: Water Tower at dawn' },
  { path: '/gifts/pilatus-keyring', text: 'Pilatus keyring' },
  { path: '/gifts/lakeside-candle-box', text: 'Lakeside candle box' },
  { path: '/gifts/dark-chocolate-trio', text: 'Dark chocolate trio' },
  { path: '/gifts/old-town-facades-print', text: 'Old town façades print' },
  { path: '/gifts/lucerne-postcard-set', text: 'Luzerne postcard set' },
  { path: '/gifts/praline-gift-box', text: 'Praline gift box' },
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

for (const { path, text } of SEED_DETAIL_ROUTES) {
  test(`[E3.3][AC-1] ${path} server HTML has its title`, async ({ request }) => {
    const response = await request.get(path)

    expect(response.status()).toBe(200)
    expect(mainText(await response.text())).toContain(text)
  })
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

  expect(/<main\b[^>]*>[\s\S]*?<\/main>/.exec(html)?.[0] ?? '').not.toMatch(/class="[^"]*\bskeleton\b/)

  // A hard load of /tours, then a client-side move to the home page.
  await page.goto('/tours')
  await waitForHydration(page)
  // Watch for the skeleton before the click: it lives for about 350 ms, which a slow poll can miss.
  const skeleton = page.waitForSelector('.skeleton', { state: 'attached' })

  await page.locator('nav a[href="/"]').first().click()
  await skeleton
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
  // Only /tours has this heading, so the count below is read on the moved page.
  await expect(page.getByRole('heading', { level: 1, name: 'Tours around Luzerne' })).toBeVisible()
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

test('[E3.3][AC-1] a returning visit with a saved cart of 3 shows the badge count after hydration', async ({ page }) => {
  const problems = collectProblems(page)

  // Let the app write its own current saved state, then put three items in the cart.
  await page.goto('/lab')
  await page.waitForFunction(() => localStorage.getItem('sk.demo') !== null)
  const saved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('sk.demo') as string)

    state.data.cart = [{ id: 'saved-line', productId: 'p', variantId: 'v', quantity: 3, pickupDate: '2027-01-01', pickupPlaceId: 'x' }]

    return JSON.stringify(state)
  })

  await page.addInitScript(demo => localStorage.setItem('sk.demo', demo), saved)
  await page.goto('/gifts')
  await waitForHydration(page)

  const cart = page.locator('a[data-cart-target]').first()

  await expect(cart).toHaveAttribute('aria-label', 'Cart, 3 items')
  await expect(cart).toContainText('3')
  expect(problems).toEqual([])
})
