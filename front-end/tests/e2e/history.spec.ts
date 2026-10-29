import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.9 AC-1: browser history works on every route of the `verify:routes` baseline (scripts/verify/compare-builds.mjs SETS).
// A visitor follows a real link, tab or button to the route, goes back, then forward. Query-only variants (`?tab=`, `?lang=`, `?step=`) are left out: they are not routes.
// Where the route is reached from:
// - Guest top-level routes: the language home, as the AC says.
// - Owner routes: /store, the owner's start page (a deviation from the AC: an Owner has no language home), through the sidebar.
// - Deep routes (a record, a tab, /sign-in): their parent page, opened by address, so the back target is that parent.
// The only route no link, tab or button reaches is CLIENT_NAVIGATION: the photo-credits link in the prototype bar is hidden for the client demo.
// It is followed with history.pushState and a popstate event (scripts/verify/browser.mjs goTo), and its title says so.
const NOT_FOUND = 'This page does not exist'
const HOME = '/en'
// The sign-in route has no `main` landmark: its screen is this heading.
const SIGN_IN = 'Sign in to continue'

const GUEST_ROUTES = ['/en/gifts', '/en/gifts/:gift', '/en/tours', '/en/stories', '/en/stories/musegg-morning', '/en/search', '/cart', '/en/plan', '/en/credits', '/account', '/account/orders/:order']
const OWNER_ROUTES = ['/store', '/store/orders', '/store/orders/:order', '/store/calendar', '/store/sales', '/store/reports', '/store/reports/sales', '/store/reports/costs', '/store/reports/guests', '/store/reports/margin', '/store/partners', '/store/partners/:partner', '/store/partners/analytics', '/store/products', '/store/products/gifts/:gift', '/store/products/tours', '/store/products/tours/:tour', '/store/content', '/store/content/analytics', '/store/content/reviews', '/store/requests', '/store/requests/analytics', '/store/requests/questions']

interface Ids { gift: string, giftId: string, tour: string, order: string, partner: string }

async function hydrated(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true')
}

/** Arrives as the guest, then picks Owner in the prototype bar, as merchant-nav.spec.ts does. */
async function signInAsOwner(page: Page) {
  await page.goto('/')
  const roleRadio = page.getByRole('dialog').getByText('Merchant · Owner', { exact: true })

  // The dev server hydrates after the first paint, so the first click can be lost: retry until the drawer is open.
  await expect(async () => {
    await page.getByRole('region', { name: 'Prototype controls' }).getByRole('button', { name: 'Guest' }).click()
    await expect(roleRadio).toBeVisible({ timeout: 2000 })
  }).toPass()
  await roleRadio.click()
  await expect(page).toHaveURL(/\/store/)
}

/** The ids of seed records, read from the demo state as compare-builds.mjs does. The guest gets the signed-in guest who has an order. */
async function seedIds(page: Page, signInGuest: boolean): Promise<Ids> {
  return page.evaluate((signIn) => {
    const state = JSON.parse(localStorage.getItem('sk.demo')!)
    const d = state.data
    const guest = d.guests.find((g: { id: string }) => d.orders.some((o: { guestId: string }) => o.guestId === g.id)) ?? d.guests[0]

    if (signIn) {
      state.role = 'guest'
      d.signedInGuestId = guest.id
      localStorage.setItem('sk.demo', JSON.stringify(state))
    }

    return {
      gift: d.products[0].slug ?? d.products[0].id,
      giftId: d.products[0].id,
      tour: d.tours.tours[0].id,
      order: (d.orders.find((o: { guestId: string }) => o.guestId === guest.id) ?? d.orders[0]).id,
      partner: d.partners[0].id,
    }
  }, signInGuest)
}

function fill(route: string, ids: Ids) {
  return route.replace(':gift', route.includes('/store/') ? ids.giftId : ids.gift).replace(':tour', ids.tour).replace(':order', ids.order).replace(':partner', ids.partner)
}

/** Routes that no link reaches. Their tests are followed by a client navigation and say so in the title. */
const CLIENT_NAVIGATION = new Set(['/en/credits'])

interface Entry {
  /** The page to open by address first (default: the start page). The back target is this page. */
  parent?: string
  /** A tab of the parent page that opens the route. */
  tab?: RegExp
  /** The button on the parent page that opens the route. */
  button?: RegExp
  /** A CSS selector of the link to press, for a record whose id is not known (the first match is pressed). */
  pick?: string
}

