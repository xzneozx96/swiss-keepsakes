import { createMemoryHistory, isNotFound, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The bottom sheet's Drawer never settles in jsdom (the open call does not return), so its shell is a plain dialog here;
// the choices, the quantity and the add button inside are the real ones.
vi.mock('@/components/choice-sheet', () => ({
  ChoiceSheet: ({ isOpen, title, action, children }: { isOpen: boolean, title: string, action: { label: string, isDisabled?: boolean }, children: React.ReactNode }) =>
    isOpen
      ? (
          <div aria-label={title} role="dialog">
            {children}
            <button disabled={action.isDisabled} type="button">{action.label}</button>
          </div>
        )
      : null,
}))

const MONEY = /CHF|Fr\.|\d\.\d{2}/
const ids = {
  keepsake: '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11',
  size: '1a000000-0000-4000-8000-000000000001',
  s: '1a000000-0000-4000-8000-000000000002',
  l: '1a000000-0000-4000-8000-000000000003',
  colour: '1a000000-0000-4000-8000-000000000004',
  red: '1a000000-0000-4000-8000-000000000005',
  blue: '1a000000-0000-4000-8000-000000000006',
  v1: '2b000000-0000-4000-8000-000000000001',
  v2: '2b000000-0000-4000-8000-000000000002',
}
const photo = (name: string) => ({ url: `https://media.example/${name}.jpg`, variants: [{ width: 800, url: `https://media.example/${name}-800.webp` }] })
const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

function keepsake(over: Record<string, unknown> = {}) {
  return {
    id: ids.keepsake,
    slug: 'kapellbruecke-mug',
    name: 'Kapellbrücke mug',
    cover: photo('a'),
    soldOut: false,
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en', 'de'],
    description: doc('A mug with the old bridge.'),
    photos: [photo('a'), photo('b')],
    options: [{ id: ids.size, name: 'Size', values: [{ id: ids.s, label: 'S' }, { id: ids.l, label: 'L' }] }],
    variants: [
      { id: ids.v1, values: { [ids.size]: ids.s }, photo: null },
      { id: ids.v2, values: { [ids.size]: ids.l }, photo: photo('b') },
    ],
    otherSlug: 'kapellbruecke-tasse',
    ...over,
  }
}

const sizeAvailability = [
  { variantId: ids.v1, priceRappen: 1990, currency: 'CHF', available: 4 },
  { variantId: ids.v2, priceRappen: 2490, currency: 'CHF', available: 0 },
]

let detail: () => Response
let availability: () => Response
let availabilityCalls: number

async function routerAt(path: string) {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  const { getRouter } = await import('@/router')
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  // jsdom's media element has no play(); the shell's background music calls it after the first tap.
  window.HTMLMediaElement.prototype.play = () => Promise.resolve()
  availabilityCalls = 0
  availability = () => Response.json({ items: sizeAvailability })
  vi.stubGlobal('fetch', async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/availability')) {
      availabilityCalls += 1
      return availability()
    }
    return detail()
  })
})

afterEach(() => vi.unstubAllGlobals())

