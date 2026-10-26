import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Public pages the server renders. `text` is real visible text that must be in the first HTML. */
const PUBLIC_ROUTES: { path: string, text: string }[] = [
  { path: '/', text: 'Come and see it for yourself' },
]

/** Waits until React owns the page. The server HTML looks the same before the bundle runs, so text alone proves nothing. */
async function waitForHydration(page: Page) {
  // React puts `__reactProps$...` on every DOM node it hydrated.
  await page.waitForFunction(() => Object.keys(document.querySelector('nav a') ?? {}).some(key => key.startsWith('__reactProps')))
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

for (const { path, text } of PUBLIC_ROUTES) {
  test(`[E3.3][AC-1] ${path} server HTML has its text`, async ({ request }) => {
    const response = await request.get(path)
    const html = await response.text()

    expect(response.status()).toBe(200)
    expect(mainText(html)).toContain(text)
  })

  test(`[E3.3][AC-1] ${path} hydrates with no hydration or console error`, async ({ page, request }) => {
    const problems: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`${message.type()}: ${message.text()}`)
    })
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

    const serverText = mainText(await (await request.get(path)).text())

    await page.goto(path)
    await waitForHydration(page)

    expect(serverText).not.toBe('')
    // Not `networkidle`: the background track keeps a request open. A mismatch also shows up as a console error below.
    await expect.poll(async () => (await page.locator('main').first().textContent()) ?? '').toBe(serverText)
    expect(problems).toEqual([])
  })

  test(`[E3.3][AC-1] ${path} shows the server text in a browser on another time zone and locale`, async ({ browser, request }) => {
    // One zone ahead of the server's and one behind it, so a local-time date reading differs either way.
    for (const timezoneId of ['Pacific/Auckland', 'Pacific/Honolulu']) {
      const context = await browser.newContext({ timezoneId, locale: 'de-CH' })
      const page = await context.newPage()
      const problems: string[] = []

      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning')
          problems.push(`${message.type()}: ${message.text()}`)
      })
      page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

      const serverText = mainText(await (await request.get(path)).text())

      await page.goto(path)
      await waitForHydration(page)

      await expect.poll(async () => (await page.locator('main').first().textContent()) ?? '').toBe(serverText)
      expect(problems).toEqual([])
      await context.close()
    }
  })
}

test('[E3.3][AC-1] a hard load of / has no skeleton in its first HTML, a client move to / still shows one', async ({ page, request }) => {
  const html = await (await request.get('/')).text()

  expect(html).not.toContain('skeleton')

  // /tours has no server HTML; this is a client-side move to the home page.
  await page.goto('/tours')
  await waitForHydration(page)
  await page.locator('nav a[href="/"]').first().click()
  await expect(page.locator('.skeleton').first()).toBeVisible()
  await expect(page.getByText('Come and see it for yourself')).toBeVisible()
  await expect(page.locator('.skeleton')).toHaveCount(0)
})