const ENTRIES: Record<string, Entry> = {
  '/en/stories/musegg-morning': { parent: '/en/stories' },
  '/account/orders/:order': { parent: '/account?tab=orders', pick: 'a[href^="/account/orders/"]:not([href$="/pay"])' },
  '/store': { parent: '/store/orders' },
  '/store/orders/:order': { pick: 'a[href^="/store/orders/"]:not([href*="?"])' },
  // The cost data page is not a tab: the margin report links to it ("Enter costs").
  '/store/reports/costs': { parent: '/store/reports/margin' },
  '/store/partners/:partner': { parent: '/store/partners' },
  '/store/products/gifts/:gift': { parent: '/store/products' },
  '/store/products/tours': { parent: '/store/products', tab: /^Tours/ },
  '/store/products/tours/:tour': { parent: '/store/products/tours' },
  '/store/requests/analytics': { parent: '/store/requests', tab: /^Analytics/ },
  '/store/requests/questions': { parent: '/store/requests', tab: /^Questions/ },
  '/sign-in': { parent: '/account', button: /^Sign in$/ },
}

/** What tells a screen from its neighbours: its title, open sidebar page, tab, heading and first line of text. Read once the screen has a heading. */
async function screenKey(page: Page) {
  let key = ''

  await expect(async () => {
    const main = page.getByRole('main').first()

    // A screen without any heading (the assistant, /en/plan) is read by its text alone.
    await main.getByRole('heading').first().waitFor({ timeout: 1000 }).catch(() => undefined)
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Locator.innerText is the text a visitor sees, not the DOM property
    const lines = (await main.innerText()).split('\n').filter(l => l.trim())
    // A screen with no text of its own (the assistant) is read by the first lines of its accessibility tree.
    const tree = (await main.ariaSnapshot()).split('\n')
    // An empty landmark (`- main` alone) is a screen that has not rendered yet.
    const text = lines[0] ?? (tree.length > 1 ? tree.slice(0, 3).join(' ') : '')
    const heading = (await main.getByRole('heading').first().textContent({ timeout: 500 }).catch(() => '')) ?? ''
    const tab = (await page.getByRole('tab', { selected: true }).first().textContent({ timeout: 500 }).catch(() => '')) ?? ''
    // The merchant sidebar marks the open page: two pages can share a heading and a first line.
    const current = (await page.locator('nav [aria-current="page"]').first().textContent({ timeout: 500 }).catch(() => '')) ?? ''

    expect(text).not.toBe('')
    key = [await page.title(), current, tab, heading, text].join(' | ')
  }).toPass({ timeout: 10_000 })

  return key
}

/** The key of a screen that has settled: the sidebar and the address change a moment before the page body, so the key is read again after a pause and must not have changed. */
async function settledKey(page: Page) {
  let key = ''

  await expect(async () => {
    key = await screenKey(page)
    await page.waitForTimeout(400)
    expect(await screenKey(page)).toBe(key)
  }).toPass({ timeout: 10_000 })

  return key
}

/** The screen shows: its `main` landmark, or its own heading where the route has no landmark (the sign-in route). */
async function expectScreen(page: Page, heading?: string) {
  await expect((heading ? page.getByRole('heading', { name: heading }) : page.getByRole('main')).first()).toBeVisible()
  await expect(page.getByText(NOT_FOUND)).toHaveCount(0)
  expect(page.url()).not.toContain('#/')
}

/** Where the demo state is ready: the start page and the ids of seed records. `signedIn` is the demo guest with orders (the account routes need one); the sign-in route is for a visitor who is not. */
async function startPage(page: Page, owner: boolean, signedIn = true) {
  if (owner) {
    await signInAsOwner(page)
    // The role switch changes the address before the screen: open /store afresh so its screen is the start.
    await page.goto('/store')
  }
  else {
    await page.goto(HOME)
  }
  await hydrated(page)
  const ids = await seedIds(page, !owner && signedIn)

  if (!owner && signedIn) {
    await page.reload()
    await hydrated(page)
  }
  await expectScreen(page)

  return ids
}

/** Goes to the parent page by address, then reloads nothing: the page it shows is the back target. */
async function openParent(page: Page, parent: string) {
  await page.goto(parent)
  await hydrated(page)
  await expectScreen(page)
}