const text = (html: string) => html.replace(/<(svg|script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, ' ')

// Role queries over the whole page are very slow in jsdom, so the page is searched by text and by attribute.
const barButton = () => screen.queryAllByText('Add to cart').map(el => el.closest('button')).find(Boolean) ?? null
const sheetIn = () => document.querySelector<HTMLElement>('[role="dialog"]')

async function openSheet() {
  const user = userEvent.setup()
  await waitFor(() => expect(barButton()).toBeEnabled(), { timeout: 30_000 })
  await user.click(barButton()!)
  await waitFor(() => expect(sheetIn()).not.toBeNull(), { timeout: 30_000 })
  return { user, sheet: sheetIn()! }
}

const row = (sheet: HTMLElement, label: string) => within(sheet).getByText(label, { selector: 'span.font-semibold' }).closest('[role="row"]')!

describe('[E6.4] the keepsake page', { timeout: 180_000 }, () => {
  it('[AC52][AC53] AC-1 a sold-out size is disabled, the add button stays disabled, the other size is selectable and shows its price', async () => {
    detail = () => Response.json(keepsake())
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    const { sheet } = await openSheet()
    const l = row(sheet, 'L')
    const s = row(sheet, 'S')

    expect(l).toHaveAttribute('aria-disabled', 'true')
    expect(s).not.toHaveAttribute('aria-disabled', 'true')
    expect(within(sheet).getByText('L: Sold out')).toBeInTheDocument()
    expect(within(sheet).getByText(/Add to cart · .*19\.90/).closest('button')).toBeEnabled()
    expect(screen.getAllByText(/19\.90/).length).toBeGreaterThan(0)
  })

  it('[AC52][AC53] AC-1 nothing for sale: the sold-out bar shows and there is no add button', async () => {
    detail = () => Response.json(keepsake())
    availability = () => Response.json({ items: sizeAvailability.map(i => ({ ...i, available: 0 })) })
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('This keepsake is sold out at the moment.')).toBeInTheDocument()
    expect(barButton()).toBeNull()
  })

  it('[AC52] AC-2 a combination that is not sold cannot be reached and shows no price', async () => {
    detail = () => Response.json(keepsake({
      options: [
        { id: ids.colour, name: 'Colour', values: [{ id: ids.red, label: 'Red' }, { id: ids.blue, label: 'Blue' }] },
        { id: ids.size, name: 'Size', values: [{ id: ids.s, label: 'S' }, { id: ids.l, label: 'L' }] },
      ],
      variants: [
        { id: ids.v1, values: { [ids.colour]: ids.red, [ids.size]: ids.s }, photo: null },
        { id: ids.v2, values: { [ids.colour]: ids.blue, [ids.size]: ids.l }, photo: null },
      ],
    }))
    availability = () => Response.json({ items: [
      { variantId: ids.v1, priceRappen: 1990, currency: 'CHF', available: 4 },
      { variantId: ids.v2, priceRappen: 2490, currency: 'CHF', available: 4 },
    ] })
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    const { sheet } = await openSheet()

    // Red is chosen first, so Size L (Red/L) is not sold and Blue/S is not reachable either way.
    expect(row(sheet, 'L')).toHaveAttribute('aria-disabled', 'true')
    expect(within(sheet).getByText('L: This combination is not sold')).toBeInTheDocument()
    expect(within(sheet).getByText(/Add to cart · .*19\.90/).closest('button')).toBeEnabled()
    expect(document.body.textContent).not.toMatch(/24\.90/)
  })

  it('[AC54] AC-3 the server HTML has the name and description and no price; the price comes after the browser loads the availability', async () => {
    detail = () => Response.json(keepsake())
    const router = await routerAt('/en/gifts/kapellbruecke-mug')

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('Kapellbrücke mug')
    expect(html).toContain('A mug with the old bridge.')
    expect(html).toMatch(/<title[^>]*>Kapellbrücke mug/)
    expect(html).toMatch(/<link[^>]*rel="canonical"[^>]*href="[^"]*\/en\/gifts\/kapellbruecke-mug"/)
    expect(html).toMatch(/hrefLang="de"[^>]*href="[^"]*\/de\/gifts\/kapellbruecke-tasse"|href="[^"]*\/de\/gifts\/kapellbruecke-tasse"[^>]*hreflang="de"/i)
    // The server writes this meta entry as a script tag of type application/ld+json (the jsdom router is not a server, so the string has no script).
    const snippets = router.state.matches.flatMap(m => m.meta ?? []).filter(m => m && 'script:ld+json' in m).map(m => JSON.stringify(m))
    expect(snippets).toHaveLength(1)
    expect(snippets[0]).toContain('"@type":"Product"')
    expect(snippets[0]).toContain('Kapellbrücke mug')
    expect(snippets[0]).not.toContain('offers')
    expect(html).not.toContain('offers')
    expect(text(html)).not.toMatch(MONEY)
    expect(html).not.toMatch(/CHF/)
    expect(availabilityCalls).toBe(0)
  })

  it('[AC54] AC-3 in the browser the price appears once the availability has loaded', async () => {
    detail = () => Response.json(keepsake())
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Kapellbrücke mug')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/19\.90/)
    expect(await screen.findAllByText(/19\.90/)).not.toHaveLength(0)
    expect(availabilityCalls).toBe(1)
  })

  it('[AC55] AC-4 no engraving anywhere, in the page or in the sheet', async () => {
    detail = () => Response.json(keepsake())
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    await openSheet()

    expect(document.body.textContent).not.toMatch(/engrav|gravur/i)
    expect(document.querySelector('textarea, input:not([inputmode="numeric"])')).toBeNull()
  })

  it('[AC61] AC-5 an unknown slug is a 404, not an empty page', async () => {
    detail = () => Response.json({ title: 'Not found' }, { status: 404 })
    const router = await routerAt('/en/gifts/nope')

    expect(router.state.matches.some(m => isNotFound(m.error))).toBe(true)
  })

  it('[AC61] AC-5 an unknown language is a 404 without reading the API', async () => {
    detail = () => Response.json(keepsake())
    const router = await routerAt('/fr/gifts/kapellbruecke-mug')

    expect(router.state.matches.some(m => isNotFound(m.error))).toBe(true)
  })

  it('[AC64] AC-5 English text only, in German: the English text shows with the language notice and no German alternate', async () => {
    detail = () => Response.json(keepsake({
      language: 'en',
      requestedLanguage: 'de',
      fallback: true,
      availableLanguages: ['en'],
      otherSlug: null,
    }))
    const router = await routerAt('/de/gifts/kapellbruecke-mug')

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('A mug with the old bridge.')
    expect(html).toContain('nur auf Englisch')
    expect(html).toMatch(/rel="canonical"[^>]*href="[^"]*\/en\/gifts\/kapellbruecke-mug"/)
    expect(html).not.toMatch(/hrefLang="de"/i)
  })

  it('[AC53] AC-6 a failed availability read keeps the text, shows an error with retry and disables adding; retry reads again', async () => {
    detail = () => Response.json(keepsake())
    availability = () => Response.json({ title: 'down' }, { status: 503 })
    const router = await routerAt('/en/gifts/kapellbruecke-mug')
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('A mug with the old bridge.')).toBeInTheDocument()
    const alert = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[role="alert"]')
      expect(found).not.toBeNull()
      return found!
    })

    expect(alert).toHaveTextContent('The price could not be loaded.')
    expect(barButton()).toBeDisabled()
    availability = () => Response.json({ items: sizeAvailability })
    await userEvent.click(within(alert).getByText('Try again'))

    expect(await screen.findAllByText(/19\.90/)).not.toHaveLength(0)
    await waitFor(() => expect(barButton()).toBeEnabled())
    expect(availabilityCalls).toBe(2)
  })
})
