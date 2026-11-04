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
let refuseDelete: 'in-use' | 'stale' | undefined

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
    mapsLink: 'https://maps.app.goo.gl/abc',
    latitude: 47.05165,
    longitude: 8.30754,
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
  refuseDelete = undefined
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
    if (call.method === 'DELETE') {
      const id = url.pathname.replace(`${base}/`, '')

      if (refuseDelete)
        return Response.json({ type: refuseDelete === 'in-use' ? 'pickup-in-use' : 'precondition-failed', status: refuseDelete === 'in-use' ? 409 : 412, title: 'x' }, { status: refuseDelete === 'in-use' ? 409 : 412, headers: { 'content-type': 'application/problem+json' } })
      active = active.filter(p => p.id !== id)
      archivedPoints = archivedPoints.filter(p => p.id !== id)

      return Response.json({ id })
    }
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

// The table and the phone cards are both in the DOM (CSS picks one), so a row query looks in the table; `hidden`
// because an open filter popover or dialog hides the page from the accessibility tree.
const table = () => within(screen.getByRole('grid', { hidden: true }))
const row = async (name: string) => (await within(await screen.findByRole('grid', { hidden: true })).findByText(name)).closest('tr')!

/** Opens the row's ⋯ menu (the table's, the last of the two) and presses an item. */
async function menu(name: string, item: string) {
  await userEvent.click((await screen.findAllByRole('button', { name: `Actions for ${name}` })).at(-1)!)
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

async function showArchived() {
  await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
  await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
  await userEvent.keyboard('{Escape}')
}

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

  it('[S8-PICKUP-TABLE] shows the table skeleton (real headers, a bar per cell) while the list loads', async () => {
    let release: () => void = () => {}

    hold = new Promise((resolve) => {
      release = resolve
    })
    active = [point(1)]
    const { container } = await renderTab()

    await waitFor(() => expect(container.querySelectorAll('[data-slot="skeleton"], .skeleton').length).toBeGreaterThan(0))
    expect(table().getAllByRole('columnheader', { hidden: true }).map(h => h.textContent)).toEqual(['Pickup point', 'Opening hours', 'Languages', 'Status', 'Actions'])
    release()
    expect(await row('Point 1')).toBeInTheDocument()
  })

  it('[S8-PICKUP-TABLE] lists the points as table rows: name over address, one hours line per day group, status, no instructions', async () => {
    active = [
      point(1, { instructions: { en: 'Ring the bell' } }),
      point(2, { hours: [{ weekday: 1, opens: '09:00', closes: '12:00' }, { weekday: 1, opens: '14:00', closes: '18:00' }] }),
      point(3, { hours: [...[1, 2, 3, 4, 5].map(weekday => ({ weekday, opens: '09:00', closes: '18:30' })), { weekday: 6, opens: '09:00', closes: '16:00' }] }),
      point(4, { hours: [] }),
    ]
    await renderTab()

    const first = within(await row('Point 1'))

    expect(table().getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Pickup point', 'Opening hours', 'Languages', 'Status', 'Actions'])
    expect(first.getByText('Street 1')).toBeInTheDocument()
    expect(first.getByText('Mon to Sat · 10:00 – 18:00')).toBeInTheDocument()
    expect(first.getByText('Active')).toBeInTheDocument()
    expect(first.queryByText('Ring the bell')).not.toBeInTheDocument()
    expect(within(await row('Point 2')).getByText('Mon · 09:00 – 12:00, 14:00 – 18:00')).toBeInTheDocument()
    const third = within(await row('Point 3'))

    expect(third.getByText('Mon to Fri · 09:00 – 18:30')).toBeInTheDocument()
    expect(third.getByText('Sat · 09:00 – 16:00')).toBeInTheDocument()
    expect(within(await row('Point 4')).getByText('No opening hours set')).toBeInTheDocument()
    expect(table().getAllByRole('rowheader').map(cell => within(cell).getByRole('button').textContent)).toEqual(['Point 1', 'Point 2', 'Point 3', 'Point 4'])
  })

  it('[S8-PICKUP-TABLE] a point with both languages has no language chip; a missing language gets the warning chip', async () => {
    active = [point(1), point(2, { name: { en: 'Kiosk' }, address: { en: 'Quai 1' } })]
    await renderTab()

    const complete = within(await row('Point 1'))

    expect(complete.queryByText(/missing|EN and DE/)).not.toBeInTheDocument()
    expect(within(await row('Kiosk')).getByText('DE missing').closest('[data-slot="chip"]')).not.toBeNull()
  })

  it('[S8-PICKUP-TABLE] the phone cards show the same facts: name, address, hours lines, status and the menu', async () => {
    active = [point(3, { hours: [...[1, 2, 3, 4, 5].map(weekday => ({ weekday, opens: '09:00', closes: '18:30' })), { weekday: 6, opens: '09:00', closes: '16:00' }] })]
    await renderTab()
    await row('Point 3')

    const card = within(screen.getByRole('list', { name: 'Pickup points' }))

    expect(card.getByText('Point 3')).toBeInTheDocument()
    expect(card.getByText('Street 3')).toBeInTheDocument()
    expect(card.getByText('Mon to Fri · 09:00 – 18:30')).toBeInTheDocument()
    expect(card.getByText('Sat · 09:00 – 16:00')).toBeInTheDocument()
    expect(card.getByText('Active')).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Actions for Point 3' })).toBeInTheDocument()
  })

  it('a german-only point shows the missing-English chip, not an error', async () => {
    active = [point(1, { name: { de: 'Laden' }, address: { de: 'Luzern' } })]
    await renderTab()

    expect(within(await row('Laden')).getByText('EN missing')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('[S8-PICKUP-TABLE] add pickup point opens an empty sheet; the name and the menu\'s Edit open the sheet filled', async () => {
    active = [point(1)]
    await renderTab()
    await row('Point 1')

    await userEvent.click(screen.getByRole('button', { name: 'Add pickup point' }))
    expect(await screen.findByLabelText('Name')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
    await waitFor(() => expect(screen.queryByLabelText('Name')).not.toBeInTheDocument())

    await userEvent.click(table().getByRole('button', { name: 'Edit Point 1' }))
    expect(await screen.findByLabelText('Name')).toHaveValue('Point 1')
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
    await waitFor(() => expect(screen.queryByLabelText('Name')).not.toBeInTheDocument())

    await menu('Point 1', 'Edit')
    expect(await screen.findByLabelText('Name')).toHaveValue('Point 1')
  })

  it('archive (in the ⋯ menu) asks first, sends the row version, and the row leaves; the last one shows the empty state', async () => {
    active = [point(1)]
    await renderTab()
    await row('Point 1')

    await menu('Point 1', 'Archive')
    expect(writes()).toHaveLength(0)
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/0198a000-0000-7000-8000-0000000000d1/archive`, ifMatch: '3' })
    expect((await screen.findAllByText('No pickup points yet.')).length).toBeGreaterThan(0)
  })

  it('[S8-PICKUP-DELETE] delete asks first with the point named, sends DELETE with the row version, and the ticket leaves', async () => {
    const toasted = vi.spyOn(toast, 'success')

    active = [point(1), point(2)]
    await renderTab()
    await row('Point 1')

    await menu('Point 1', 'Delete')
    expect(writes()).toHaveLength(0)
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).getByText('Delete Point 1?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'DELETE', path: `${base}/0198a000-0000-7000-8000-0000000000d1`, ifMatch: '3' })
    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
    expect(table().getByText('Point 2')).toBeInTheDocument()
    expect(toasted).toHaveBeenCalledWith('Point 1 deleted')
  })

  it('[S8-PICKUP-DELETE] cancelling the delete dialog sends nothing', async () => {
    active = [point(1)]
    await renderTab()
    await row('Point 1')

    await menu('Point 1', 'Delete')
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(0)
    expect(table().getByText('Point 1')).toBeInTheDocument()
  })

  it('[S8-PICKUP-DELETE] a point an order names (409 pickup-in-use) stays and the dialog says to archive it instead', async () => {
    active = [point(1)]
    refuseDelete = 'in-use'
    await renderTab()
    await row('Point 1')

    await menu('Point 1', 'Delete')
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByText('An order or a handover names this pickup point, so it can’t be deleted. Archive it instead.')).toBeInTheDocument()
    expect(table().getByText('Point 1')).toBeInTheDocument()
  })

  it('[S8-PICKUP-DELETE] an archived point can be deleted too', async () => {
    archivedPoints = [point(1, { archived: true })]
    await renderTab()
    await screen.findAllByText('No pickup points yet.')
    await showArchived()
    await row('Point 1')
    await menu('Point 1', 'Delete')
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'DELETE', ifMatch: '3' })
    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
  })

  it('[S8-PICKUP-TABLE] an archived row reads Archived, has Restore and Delete but no Edit, and Restore sends the row version', async () => {
    archivedPoints = [point(1, { archived: true })]
    await renderTab()
    await screen.findAllByText('No pickup points yet.')
    await showArchived()
    expect(within(await row('Point 1')).getByText('Archived')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Point 1' })).not.toBeInTheDocument()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Actions for Point 1' })).at(-1)!)
    expect((await screen.findAllByRole('menuitem')).map(item => item.textContent)).toEqual(['Restore', 'Delete'])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Restore' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/0198a000-0000-7000-8000-0000000000d1/restore`, ifMatch: '3' })
    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
  })

  it('a Restore refused at 100 active points (422 pickup-limit) toasts the reason, not the generic failure', async () => {
    const danger = vi.spyOn(toast, 'danger')

    archivedPoints = [point(1, { archived: true })]
    refuseRestoreAtLimit = true
    await renderTab()
    await screen.findAllByText('No pickup points yet.')
    await showArchived()
    await row('Point 1')
    await menu('Point 1', 'Restore')

    await waitFor(() => expect(danger).toHaveBeenCalledWith('100 active pickup points. Archive one first.'))
    expect(danger).toHaveBeenCalledTimes(1)
  })

  it('a second Restore while the first is under way sends no second request', async () => {
    archivedPoints = [point(1, { archived: true })]
    await renderTab()
    await screen.findAllByText('No pickup points yet.')
    await showArchived()
    await row('Point 1')
    let release: () => void = () => {}

    hold = new Promise((resolve) => {
      release = resolve
    })
    await menu('Point 1', 'Restore')
    await menu('Point 1', 'Restore')
    release()

    await waitFor(() => expect(screen.queryByText('Point 1')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(1)
  })

  it('a retry of Restore after a lost answer sends the same Idempotency-Key', async () => {
    archivedPoints = [point(1, { archived: true })]
    failNext = true
    await renderTab()
    await screen.findAllByText('No pickup points yet.')
    await showArchived()
    await row('Point 1')
    await menu('Point 1', 'Restore')
    await waitFor(() => expect(writes()).toHaveLength(1))
    await menu('Point 1', 'Restore')
    await waitFor(() => expect(writes()).toHaveLength(2))

    expect(writes()[0]!.key).toBeTruthy()
    expect(writes()[1]!.key).toBe(writes()[0]!.key)
  })
})

describe('[S8-UI-01] the pickup points page uses the shared list header and starts with no status ticked', () => {
  it('[S8-UI-01] Add pickup point has the Media button style and the Status filter sits in the toolbar', async () => {
    active = [point(1)]
    await renderTab()

    await row('Point 1')
    expectListChrome({ action: screen.getByRole('button', { name: 'Add pickup point' }), start: screen.getByRole('button', { name: /^Status/ }) })
  })

  it('[S8-UI-01] shows no Status chip on load, lists the active points and hides the archived ones until Archived is ticked', async () => {
    active = [point(1)]
    archivedPoints = [point(2, { archived: true })]
    await renderTab()

    await row('Point 1')
    expect(screen.queryByRole('button', { name: /^Remove filter/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Archived/ }))
    expect(await row('Point 2')).toBeInTheDocument()
    expect(screen.queryByText('Point 1')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: /Active/ }))
    expect(await row('Point 1')).toBeInTheDocument()
    expect(table().getByText('Point 2')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(screen.queryByText('Point 2')).not.toBeInTheDocument())
    expect(table().getByText('Point 1')).toBeInTheDocument()
  })
})

describe('[S8-UI-01] the pickup points search', () => {
  it('[S8-UI-01] typing filters the tickets by name in either language and by address, with the Status filter', async () => {
    active = [point(1, { name: { en: 'Station kiosk' }, address: { en: 'Bahnhofstrasse 1' } }), point(2, { name: { de: 'Hotel Alpina' }, address: { de: 'Seeweg 5' } })]
    archivedPoints = [point(3, { archived: true, name: { en: 'Old kiosk' } })]
    await renderTab()

    const search = await screen.findByRole('searchbox', { name: 'Search by name or address' })

    await row('Station kiosk')
    await userEvent.type(search, ' ALPINA ')
    expect(screen.queryByText('Station kiosk')).not.toBeInTheDocument()
    expect(table().getByText('Hotel Alpina')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'bahnhof')
    expect(table().getByText('Station kiosk')).toBeInTheDocument()
    expect(screen.queryByText('Hotel Alpina')).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'kiosk')
    expect(screen.queryByText('Old kiosk')).not.toBeInTheDocument()
  })

  it('[S8-UI-01] a query with no match shows the no-match state, and its button clears the search and the filters', async () => {
    active = [point(1)]
    await renderTab()

    await row('Point 1')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name or address' }), 'zzz')
    expect(await screen.findByText('No pickup point matches. Try another word or remove a filter.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(await row('Point 1')).toBeInTheDocument()
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
