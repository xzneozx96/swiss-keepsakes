import { toast } from '@heroui/react'
import { pickupPlaceListSchema, pickupPlaceSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/contexts/locale-context'

import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { PickupPage } from '@/features/merchant/products/components/pickup-page'
import { expectListChrome } from './list-screens-helper'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

// jsdom has no CSS.supports, which the auto-growing text area calls on load.
vi.hoisted(() => {
  const css = (globalThis as unknown as { CSS?: { supports?: () => boolean } }).CSS

  if (css)
    css.supports ??= () => false
  else
    Object.defineProperty(globalThis, 'CSS', { value: { supports: () => false }, configurable: true })
})

interface Call { method: string, path: string, ifMatch: string | null, key: string | null }

const storeId = '0198a000-0000-7000-8000-000000000001'
const base = `/api/store/${storeId}/pickup-places`

let calls: Call[]
let active: ReturnType<typeof point>[]
let archivedPoints: ReturnType<typeof point>[]
let hold: Promise<void> | undefined
let failNext: boolean
let refuseRestoreAtLimit: boolean

function point(n: number, over: Record<string, unknown> = {}) {
  return pickupPlaceSchema.parse({
    id: `0198a000-0000-7000-8000-0000000000d${n}`,
    storeId,
    name: { en: `Point ${n}`, de: `Stelle ${n}` },
    address: { en: `Street ${n}`, de: `Strasse ${n}` },
    instructions: null,
    position: n,
    archived: false,
    hours: [1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, opens: '10:00', closes: '18:00' })),
    rowVersion: n + 2,
    ...over,
  })
}

const writes = () => calls.filter(call => call.method !== 'GET')

beforeEach(async () => {
  window.scrollTo = vi.fn()
  window.history.pushState({}, '', '/store/products/pickup')
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  active = []
  archivedPoints = []
  hold = undefined
  failNext = false
  refuseRestoreAtLimit = false
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    const call: Call = { method: request.method, path: url.pathname + url.search, ifMatch: request.headers.get('if-match'), key: request.headers.get('idempotency-key') }

    calls.push(call)
    if (url.pathname === '/api/me')
      return Response.json({ guestId: storeId, stores: [{ storeId, role: 'owner', status: 'live' }] })
    await hold
    if (call.method === 'GET' && url.pathname === base)
      return Response.json(pickupPlaceListSchema.parse({ items: url.searchParams.get('archived') === 'true' ? archivedPoints : active }))
    const [, id, action] = url.pathname.replace(`${base}/`, '').match(/^([^/]+)\/(archive|restore)$/) ?? []

    if (action === 'archive') {
      const found = active.find(p => p.id === id)!

      active = active.filter(p => p.id !== id)
      archivedPoints = [...archivedPoints, { ...found, archived: true }]

      return Response.json({ ...found, archived: true })
    }
    if (action === 'restore' && refuseRestoreAtLimit) {
      return Response.json({
        type: 'validation-failed',
        status: 422,
        title: 'This shop has the most active pickup points it can hold.',
        errors: [{ in: 'body', path: 'name', message: 'A shop can have at most 100 active pickup points. Archive one first', code: 'pickup-limit' }],
      }, { status: 422, headers: { 'content-type': 'application/problem+json' } })
    }
    if (action === 'restore' && failNext) {
      failNext = false

      return Response.json({ type: 'unavailable', status: 503 }, { status: 503, headers: { 'content-type': 'application/problem+json' } })
    }
    if (action === 'restore') {
      const found = archivedPoints.find(p => p.id === id)!

      archivedPoints = archivedPoints.filter(p => p.id !== id)
      active = [...active, { ...found, archived: false }]

      return Response.json({ ...found, archived: false })
    }

    return Response.json({ code: 'not-found' }, { status: 404 })
  })
})

