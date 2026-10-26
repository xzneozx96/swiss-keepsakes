import { expect, test } from '@playwright/test'

/** Public pages the server renders. `text` is real visible text that must be in the first HTML. */
const PUBLIC_ROUTES: { path: string, text: string }[] = [
  { path: '/', text: 'Come and see it for yourself' },
]

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
    await page.waitForLoadState('networkidle')

    const clientText = (await page.locator('main').first().textContent()) ?? ''

    expect(serverText).not.toBe('')
    expect(clientText).toBe(serverText)
    expect(problems).toEqual([])
  })

  test(`[E3.3][AC-1] ${path} shows the server text in a browser on another time zone and locale`, async ({ browser, request }) => {
    const context = await browser.newContext({ timezoneId: 'Pacific/Auckland', locale: 'de-CH' })
    const page = await context.newPage()
    const problems: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`${message.type()}: ${message.text()}`)
    })
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

    const serverText = mainText(await (await request.get(path)).text())

    await page.goto(path)
    await page.waitForLoadState('networkidle')

    expect((await page.locator('main').first().textContent()) ?? '').toBe(serverText)
    expect(problems).toEqual([])
    await context.close()
  })
}
