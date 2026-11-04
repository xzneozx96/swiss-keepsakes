import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The bottom sheet's Drawer never settles in jsdom, so its shell is a plain dialog with a close button; the choices, the
// pickup place and date and the add button inside are the real ones.
vi.mock('@/components/choice-sheet', () => ({
  ChoiceSheet: ({ isOpen, title, action, children, onOpenChange }: { isOpen: boolean, title: string, action: { label: string, isDisabled?: boolean, onPress?: (e: unknown) => void }, children: React.ReactNode, onOpenChange: (open: boolean) => void }) =>
    isOpen
      ? (
          <div aria-label={title} role="dialog">
            {children}
            <button disabled={action.isDisabled} type="button" onClick={e => action.onPress?.(e)}>{action.label}</button>
            <button type="button" onClick={() => onOpenChange(false)}>Close sheet</button>
          </div>
        )
      : null,
}))

const ids = {
  keepsake: '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11',
  variant: '2b000000-0000-4000-8000-000000000001',
  a: '3c000000-0000-4000-8000-00000000000a',
  b: '3c000000-0000-4000-8000-00000000000b',
  c: '3c000000-0000-4000-8000-00000000000c',
}
const photo = (name: string) => ({ url: `https://media.example/${name}.jpg`, variants: [{ width: 800, url: `https://media.example/${name}-800.webp` }] })
const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
function keepsake() {
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
    photos: [photo('a')],
    options: [],
    variants: [{ id: ids.variant, values: {}, photo: null }],
    otherSlug: null,
  }
}

const span = (weekday: number, opens: string, closes: string) => ({ weekday, opens, closes })
function point(id: string, name: string, hours: ReturnType<typeof span>[], over: Record<string, unknown> = {}) {
  return {
    id,
    name,
    address: `${name} street 1, 6003 Luzern`,
    instructions: null,
    mapsUrl: `https://maps.google.com/?q=${name.replace(/ /g, '+')}`,
    hours,
    ...over,
  }
}
const monTue = [span(1, '09:00', '17:00'), span(2, '09:00', '17:00')]
const tueOnly = [span(2, '09:00', '17:00')]
const everyDay = [1, 2, 3, 4, 5, 6, 7].map(day => span(day, '09:00', '17:00'))

let pickups: () => Response | Promise<Response>
let log: { method: string, url: string, body: string }[]