async function renderTab() {
  const demo = startDemo()

  await demo.ready
  const root = createRootRoute({ component: Outlet })
  const routes = ['/store/products', '/store/products/tours', '/store/products/pickup'].map(path =>
    createRoute({ getParentRoute: () => root, path, component: PickupPage }),
  )
  const router = createRouter({ routeTree: root.addChildren(routes), history: createMemoryHistory({ initialEntries: ['/store/products/pickup'] }), disableGlobalCatchBoundary: true })

  return render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={demo.feedback} />
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const ticket = async (name: string) => (await screen.findByText(name)).closest('article')!

describe('[E6.6][AC26] M14 the Pickup points page on the API', { timeout: 30_000 }, () => {
  it('shows the empty state when the store has no points', async () => {
    await renderTab()

    expect(await screen.findByText('No pickup points yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add pickup point' })).toBeInTheDocument()
  })

  it('is a page of its own: a Pickup points heading and description, no Keepsakes or Tours tabs', async () => {
    await renderTab()

    expect(await screen.findByRole('heading', { level: 1, name: 'Pickup points' })).toBeInTheDocument()
    expect(screen.getByText('Where guests collect their orders and where handovers meet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Products' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Keepsakes|Tours/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Status/ })).toBeInTheDocument()
  })

  it('shows a skeleton that mirrors the tickets while the list loads', async () => {
    let release: () => void = () => {}

    hold = new Promise((resolve) => {
      release = resolve
    })
    active = [point(1)]
    const { container } = await renderTab()

    await waitFor(() => expect(container.querySelectorAll('[data-slot="skeleton"], .skeleton').length).toBeGreaterThan(0))
    release()
    expect(await screen.findByText('Point 1')).toBeInTheDocument()
  })

  it('lists the points in order with name, address, hours line and instructions', async () => {
    active = [
      point(1, { instructions: { en: 'Ring the bell' } }),
      point(2, { hours: [{ weekday: 1, opens: '09:00', closes: '12:00' }, { weekday: 1, opens: '14:00', closes: '18:00' }] }),
      point(3, { hours: [] }),
    ]
    await renderTab()

    const first = await ticket('Point 1')

    expect(within(first).getByText('Street 1')).toBeInTheDocument()
    expect(within(first).getByText('Mon to Sat 10:00 to 18:00')).toBeInTheDocument()
    expect(within(first).getByText('Ring the bell')).toBeInTheDocument()
    expect(within(await ticket('Point 2')).getByText('Mon 09:00 to 12:00, 14:00 to 18:00')).toBeInTheDocument()
    expect(within(await ticket('Point 3')).getByText('No opening hours set')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Point 1', 'Point 2', 'Point 3'])
  })

  it('a german-only point shows the missing-English chip, not an error', async () => {
    active = [point(1, { name: { de: 'Laden' }, address: { de: 'Luzern' } })]
    await renderTab()

    const card = await ticket('Laden')

    expect(within(card).getByText('EN missing')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('add pickup point opens an empty sheet; a ticket opens the sheet filled', async () => {
    active = [point(1)]
    await renderTab()
    await screen.findByText('Point 1')

    await userEvent.click(screen.getByRole('button', { name: 'Add pickup point' }))
    expect(await screen.findByLabelText('Name')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
    await waitFor(() => expect(screen.queryByLabelText('Name')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Edit Point 1' }))
    expect(await screen.findByLabelText('Name')).toHaveValue('Point 1')
  })

  it('archive asks first, sends the row version, and the ticket leaves; the last one shows the empty state', async () => {
    active = [point(1)]
    await renderTab()
    await screen.findByText('Point 1')

    await userEvent.click(screen.getByRole('button', { name: 'Archive Point 1' }))
    expect(writes()).toHaveLength(0)
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/0198a000-0000-7000-8000-0000000000d1/archive`, ifMatch: '3' })
    expect(await screen.findByText('No pickup points yet.')).toBeInTheDocument()
  })

  it('the archived list shows Restore, not an edit button, and Restore sends the row version', async () => {
    archivedPoints = [point(1, { archived: true })]
    await renderTab()
    await screen.findByText('No pickup points yet.')

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    await userEvent.keyboard('{Escape}')
    const card = await ticket('Point 1')

    expect(screen.queryByRole('button', { name: 'Edit Point 1' })).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Restore Point 1' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/0198a000-0000-7000-8000-0000000000d1/restore`, ifMatch: '3' })
    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
  })

  it('a Restore refused at 100 active points (422 pickup-limit) toasts the reason, not the generic failure', async () => {
    const danger = vi.spyOn(toast, 'danger')

    archivedPoints = [point(1, { archived: true })]
    refuseRestoreAtLimit = true
    await renderTab()
    await screen.findByText('No pickup points yet.')

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(await ticket('Point 1')).getByRole('button', { name: 'Restore Point 1' }))

    await waitFor(() => expect(danger).toHaveBeenCalledWith('100 active pickup points. Archive one first.'))
    expect(danger).toHaveBeenCalledTimes(1)
  })

  it('two quick presses on Restore send one request', async () => {
    archivedPoints = [point(1, { archived: true })]
    await renderTab()
    await screen.findByText('No pickup points yet.')

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    await userEvent.keyboard('{Escape}')
    const card = await ticket('Point 1')
    let release: () => void = () => {}

    hold = new Promise((resolve) => {
      release = resolve
    })
    const restore = within(card).getByRole('button', { name: 'Restore Point 1' })

    await userEvent.click(restore)
    await userEvent.click(restore)
    release()

    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(1)
  })

  it('a retry of Restore after a lost answer sends the same Idempotency-Key', async () => {
    archivedPoints = [point(1, { archived: true })]
    failNext = true
    await renderTab()
    await screen.findByText('No pickup points yet.')

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    await userEvent.keyboard('{Escape}')
    const restore = within(await ticket('Point 1')).getByRole('button', { name: 'Restore Point 1' })

    await userEvent.click(restore)
    await waitFor(() => expect(writes()).toHaveLength(1))
    await userEvent.click(restore)
    await waitFor(() => expect(writes()).toHaveLength(2))

    expect(writes()[0]!.key).toBeTruthy()
    expect(writes()[1]!.key).toBe(writes()[0]!.key)
  })
})

describe('[S8-UI-01] the pickup points page uses the shared list header and starts with no status ticked', () => {
  it('[S8-UI-01] Add pickup point has the Media button style and the Status filter sits in the toolbar', async () => {
    active = [point(1)]
    await renderTab()

    await screen.findByText('Point 1')
    expectListChrome({ action: screen.getByRole('button', { name: 'Add pickup point' }), start: screen.getByRole('button', { name: /^Status/ }) })
  })

  it('[S8-UI-01] shows no Status chip on load, lists the active points and hides the archived ones until Archived is ticked', async () => {
    active = [point(1)]
    archivedPoints = [point(2, { archived: true })]
    await renderTab()

    await screen.findByText('Point 1')
    expect(screen.queryByRole('button', { name: /^Remove filter/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    expect(await screen.findByText('Point 2')).toBeInTheDocument()
    expect(screen.queryByText('Point 1')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: /Active/ }))
    expect(await screen.findByText('Point 1')).toBeInTheDocument()
    expect(screen.getByText('Point 2')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(screen.queryByText('Point 2')).not.toBeInTheDocument())
    expect(screen.getByText('Point 1')).toBeInTheDocument()
  })
})

describe('[S8-UI-01] the pickup points search', () => {
  it('[S8-UI-01] typing filters the tickets by name in either language and by address, with the Status filter', async () => {
    active = [point(1, { name: { en: 'Station kiosk' }, address: { en: 'Bahnhofstrasse 1' } }), point(2, { name: { de: 'Hotel Alpina' }, address: { de: 'Seeweg 5' } })]
    archivedPoints = [point(3, { archived: true, name: { en: 'Old kiosk' } })]
    await renderTab()

    const search = await screen.findByRole('searchbox', { name: 'Search by name or address' })

    await screen.findByText('Station kiosk')
    await userEvent.type(search, ' ALPINA ')
    expect(screen.queryByText('Station kiosk')).not.toBeInTheDocument()
    expect(screen.getByText('Hotel Alpina')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'bahnhof')
    expect(screen.getByText('Station kiosk')).toBeInTheDocument()
    expect(screen.queryByText('Hotel Alpina')).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'kiosk')
    expect(screen.queryByText('Old kiosk')).not.toBeInTheDocument()
  })

  it('[S8-UI-01] a query with no match shows the no-match state, and its button clears the search and the filters', async () => {
    active = [point(1)]
    await renderTab()

    await screen.findByText('Point 1')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name or address' }), 'zzz')
    expect(await screen.findByText('No pickup point matches. Try another word or remove a filter.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(await screen.findByText('Point 1')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search by name or address' })).toHaveValue('')
  })
})

describe('[S8-UI-01] the pickup point sheet notices', () => {
  it('[S8-UI-01] the "Complete the text" refusal is a soft danger Alert, not a plain box', async () => {
    await renderTab()
    await userEvent.click(await screen.findByRole('button', { name: 'Add pickup point' }))

    const notice = (await screen.findByText(/Complete the text in English or German to save/)).closest('.alert')

    expect(notice).toHaveClass('alert--soft', 'alert--danger')
  })
})