/** Presses the real link, tab or button to the route, and returns the address it reached. A client navigation only for CLIENT_NAVIGATION. */
async function follow(page: Page, route: string, path: string, entry: Entry) {
  if (CLIENT_NAVIGATION.has(route)) {
    await page.evaluate((p) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
    return path
  }
  // A page keeps an aria-hidden copy of its header while it loads: only a link outside it is one a visitor can press.
  const outside = ':visible:not([aria-hidden="true"] *)'

  if (entry.tab)
    await page.getByRole('tab', { name: entry.tab }).click()
  else if (entry.button)
    await page.getByRole('button', { name: entry.button }).first().click()
  else
    await page.locator(entry.pick ?? `a[href="${path}"]`).and(page.locator(outside)).first().click()
  if (entry.pick) {
    const prefix = path.slice(0, path.lastIndexOf('/') + 1)

    await expect.poll(() => new URL(page.url()).pathname.startsWith(prefix)).toBe(true)
    return new URL(page.url()).pathname
  }
  await expect.poll(() => new URL(page.url()).pathname).toBe(path)
  return path
}

const SETS = [
  { name: 'guest', owner: false, routes: GUEST_ROUTES },
  { name: 'owner', owner: true, routes: OWNER_ROUTES },
]

for (const set of SETS) {
  test.describe(`[E3.9] AC-1 ${set.name} routes`, () => {
    for (const route of set.routes) {
      const entry = ENTRIES[route] ?? {}
      const suffix = CLIENT_NAVIGATION.has(route) ? ' (client navigation)' : ''

      test(`[E3.9] AC-1 back and forward on ${route} (${set.name})${suffix}`, async ({ page }) => {
        // Two page loads and up to six reads of the screen: more than the 30 s default on a cold dev server.
        test.setTimeout(60_000)
        const ids = await startPage(page, set.owner)
        const path = fill(route, ids)

        if (entry.parent)
          await openParent(page, entry.parent)
        const backTo = new URL(page.url()).pathname
        // The start page has a `main` too, so the route's screen is told from it by its key.
        const backKey = await settledKey(page)

        const reached = await follow(page, route, path, entry)

        await expectScreen(page)
        await expect.poll(() => screenKey(page)).not.toBe(backKey)
        const routeKey = await settledKey(page)

        await page.goBack()
        await expect.poll(() => new URL(page.url()).pathname).toBe(backTo)
        await expectScreen(page)
        await expect.poll(() => screenKey(page)).toBe(backKey)

        await page.goForward()
        await expect.poll(() => new URL(page.url()).pathname).toBe(reached)
        await expectScreen(page)
        await expect.poll(() => screenKey(page)).toBe(routeKey)
      })

      test(`[E3.9] AC-1 a typed ${route} and a reload open the same screen (${set.name})`, async ({ page }) => {
        // Two page loads and up to six reads of the screen: more than the 30 s default on a cold dev server.
        test.setTimeout(60_000)
        const ids = await startPage(page, set.owner)
        const path = fill(route, ids)

        await page.goto(path)
        await hydrated(page)
        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        const key = await settledKey(page)

        await page.reload()
        await hydrated(page)
        expect(new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        // The same screen: the same tab, heading, first line and title.
        await expect.poll(() => screenKey(page)).toBe(key)
      })
    }
  })
}

test.describe('[E3.9] AC-1 sign-in route', () => {
  const entry = ENTRIES['/sign-in']

  test('[E3.9] AC-1 back and forward on /sign-in (guest)', async ({ page }) => {
    await startPage(page, false, false)
    await openParent(page, entry.parent!)
    const backKey = await settledKey(page)

    await follow(page, '/sign-in', '/sign-in', entry)
    await expectScreen(page, SIGN_IN)

    await page.goBack()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/account')
    await expectScreen(page)
    await expect.poll(() => screenKey(page)).toBe(backKey)

    await page.goForward()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/sign-in')
    await expectScreen(page, SIGN_IN)
  })

  test('[E3.9] AC-1 a typed /sign-in and a reload open the same screen (guest)', async ({ page }) => {
    await page.goto('/sign-in')
    await hydrated(page)
    await expectScreen(page, SIGN_IN)

    await page.reload()
    await hydrated(page)
    expect(new URL(page.url()).pathname).toBe('/sign-in')
    await expectScreen(page, SIGN_IN)
  })
})

test('[E3.9][AC12] /en carries noindex outside production but not the partner-only header', async ({ request }) => {
  const response = await request.get(HOME)

  expect(response.status()).toBe(200)
  // E3.6 sends noindex on public pages outside production (ADR-001); only the partner-only header stays absent.
  expect(response.headers()['x-robots-tag']).toBe('noindex')
  expect(response.headers()['referrer-policy']).toBeUndefined()

  // A partner path still answers the client shell, with noindex and the partner-only header.
  const partner = await request.get('/partner/some-token', { maxRedirects: 0 })

  expect(partner.status()).toBeLessThan(400)
  expect(await partner.text()).not.toMatch(/<main\b/)
  expect(partner.headers()['x-robots-tag']).toBe('noindex')
  expect(partner.headers()['referrer-policy']).toBe('no-referrer')
})