async function routerAt(path: string) {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  const { getRouter } = await import('@/router')
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

// Tuesday 3 November 2026, 10:00 in Zurich (winter time). Only the date is faked, so waiting and typing keep working.
function at(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.HTMLMediaElement.prototype.play = () => Promise.resolve()
  log = []
  pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue)] })
  at('2026-11-03T10:00:00+01:00')
  vi.stubGlobal('fetch', async (input: Request) => {
    const url = new URL(input.url)
    log.push({ method: input.method, url: input.url, body: await input.clone().text() })
    if (url.pathname.endsWith('/availability'))
      return Response.json({ items: [{ variantId: ids.variant, priceRappen: 1990, currency: 'CHF', available: 4 }] })
    if (url.pathname.endsWith('/pickup-points'))
      return pickups()
    return Response.json(keepsake())
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const barButton = () => screen.queryAllByText('Add to cart').map(el => el.closest('button')).find(Boolean) ?? null
const sheetIn = () => document.querySelector<HTMLElement>('[role="dialog"]')
const cell = (day: string) => document.querySelector<HTMLElement>(`[data-date="${day}"]`)
const foldOut = (title: string) => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes(title) && b.getAttribute('aria-expanded') !== null)!

async function openPage() {
  const router = await routerAt('/en/gifts/kapellbruecke-mug')
  render(<RouterProvider router={router} />)
  await waitFor(() => expect(barButton()).toBeEnabled(), { timeout: 30_000 })
}

async function openSheet() {
  const user = userEvent.setup()
  await openPage()
  await user.click(barButton()!)
  await waitFor(() => expect(sheetIn()).not.toBeNull(), { timeout: 30_000 })
  return { user, sheet: sheetIn()! }
}

describe('[E6.4][AC26] pickup place and date in the keepsake sheet', { timeout: 180_000 }, () => {
  it('[AC26] AC-3 only the days the point is open can be picked; a closed day explains itself', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue)] })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(cell('2026-11-09')).not.toBeNull())
    expect(cell('2026-11-09')).not.toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-10')).not.toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-11')).toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-14')).toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-02')).toHaveAttribute('data-disabled', 'true')
    await user.click(cell('2026-11-11')!)

    expect(within(sheet).getByRole('alert')).toHaveTextContent('The pickup point is closed that day. Choose another day.')
    expect(within(sheet).queryByText(/preparing|Needs \d/)).toBeNull()
  })

  it('[AC26] AC-4 a span past midnight belongs to its first day: Friday is open, Saturday is not', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Night kiosk', [span(5, '22:00', '02:00')])] })
    await openSheet()

    await waitFor(() => expect(cell('2026-11-06')).not.toBeNull())
    expect(cell('2026-11-06')).not.toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-07')).toHaveAttribute('data-unavailable', 'true')
  })

  it('[AC26] AC-5 after closing the earliest day is tomorrow; before closing it is today', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', everyDay)] })
    at('2026-11-03T18:30:00+01:00')
    const evening = await openSheet()

    await waitFor(() => expect(within(evening.sheet).getByText('Earliest Wed 4 Nov')).toBeInTheDocument())
    expect(cell('2026-11-03')).toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-04')).not.toHaveAttribute('data-unavailable', 'true')
  })

  it('[AC26] AC-5 before closing, today is the earliest day', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', everyDay)] })
    const { sheet } = await openSheet()

    await waitFor(() => expect(within(sheet).getByText('Earliest Tue 3 Nov')).toBeInTheDocument())
    expect(cell('2026-11-03')).not.toHaveAttribute('data-unavailable', 'true')
  })

  it('[AC26] a single point is chosen already; with several none is, and the calendar waits for a place', async () => {
    const one = await openSheet()

    await waitFor(() => expect(one.sheet.querySelector<HTMLInputElement>('input[type="radio"]')).toBeChecked())
    expect(one.sheet.querySelector('#gift-date')).not.toBeNull()
  })

  it('[AC26] with several points no place is chosen and no calendar shows until one is', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue), point(ids.b, 'Old town shop', tueOnly)] })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(within(sheet).getByText('Old town shop')).toBeInTheDocument())
    expect(sheet.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0)
    expect(sheet.querySelector('#gift-date')).toBeNull()
    await user.click(within(sheet).getByText('Station kiosk'))
    await waitFor(() => expect(sheet.querySelector('#gift-date')).not.toBeNull())
  })

  it('[AC26] AC-6 changing to a point that is closed that day clears the date; to one that is open keeps it', async () => {
    pickups = () => Response.json({ items: [
      point(ids.a, 'Station kiosk', monTue),
      point(ids.b, 'Old town shop', tueOnly),
      point(ids.c, 'Lake kiosk', [span(1, '10:00', '12:00')]),
    ] })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(within(sheet).getByText('Lake kiosk')).toBeInTheDocument())
    await user.click(within(sheet).getByText('Station kiosk'))
    await waitFor(() => expect(cell('2026-11-09')).not.toBeNull())
    await user.click(cell('2026-11-09')!)
    expect(cell('2026-11-09')).toHaveAttribute('data-selected', 'true')

    await user.click(within(sheet).getByText('Old town shop'))
    await waitFor(() => expect(cell('2026-11-09')).not.toHaveAttribute('data-selected', 'true'))
    expect(cell('2026-11-09')).toHaveAttribute('data-unavailable', 'true')
    await user.click(foldOut('Pickup date'))
    expect(screen.queryByText(/Mon 9 Nov/)).toBeNull()
    expect(screen.getAllByText('Choose a date and place').length).toBeGreaterThan(0)

    await user.click(within(sheet).getByText('Station kiosk'))
    await waitFor(() => expect(cell('2026-11-09')).not.toBeNull())
    await user.click(cell('2026-11-09')!)
    await user.click(within(sheet).getByText('Lake kiosk'))
    await waitFor(() => expect(cell('2026-11-09')).toHaveAttribute('data-selected', 'true'))
  })

  it('[AC26] AC-7 a store with no points: no place or date choice, and the fold-outs say so', async () => {
    pickups = () => Response.json({ items: [] })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(sheet.querySelector('[data-skeleton="pickup"]')).toBeNull())
    expect(sheet.querySelector('#gift-place')).toBeNull()
    expect(sheet.querySelector('#gift-date')).toBeNull()
    await user.click(within(sheet).getByText('Close sheet'))
    await user.click(foldOut('Where you’ll pick it up'))
    await user.click(foldOut('Pickup date'))

    expect(screen.getAllByText('The shop has not set pickup points yet.').length).toBeGreaterThanOrEqual(2)
  })

  it('[AC26] AC-7 a failed read: an error with retry in the pickup area, the rest of the sheet works, adding is not blocked; retry reads again', async () => {
    pickups = () => Response.json({ title: 'down' }, { status: 503 })
    const { user, sheet } = await openSheet()

    const alert = await waitFor(() => {
      const found = sheet.querySelector<HTMLElement>('[role="alert"]')
      expect(found).not.toBeNull()
      return found!
    })

    expect(alert).toHaveTextContent('The pickup places could not be loaded.')
    expect(within(sheet).getByText('Quantity')).toBeInTheDocument()
    expect(within(sheet).getByText(/Add to cart · .*19\.90/).closest('button')).toBeEnabled()
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue)] })
    await user.click(within(alert).getByText('Try again'))

    await waitFor(() => expect(sheet.querySelector('#gift-date')).not.toBeNull())
    expect(log.filter(r => r.url.includes('/pickup-points'))).toHaveLength(2)
  })

  it('[AC26] while the points load the pickup area is a skeleton of the place rows', async () => {
    pickups = () => new Promise<Response>(() => {})
    const { sheet } = await openSheet()

    expect(sheet.querySelector('[data-skeleton="pickup"]')).not.toBeNull()
    expect(within(sheet).getByText('Quantity')).toBeInTheDocument()
  })

  it('[AC26] the fold-out lists the points with address, hours, instructions and a directions link; the highlight names them', async () => {
    pickups = () => Response.json({ items: [
      point(ids.a, 'Station kiosk', monTue, { instructions: 'Ask at the counter' }),
      point(ids.b, 'Old town shop', tueOnly),
    ] })
    const { user } = await openPage().then(() => ({ user: userEvent.setup() }))

    await waitFor(() => expect(screen.getByText('Station kiosk or Old town shop')).toBeInTheDocument())
    await user.click(foldOut('Where you’ll pick it up'))

    expect(screen.getByText('Station kiosk street 1, 6003 Luzern')).toBeInTheDocument()
    expect(screen.getByText('Ask at the counter')).toBeInTheDocument()
    expect(screen.getByText('Mon–Tue 09:00–17:00')).toBeInTheDocument()
    const links = screen.getAllByText('Get directions').map(el => el.closest('a'))

    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://maps.google.com/?q=Station+kiosk')
  })

  it('[AC26] AC-8 the choice is held when the sheet closes and shows again; nothing but reads is sent', async () => {
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(cell('2026-11-09')).not.toBeNull())
    await user.click(cell('2026-11-09')!)
    await user.click(within(sheet).getByText('Close sheet'))
    expect(sheetIn()).toBeNull()
    await user.click(barButton()!)
    await waitFor(() => expect(sheetIn()).not.toBeNull())

    expect(cell('2026-11-09')).toHaveAttribute('data-selected', 'true')
    expect(sheetIn()!.querySelector<HTMLInputElement>('input[type="radio"]')).toBeChecked()
    await user.click(within(sheetIn()!).getByText('Close sheet'))
    await user.click(foldOut('Pickup date'))
    // The bar and the fold-out row both show it.
    expect(screen.getAllByText('Mon 9 Nov · Station kiosk')).toHaveLength(2)

    // Add to cart is a placeholder: pressing it sends nothing either.
    await user.click(barButton()!)
    await user.click(within(sheetIn()!).getByText(/Add to cart · /))
    await act(async () => {})

    expect(log.length).toBeGreaterThan(0)
    expect(log.every(r => r.method === 'GET' && r.body === '')).toBe(true)
    // The only pickup request is the read by slug: its query is the language and nothing the guest chose.
    const reads = log.filter(r => r.url.includes('/pickup-points'))

    expect(reads.length).toBeGreaterThan(0)
    expect(reads.every(r => [...new URL(r.url).searchParams.keys()].join() === 'lang')).toBe(true)
    expect(log.every(r => new URL(r.url).pathname.startsWith('/api/public/keepsakes/'))).toBe(true)
  })

  it('[AC26] the bar shows the chosen day and place, or asks for them; no points keeps the checkout line', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue), point(ids.b, 'Old town shop', tueOnly)] })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(within(sheet).getByText('Old town shop')).toBeInTheDocument())
    expect(screen.queryByText('Chosen at checkout')).toBeNull()
    expect(screen.getAllByText('Choose a date and place').length).toBeGreaterThan(0)
    await user.click(within(sheet).getByText('Station kiosk'))
    await waitFor(() => expect(cell('2026-11-09')).not.toBeNull())
    await user.click(cell('2026-11-09')!)

    expect(screen.getAllByText('Mon 9 Nov · Station kiosk').length).toBeGreaterThan(0)
  })

  it('[AC26] while the points load the highlight and the places fold-out show a skeleton, never the old checkout line', async () => {
    pickups = () => new Promise<Response>(() => {})
    const { user, sheet } = await openSheet()

    await user.click(within(sheet).getByText('Close sheet'))
    await user.click(foldOut('Where you’ll pick it up'))

    expect(document.querySelector('[data-skeleton="pickup-line"]')).not.toBeNull()
    expect(document.querySelectorAll('[data-skeleton="pickup"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Chosen at checkout')).toBeNull()
    expect(screen.queryByText('Guests choose the pickup place and date at checkout.')).toBeNull()
  })

  it('[AC26] a failed read shows the error with retry in the places fold-out too; retry brings the places', async () => {
    pickups = () => Response.json({ title: 'down' }, { status: 503 })
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(sheet.querySelector('[role="alert"]')).not.toBeNull())
    await user.click(within(sheet).getByText('Close sheet'))
    await user.click(foldOut('Where you’ll pick it up'))
    const alerts = screen.getAllByText('The pickup places could not be loaded.')

    expect(alerts.length).toBeGreaterThan(0)
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', monTue)] })
    await user.click(alerts[0]!.closest('[role="alert"]')!.querySelector('button')!)

    await waitFor(() => expect(screen.getByText('Station kiosk street 1, 6003 Luzern')).toBeInTheDocument())
  })

  it('[AC26] today after closing says the opening hours are over, not that the point is closed that day', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Station kiosk', everyDay)] })
    at('2026-11-03T18:30:00+01:00')
    const { user, sheet } = await openSheet()

    await waitFor(() => expect(cell('2026-11-03')).not.toBeNull())
    await user.click(cell('2026-11-03')!)

    expect(within(sheet).getByRole('alert')).toHaveTextContent('Today’s opening hours are over. Choose another day.')
  })

  it('[AC26] a field the API adds later does not fail the pickup area', async () => {
    pickups = () => Response.json({ items: [{ ...point(ids.a, 'Station kiosk', monTue.map(s => ({ ...s, note: 'x' }))), futureField: 1 }], extra: true })
    const { sheet } = await openSheet()

    await waitFor(() => expect(sheet.querySelector('#gift-date')).not.toBeNull())
    expect(sheet.querySelector('[role="alert"]')).toBeNull()
  })

  it('[AC26] a Sunday span (weekday 7) makes the Sundays pickable', async () => {
    pickups = () => Response.json({ items: [point(ids.a, 'Sunday kiosk', [span(7, '10:00', '14:00')])] })
    await openSheet()

    await waitFor(() => expect(cell('2026-11-08')).not.toBeNull())
    expect(cell('2026-11-08')).not.toHaveAttribute('data-unavailable', 'true')
    expect(cell('2026-11-09')).toHaveAttribute('data-unavailable', 'true')
  })
})
