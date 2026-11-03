import type { APIResponse, Browser, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { mapEn } from '../../src/features/map/messages'
import { newEmail, ownerInvitationMail, readyCover, SPA_ORIGIN } from './api-server'
import { closeVisitors, createStore, followLinkAs, newVisitor, say, signedInSuperAdmin } from './invitation-flows'

// [E4.7] The pin card N03 over the guest map, against the real API on Chromium in English at 375 px (playwright.config.ts;
// German is covered by the component tests). An Owner (the E2.3 path) publishes pins over the store routes; a guest then reads
// the map. The map list is cached for 60 s on the server, so every pin is made before the first guest read.
const FIRST_LOAD = 60_000
const MEDIA = 'http://127.0.0.1:9/media/'

test.describe.configure({ mode: 'serial', retries: 0 })

interface Versioned { rowVersion: number, id: string, slug: { en?: string } | null }

async function send(owner: Page, method: 'post' | 'patch', path: string, body: unknown, version?: number): Promise<APIResponse> {
  return owner.request.fetch(`${SPA_ORIGIN}${path}`, {
    method,
    data: body,
    headers: { 'Origin': SPA_ORIGIN, 'Idempotency-Key': randomUUID(), ...(version === undefined ? {} : { 'If-Match': `"${version}"` }) },
  })
}

async function ok<T>(response: APIResponse, status: number): Promise<T> {
  expect(response.status(), await response.text()).toBe(status)

  return response.json() as Promise<T>
}

const tag = Math.random().toString(36).slice(2, 8)
const slugs = {} as Record<'bridge' | 'plain' | 'hotel' | 'hidden', string>
const titles = { bridge: `Bridge ${tag}`, plain: `Plain ${tag}`, hotel: `Hotel ${tag}`, hidden: `Hidden ${tag}` }
const stories = { main: `Main story ${tag}`, other: `Other story ${tag}` }
const BRIDGE_LINK = 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0517,8.3074,17z'

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000)
  const ownerEmail = newEmail()
  const admin = await signedInSuperAdmin(browser, 'en')

  await createStore(admin, 'en', ownerEmail)
  const owner = await newVisitor(browser, 'en')

  await followLinkAs(owner, 'en', (await ownerInvitationMail(ownerEmail)).link, ownerEmail)
  await expect(owner.getByRole('heading', { level: 1, name: say('en', 'stores.onboarding.title') })).toBeVisible()
  // The membership exists once the invitation is accepted, which the checklist shows.
  await expect.poll(async () => ((await (await owner.request.get(`${SPA_ORIGIN}/api/me`)).json()) as { stores?: unknown[] }).stores?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(0)
  const me = await ok<{ stores: Array<{ storeId: string }> }>(await owner.request.get(`${SPA_ORIGIN}/api/me`), 200)
  const storeId = me.stores[0].storeId
  const groups = `/api/store/${storeId}/story-groups`
  const pins = `/api/store/${storeId}/pins`

  async function publishStory(title: string, slug: string, placeIds: string[] = []) {
    const group = await ok<{ id: string }>(await send(owner, 'post', groups, placeIds.length > 0 ? { placeIds } : {}), 201)
    const draft = { title, excerpt: 'Excerpt', authorName: 'Anna', coverMediaId: await readyCover(storeId), body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] }] } }
    const version = await ok<Versioned>(await send(owner, 'post', `${groups}/${group.id}/versions`, { language: 'en', slug, draft }), 201)

    await ok(await send(owner, 'post', `${groups}/${group.id}/versions/en/publish`, undefined, version.rowVersion), 200)

    return group.id
  }

  async function publishPin(name: string, extra: object, hide = false) {
    const created = await ok<Versioned>(await send(owner, 'post', pins, { title: { en: name }, latitude: 47.0517, longitude: 8.3074, ...extra }), 201)
    const live = await ok<Versioned>(await send(owner, 'post', `${pins}/${created.id}/publish`, undefined, created.rowVersion), 200)

    if (hide)
      await ok(await send(owner, 'post', `${pins}/${created.id}/hide`, undefined, live.rowVersion), 200)

    return live
  }

  const mainStory = await publishStory(stories.main, `main-story-${tag}`)
  const [cover, second, third] = [await readyCover(storeId), await readyCover(storeId), await readyCover(storeId)]
  const bridge = await publishPin(titles.bridge, {
    tip: { en: 'Walk it at sunrise.' },
    address: 'Kapellbrücke, 6004 Luzern',
    mapsLink: BRIDGE_LINK,
    weeklyHours: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, opens: '08:00', closes: '18:00' })),
    mainStoryGroupId: mainStory,
    coverMediaId: cover,
    coverAlt: { en: 'The bridge at dawn' },
    photos: [{ mediaId: second, alt: { en: 'The water tower' } }, { mediaId: third }],
  })

  await publishStory(stories.other, `other-story-${tag}`, [bridge.id])
  const plain = await publishPin(titles.plain, { tip: { en: 'Nothing else here.' }, latitude: 47.0531, longitude: 8.3101 })
  const hotel = await publishPin(titles.hotel, { outboundUrl: 'https://hotel.example.com/rooms', latitude: 47.0502, longitude: 8.3041 })
  const hidden = await publishPin(titles.hidden, {}, true)

  slugs.bridge = bridge.slug!.en!
  slugs.plain = plain.slug!.en!
  slugs.hotel = hotel.slug!.en!
  slugs.hidden = hidden.slug!.en!
})

