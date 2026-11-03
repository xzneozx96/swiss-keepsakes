import { readFileSync } from 'node:fs'
import { toast } from '@heroui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { InventoryItem } from '@/features/inventory/components/inventory-item'
import { base, reservation, setUpHarness, skuOf, state, stockItem, stockProblem, stockRow } from './inventory-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

const item = `${base}/${skuOf(1)}`

function renderItem() {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/store/products/inventory/$skuId', component: () => <InventoryItem skuId={skuOf(1)} /> })
  const list = createRoute({ getParentRoute: () => root, path: '/store/products/inventory', component: () => <p>list</p> })
  const router = createRouter({ routeTree: root.addChildren([page, list]), history: createMemoryHistory({ initialEntries: [`/store/products/inventory/${skuOf(1)}`] }), disableGlobalCatchBoundary: true })

  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const puts = () => state.calls.filter(call => call.method === 'PUT')

function answerWith(entry: ReturnType<typeof stockItem>) {
  state.answer = call => (call.method === 'GET' && call.path === item ? Response.json(entry) : undefined)
}

async function openAdjust() {
  const user = userEvent.setup()

  await screen.findByRole('heading', { level: 2, name: 'Details' }, { timeout: 8000 })
  await user.click(screen.getByRole('button', { name: 'Actions' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Adjust stock' }))

  return { user, dialog: await screen.findByRole('dialog', { name: 'Adjust stock · VX-S-SWAN' }) }
}

describe('[E6.3][AC05][AC53] AC-3 the item page and Adjust stock', () => {
  it('[E6.3][AC05][AC53] AC-3 shows the title, the Details card with its rows and the Adjust stock menu', async () => {
    answerWith(stockItem({ onHand: 5, reserved: 2, available: 3 }, [reservation()]))
    renderItem()

    const details = (await screen.findByRole('heading', { level: 2, name: 'Details' }, { timeout: 8000 })).closest('section')!
    const rows = within(details)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Victorinox Classic · Small / Swan')
    expect(rows.getByText('SKU code').nextElementSibling).toHaveTextContent('VX-S-SWAN')
    expect(rows.getByText('In stock').nextElementSibling).toHaveTextContent('5')
    expect(rows.getByText('Reserved by orders').nextElementSibling).toHaveTextContent('2')
    expect(rows.getByText('Available').nextElementSibling).toHaveTextContent('3')
    expect(screen.getAllByRole('link', { name: 'Back to Inventory' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument()
  })

  it('[E6.3][AC05][AC53] AC-3 writes Available as "0, sold out" in the danger colour when nothing is available', async () => {
    answerWith(stockItem({ onHand: 2, reserved: 2, available: 0 }, [reservation()]))
    renderItem()

    const details = (await screen.findByRole('heading', { level: 2, name: 'Details' }, { timeout: 8000 })).closest('section')!
    const available = within(details).getByText('Available').nextElementSibling!

    expect(available).toHaveTextContent('0, sold out')
    expect(available.querySelector('.text-danger')).not.toBeNull()
  })

  it('[E6.3][AC05][AC53] AC-3 blocks Save below the reserved units with the hint, shows 0 would be available at 2, and saves 2', async () => {
    let onHand = 5

    state.answer = (call) => {
      if (call.method === 'PUT') {
        onHand = (call.body as { onHand: number }).onHand

        return Response.json(stockRow({ onHand, reserved: 2, available: onHand - 2 }))
      }

      return call.method === 'GET' && call.path === item ? Response.json(stockItem({ onHand, reserved: 2, available: Math.max(0, onHand - 2) }, [reservation()])) : undefined
    }
    const success = vi.spyOn(toast, 'success')

    renderItem()
    const { user, dialog } = await openAdjust()
    const sheet = within(dialog)
    const decrease = sheet.getByRole('button', { name: /Decrease/ })

    expect(sheet.getByText('2 reserved by orders')).toBeInTheDocument()
    expect(sheet.getByText('3 would be available.')).toBeInTheDocument()
    for (let step = 0; step < 5; step++)
      await user.click(decrease)

    expect(sheet.getByRole('textbox', { name: 'In stock' })).toHaveValue('0')
    expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(sheet.getByRole('alert')).toHaveTextContent('2 units are reserved by orders, so stock can’t go below the 2 reserved.')
    expect(sheet.getByText(/^0 would be available\./)).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: /Increase/ }))
    await user.click(sheet.getByRole('button', { name: /Increase/ }))
    expect(sheet.getByRole('textbox', { name: 'In stock' })).toHaveValue('2')
    expect(sheet.getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(sheet.queryByRole('alert')).not.toBeInTheDocument()
    expect(sheet.getByText('0 would be available. At 0 guests see it sold out; the other variants stay for sale.')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts().map(call => call.body)).toEqual([{ onHand: 2 }]))
    expect(puts()[0]).toMatchObject({ path: item })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('VX-S-SWAN: 2 in stock.'))
    expect(puts()[0].key).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await screen.findByText('Available')).nextElementSibling).toHaveTextContent('0, sold out')
  })

  it('[E6.3][AC05][AC53] AC-3 keeps the sheet open with the refusal of the server', async () => {
    state.answer = call => (call.method === 'PUT' ? stockProblem(3) : call.method === 'GET' && call.path === item ? Response.json(stockItem({ onHand: 5, reserved: 2, available: 3 })) : undefined)
    renderItem()
    const { user, dialog } = await openAdjust()
    const sheet = within(dialog)

    await user.click(sheet.getByRole('button', { name: /Increase/ }))
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByRole('alert')).toHaveTextContent('3 units are reserved by orders, so stock can’t go below the 3 reserved.')
    expect(screen.getByRole('dialog', { name: 'Adjust stock · VX-S-SWAN' })).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('[E6.3][AC05][AC53] AC-3 shows the not-found state when the variant no longer exists', async () => {
    state.answer = call => (call.method === 'GET' && call.path === item ? Response.json({ type: 'not-found', status: 404, title: 'gone', instance: '/x', requestId: 'req-3' }, { status: 404 }) : undefined)
    renderItem()

    expect(await screen.findByText('This variant no longer exists.', undefined, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Inventory' })).toBeInTheDocument()
  })

  it('[E6.3][AC05][AC53] AC-3 shows loading cards shaped like the page while the item is on its way', async () => {
    state.answer = call => (call.method === 'GET' && call.path === item ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderItem()

    const busy = await screen.findByTestId('inventory-item-skeleton')

    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(busy.querySelectorAll('section')).toHaveLength(2)
  })
})

describe('[E6.3][AC05][AC53] AC-4 Reserved by orders', () => {
  it('[E6.3][AC05][AC53] AC-4 says nothing is reserved, and shows no Total, when there are no reservations', async () => {
    answerWith(stockItem({ onHand: 5, reserved: 0, available: 5 }))
    renderItem()

    const card = (await screen.findByRole('heading', { level: 2, name: 'Reserved by orders' }, { timeout: 8000 })).closest('section')!

    expect(within(card).getByText('Nothing is reserved. Units are reserved when an order is accepted, and released when it is declined or cancelled.')).toBeInTheDocument()
    expect(within(card).queryByText('Total')).not.toBeInTheDocument()
    expect(within(card).queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('[E6.3][AC05][AC53] AC-4 lists one row per reservation with the guest and the date, a fallback for a missing reference or guest, and a Total', async () => {
    answerWith(stockItem({ onHand: 5, reserved: 3, available: 2 }, [
      reservation(),
      reservation({ orderId: '0198a000-0000-7000-8000-0000000002a2', orderRef: null, guestName: null, quantity: 1, acceptedAt: '2026-10-29T10:00:00.000Z' }),
    ]))
    renderItem()

    const card = (await screen.findByRole('heading', { level: 2, name: 'Reserved by orders' }, { timeout: 8000 })).closest('section')!
    const rows = within(card).getAllByRole('listitem')

    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('SK-1044')).toBeInTheDocument()
    expect(within(rows[0]).getByText(/^Anna Meier · accepted Wed 28 Oct/)).toBeInTheDocument()
    expect(within(rows[0]).getByText('2 reserved')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Order')).toBeInTheDocument()
    expect(within(rows[1]).getByText(/^Accepted Thu 29 Oct/)).toBeInTheDocument()
    expect(within(rows[1]).getByText('1 reserved')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Total')).toBeInTheDocument()
    expect(within(rows[2]).getByText('3 reserved')).toBeInTheDocument()
  })
})

describe('[E6.3][AC05][AC53] AC-5 the item page uses the shared parts', () => {
  const read = (path: string) => readFileSync(`src/features/inventory/components/${path}`, 'utf8')

  it('[E6.3][AC05][AC53] AC-5 opens Adjust stock in the shared SheetFrame with the shared QuantityStepper, and says In stock and Reserved, never on hand or held', async () => {
    answerWith(stockItem({ onHand: 5, reserved: 2, available: 3 }))
    renderItem()
    const { dialog } = await openAdjust()

    expect(read('adjust-stock-sheet.tsx')).toMatch(/from '@\/components\/sheet-frame'/)
    expect(read('adjust-stock-sheet.tsx')).toMatch(/from '@\/components\/quantity-stepper'/)
    expect(dialog.textContent).not.toMatch(/\bon[ -]hand\b|\bheld\b/i)
    expect(document.body.textContent).not.toMatch(/\bon[ -]hand\b|\bheld\b/i)
  })
})
