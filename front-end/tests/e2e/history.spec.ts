import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// E3.9 AC-1: browser history works on every route of the `verify:routes` baseline (scripts/verify/compare-builds.mjs SETS).
// From the language home, a visitor follows a link (or a client navigation where the home has no link), goes back, then forward.
// Query-only variants (`?tab=`, `?lang=`, `?step=`) are left out: they are not routes.
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

/** The screen shows: its `main` landmark, or its own heading where the route has no landmark (the sign-in route). */
async function expectScreen(page: Page, heading?: string) {
  await expect((heading ? page.getByRole('heading', { name: heading }) : page.getByRole('main')).first()).toBeVisible()
  await expect(page.getByText(NOT_FOUND)).toHaveCount(0)
  expect(page.url()).not.toContain('#/')
}

/** The first line of text in the main landmark, once the screen has any. */
async function firstLine(page: Page) {
  let line = ''

  await expect(async () => {
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Locator.innerText is the text a visitor sees, not the DOM property
    line = (await page.getByRole('main').first().innerText()).split('\n').find(l => l.trim()) ?? ''
    expect(line).not.toBe('')
  }).toPass()

  return line
}

/** Where the demo state is ready: the language home, with the ids of seed records. `signedIn` is the demo guest with orders (the account routes need one); the sign-in route is for a visitor who is not. */
async function startAtHome(page: Page, owner: boolean, signedIn = true) {
  if (owner) {
    await signInAsOwner(page)
  }
  await page.goto(HOME)
  await hydrated(page)
  const ids = await seedIds(page, !owner && signedIn)

  if (!owner && signedIn) {
    await page.reload()
    await hydrated(page)
  }
  await expectScreen(page)

  return ids
}

/** A real click on a visible link to the route when the home has one, else the client navigation of scripts/verify/browser.mjs goTo. The way taken is kept as the `follow` annotation of the test. */
async function follow(page: Page, route: string) {
  // The home keeps an aria-hidden copy of its header while it loads: only a link outside it is one a visitor can press.
  const link = page.locator(`a[href="${route}"]:visible:not([aria-hidden="true"] a)`).first()

  if (await link.count()) {
    await link.click()
    test.info().annotations.push({ type: 'follow', description: 'link click' })
    return
  }
  await page.evaluate((p) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, route)
  test.info().annotations.push({ type: 'follow', description: 'client navigation' })
}

const SETS = [
  { name: 'guest', owner: false, routes: GUEST_ROUTES },
  { name: 'owner', owner: true, routes: OWNER_ROUTES },
]

for (const set of SETS) {
  test.describe(`[E3.9] AC-1 ${set.name} routes`, () => {
    for (const route of set.routes) {
      test(`[E3.9] AC-1 back and forward on ${route} (${set.name})`, async ({ page }) => {
        const ids = await startAtHome(page, set.owner)
        const path = fill(route, ids)

        const homeLine = await firstLine(page)

        await follow(page, path)
        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        // The home has a `main` too, so the route's screen is told from it by its first line of text.
        await expect.poll(() => firstLine(page)).not.toBe(homeLine)
        const routeLine = await firstLine(page)

        await page.goBack()
        await expect.poll(() => new URL(page.url()).pathname).toBe(HOME)
        await expectScreen(page)

        await expect.poll(() => firstLine(page)).toBe(homeLine)

        await page.goForward()
        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        await expect.poll(() => firstLine(page)).toBe(routeLine)
      })

      test(`[E3.9] AC-1 a typed ${route} and a reload open the same screen (${set.name})`, async ({ page }) => {
        const ids = await startAtHome(page, set.owner)
        const path = fill(route, ids)

        await page.goto(path)
        await hydrated(page)
        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        const heading = await firstLine(page)

        await page.reload()
        await hydrated(page)
        expect(new URL(page.url()).pathname).toBe(path)
        await expectScreen(page)
        // The same screen: the main landmark opens with the same first line of text.
        await expect.poll(() => firstLine(page)).toBe(heading)
      })
    }
  })
}

test.describe('[E3.9] AC-1 sign-in route', () => {
  test('[E3.9] AC-1 back and forward on /sign-in (guest)', async ({ page }) => {
    await startAtHome(page, false, false)

    await follow(page, '/sign-in')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/sign-in')
    await expectScreen(page, SIGN_IN)

    await page.goBack()
    await expect.poll(() => new URL(page.url()).pathname).toBe(HOME)
    await expectScreen(page)

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

test('[E3.9][AC12] /en carries neither header', async ({ request }) => {
  const response = await request.get(HOME)

  expect(response.status()).toBe(200)
  expect(response.headers()['x-robots-tag']).toBeUndefined()
  expect(response.headers()['referrer-policy']).toBeUndefined()
})