test.afterAll(closeVisitors)

/** A guest at 375 px who opens the map, with a spy on the browser's location calls. */
async function guestAt(browser: Browser, url: string) {
  const guest = await newVisitor(browser, 'en')

  await guest.addInitScript(() => {
    const calls: string[] = []
    const spy = (name: string) => () => calls.push(name)

    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: spy('getCurrentPosition'), watchPosition: spy('watchPosition'), clearWatch: spy('clearWatch') } })
    ;(window as unknown as { __locationCalls: string[] }).__locationCalls = calls
  })
  await guest.goto(url)

  return guest
}

const card = (guest: Page, title: string) => guest.getByRole('article').filter({ has: guest.getByRole('heading', { level: 2, name: title }) })

async function showMore(guest: Page, title: string) {
  await card(guest, title).getByRole('button', { name: mapEn['map.card.more'] }).click()

  return guest.getByRole('dialog')
}

test('[E4.7][AC90] a ?place=<slug> link opens the map with that place\'s card showing and focus on its title', async ({ browser }) => {
  const guest = await guestAt(browser, `/en/map?place=${slugs.plain}`)

  await expect(guest.getByRole('heading', { level: 2, name: titles.plain })).toBeFocused({ timeout: FIRST_LOAD })
  await expect(card(guest, titles.plain).getByText('Nothing else here.')).toBeVisible()
  await expect(guest.getByText(mapEn['map.gone'])).toHaveCount(0)
  await guest.screenshot({ path: '../.factory/runs/20261029-sprint7-release1/evidence/E4.7-e2e-deeplink-card.png' })
})

test('[E4.7][AC42] a pin with a main story links to it and lists the other story, with no price', async ({ browser }) => {
  const guest = await guestAt(browser, `/en/map?place=${slugs.bridge}`)

  await expect(guest.getByRole('heading', { level: 2, name: titles.bridge })).toBeVisible({ timeout: FIRST_LOAD })
  const sheet = await showMore(guest, titles.bridge)

  await expect(sheet.getByRole('heading', { name: mapEn['map.sheet.stories'] })).toBeVisible()
  await expect(sheet.getByRole('link', { name: new RegExp(stories.main) })).toHaveAttribute('href', `/en/stories/main-story-${tag}`)
  await expect(sheet.getByRole('link', { name: new RegExp(stories.main) })).toContainText(mapEn['map.card.readStory'])
  await expect(sheet.getByRole('link', { name: new RegExp(stories.other) })).toHaveAttribute('href', `/en/stories/other-story-${tag}`)
  await expect(sheet.getByText('Walk it at sunrise.')).toBeVisible()
  await expect(sheet.getByText('08:00–18:00')).toBeVisible()
  await expect(sheet.getByText('Kapellbrücke, 6004 Luzern')).toBeVisible()
  expect((await sheet.textContent()) ?? '').not.toMatch(/CHF|price|Preis/i)
  await guest.screenshot({ path: '../.factory/runs/20261029-sprint7-release1/evidence/E4.7-e2e-sheet-stories.png' })
})

test('[E4.7][AC62] a pin with no story shows its details and no story link', async ({ browser }) => {
  const guest = await guestAt(browser, `/en/map?place=${slugs.plain}`)

  await expect(guest.getByRole('heading', { level: 2, name: titles.plain })).toBeVisible({ timeout: FIRST_LOAD })
  const sheet = await showMore(guest, titles.plain)

  await expect(sheet.getByText('Nothing else here.')).toBeVisible()
  await expect(sheet.getByRole('heading', { name: mapEn['map.sheet.stories'] })).toHaveCount(0)
  await expect(sheet.locator('a[href*="/stories/"]')).toHaveCount(0)
})

test('[E4.7][AC49] a pin with an outbound link shows it, and the sheet has no booking or payment button', async ({ browser }) => {
  const guest = await guestAt(browser, `/en/map?place=${slugs.hotel}`)

  await expect(guest.getByRole('heading', { level: 2, name: titles.hotel })).toBeVisible({ timeout: FIRST_LOAD })
  const sheet = await showMore(guest, titles.hotel)
  const link = sheet.getByRole('link', { name: /hotel\.example\.com/ })

  await expect(link).toHaveAttribute('href', 'https://hotel.example.com/rooms')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(sheet.getByRole('button', { name: /book|buy|pay|reserve|cart/i })).toHaveCount(0)
  await expect(sheet.getByRole('link', { name: /book|buy|pay|reserve|cart/i })).toHaveCount(0)
})

