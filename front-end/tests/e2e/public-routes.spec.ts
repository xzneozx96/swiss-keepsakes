import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Public pages the server renders. `text` is real visible text that must be in the first HTML. */
const PUBLIC_ROUTES: { path: string, text: string }[] = [
  { path: '/', text: 'Come and see it for yourself' },
  { path: '/stories', text: 'A morning on the Musegg wall' },
  { path: '/stories/musegg-morning', text: 'Climb the old town wall before the city wakes up' },
  { path: '/credits', text: 'Photo credits' },
]

/**
 * Waits until React has committed the hydrated page. The root layout sets `data-hydrated` from an effect, which
 * runs after the root commit; `__reactFiber` on every element of `<main>` (icon paths are set as markup, so not those) shows the routed content (loaded lazily,
 * so it hydrates later than the root) is hydrated or client-rendered too. Neither signal alone is enough.
 */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() =>
    document.documentElement.dataset.hydrated === 'true'
    && [...document.querySelectorAll('main *:not(svg *)')].every(element => Object.keys(element).some(key => key.startsWith('__reactFiber'))),
  )
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' }

/** The visible text of the first `<main>` in the HTML, with entities decoded as the browser does. */
function mainText(html: string) {
  const inner = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? ''

  return inner
    .replaceAll(/<!--.*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, '')
    .replaceAll(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (whole, hex, dec, name) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : ENTITIES[name.toLowerCase()] ?? whole)
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
    // Scoped to the page text: the document itself carries `skeleton` in CSS and scripts.
    expect(mainText(html)).not.toContain('skeleton')
    expect(/<main\b[^>]*>[\s\S]*?<\/main>/.exec(html)?.[0] ?? '').not.toMatch(/class="[^"]*\bskeleton\b/)
  })

  test(`[E3.3][AC-1] ${path} hydrates with no hydration or console error`, async ({ page, request }) => {
    const problems = collectProblems(page)
    const serverText = mainText(await (await request.get(path)).text())

    await page.goto(path)
    await waitForHydration(page)

    expect(serverText).not.toBe('')
    // One read after the commit: the hydrated page must already show the server text. A mismatch also shows up as a console error.
    expect((await page.locator('main').first().textContent()) ?? '').toBe(serverText)
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

        expect((await page.locator('main').first().textContent()) ?? '').toBe(serverText)
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

  // /tours has no server HTML; this is a client-side move to the home page.
  await page.goto('/tours')
  await waitForHydration(page)
  await page.locator('nav a[href="/"]').first().click()
  await expect(page.locator('.skeleton').first()).toBeVisible()
  await expect(page.getByText('Come and see it for yourself')).toBeVisible()
  await expect(page.locator('.skeleton')).toHaveCount(0)
})
