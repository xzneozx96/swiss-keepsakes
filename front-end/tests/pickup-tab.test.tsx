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
import { MerchantProducts } from '@/features/merchant/products/components/merchant-products'

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

interface Call { method: string, path: string, ifMatch: string | null }

const storeId = '0198a000-0000-7000-8000-000000000001'
const base = `/api/store/${storeId}/pickup-places`

let calls: Call[]
let active: ReturnType<typeof point>[]
let archivedPoints: ReturnType<typeof point>[]
let hold: Promise<void> | undefined

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
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    const call: Call = { method: request.method, path: url.pathname + url.search, ifMatch: request.headers.get('if-match') }

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
    createRoute({ getParentRoute: () => root, path, component: () => <MerchantProducts tab="pickup" /> }),
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

describe('[E6.6][AC26] M14 the Pickup points tab on the API', { timeout: 30_000 }, () => {
  it('shows the empty state when the store has no points', async () => {
    await renderTab()

    expect(await screen.findByText('No pickup points yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add pickup point' })).toBeInTheDocument()
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

  it('lists the points in order with name, address, hours line and instructions, and counts the active ones in the tab', async () => {
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
    expect(screen.getByRole('tab', { name: /Pickup points/ })).toHaveTextContent('3')
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
    await userEvent.click(await screen.findByRole('checkbox', { name: /Active/ }))
    await userEvent.keyboard('{Escape}')
    const card = await ticket('Point 1')

    expect(screen.queryByRole('button', { name: 'Edit Point 1' })).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Restore Point 1' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/0198a000-0000-7000-8000-0000000000d1/restore`, ifMatch: '3' })
    await waitFor(() => expect(screen.getByRole('tab', { name: /Pickup points/ })).toHaveTextContent('1'))
  })
})