test('[E4.7][AC89] Open in Google Maps opens the stored link, else the position, in a new tab, and the site asks for no location', async ({ browser }) => {
  const stored = await guestAt(browser, `/en/map?place=${slugs.bridge}`)

  await expect(stored.getByRole('heading', { level: 2, name: titles.bridge })).toBeVisible({ timeout: FIRST_LOAD })
  const storedLink = card(stored, titles.bridge).getByRole('link', { name: mapEn['map.directions'] })

  // The card shows the position at once and the stored link as soon as its pin has been read.
  await expect(storedLink).toHaveAttribute('href', BRIDGE_LINK)
  await expect(storedLink).toHaveAttribute('target', '_blank')
  await expect(storedLink).toHaveAttribute('rel', /noreferrer/)
  const sheet = await showMore(stored, titles.bridge)

  await expect(sheet.getByRole('link', { name: mapEn['map.directions'] })).toHaveCount(2)
  for (const link of await sheet.getByRole('link', { name: mapEn['map.directions'] }).all())
    await expect(link).toHaveAttribute('href', BRIDGE_LINK)

  const position = await guestAt(browser, `/en/map?place=${slugs.plain}`)

  await expect(position.getByRole('heading', { level: 2, name: titles.plain })).toBeVisible({ timeout: FIRST_LOAD })
  const href = await card(position, titles.plain).getByRole('link', { name: mapEn['map.directions'] }).getAttribute('href')
  const url = new URL(href!)

  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/')
  expect([...url.searchParams.keys()].sort()).toEqual(['api', 'query'])
  expect(url.searchParams.get('query')).toBe('47.0531,8.3101')
  for (const guest of [stored, position])
    expect(await guest.evaluate(() => (window as unknown as { __locationCalls: string[] }).__locationCalls)).toEqual([])
})

test('[E4.7][AC90] a link to a hidden or unknown place opens the map normally with the notice, which closes', async ({ browser }) => {
  test.setTimeout(120_000)
  for (const slug of [slugs.hidden, `no-such-place-${tag}`]) {
    const guest = await guestAt(browser, `/en/map?place=${slug}`)

    await expect(guest.getByText(mapEn['map.gone'])).toBeVisible({ timeout: FIRST_LOAD })
    await expect(guest.getByRole('article')).toHaveCount(0)
    await expect(guest.getByRole('button', { name: mapEn['map.categories'] })).toBeVisible()
    await guest.screenshot({ path: `../.factory/runs/20261029-sprint7-release1/evidence/E4.7-e2e-gone-${slug === slugs.hidden ? 'hidden' : 'unknown'}.png` })
    await guest.getByRole('button', { name: mapEn['map.gone.close'] }).click()
    await expect(guest.getByText(mapEn['map.gone'])).toHaveCount(0)
  }
})

test('[E4.7][N03] Show more opens the sheet with a photo carousel and Previous and Next place', async ({ browser }) => {
  const guest = await guestAt(browser, `/en/map?place=${slugs.bridge}`)

  await expect(guest.getByRole('heading', { level: 2, name: titles.bridge })).toBeVisible({ timeout: FIRST_LOAD })
  // The cover shows on the card (the smallest copy), the sheet's carousel holds the three photos.
  await expect(card(guest, titles.bridge).locator('img')).toHaveAttribute('src', new RegExp(`^${MEDIA}.*/w320\\.webp$`))
  const sheet = await showMore(guest, titles.bridge)
  const gallery = sheet.getByRole('region', { name: `Photos of ${titles.bridge}` })

  await expect(gallery.locator('img')).toHaveCount(3)
  await expect(gallery.locator('img').first()).toHaveAttribute('alt', 'The bridge at dawn')
  await expect(gallery.locator('img').first()).toHaveAttribute('src', new RegExp(`^${MEDIA}.*/w640\\.webp$`))
  await expect(gallery.getByText('1 / 3')).toBeVisible()
  await gallery.getByRole('button', { name: mapEn['map.sheet.photoNext'] }).click()
  await expect(gallery.getByText('2 / 3')).toBeVisible()
  await guest.screenshot({ path: '../.factory/runs/20261029-sprint7-release1/evidence/E4.7-e2e-sheet-carousel.png' })

  // Previous and Next place follow the order of the card row (newest first, so the first pin published is last), and the sheet shows that place.
  await expect(sheet.getByRole('button', { name: mapEn['map.sheet.next'] })).toBeDisabled()
  await sheet.getByRole('button', { name: mapEn['map.sheet.previous'] }).click()
  await expect(sheet.getByRole('heading', { name: titles.bridge })).toHaveCount(0)
  await sheet.getByRole('button', { name: mapEn['map.sheet.next'] }).click()
  await expect(sheet.getByRole('heading', { name: titles.bridge })).toBeVisible()
})
