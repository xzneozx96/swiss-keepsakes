import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { InventoryList } from '@/features/inventory/components/inventory-list'
import { base, setUpHarness, skuOf, state, stockList, stockProblem, stockRow } from './inventory-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

function renderInventory() {
  const root = createRootRoute({ component: Outlet })
  const index = createRoute({ getParentRoute: () => root, path: '/store/products/inventory', component: InventoryList })
  const router = createRouter({ routeTree: root.addChildren([index]), history: createMemoryHistory({ initialEntries: ['/store/products/inventory'] }), disableGlobalCatchBoundary: true })

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

/** Three live variants with 0, 3 and 5 available (the archived one is not in the answer: the API never lists it). */
const three = [
  { skuId: skuOf(1), code: 'VX-L-SWAN', variantTitle: { en: 'Large / Swan' }, onHand: 2, reserved: 2, available: 0 },
  { skuId: skuOf(2), code: 'VX-S-LION', variantTitle: { en: 'Small / Lion' }, onHand: 3, reserved: 0, available: 3 },
  { skuId: skuOf(3), code: 'VX-S-SWAN', variantTitle: { en: 'Small / Swan' }, keepsakeName: { en: 'Pocket Knife' }, onHand: 7, reserved: 2, available: 5 },
]

function answerWith(rows: Record<string, unknown>[]) {
  state.answer = call => (call.method === 'GET' && call.path === base ? Response.json(stockList(rows)) : undefined)
}

/** The grid once the rows are on screen: the loading rows are another element, so wait for a row first. */
async function loaded(code: string) {
  await screen.findAllByText(code, undefined, { timeout: 8000 })

  return { grid: await screen.findByRole('grid', { name: 'Inventory' }), cards: await screen.findByRole('list', { name: 'Inventory' }) }
}

describe('[E6.3][AC05][AC53] AC-1 the inventory list', () => {
  it('[E6.3][AC05][AC53] AC-1 shows the tab counts of the API, lists the live variants and writes "Sold out" in the danger colour', async () => {
    answerWith(three)
    renderInventory()

    const { grid } = await loaded('VX-L-SWAN')
    const tabs = within(screen.getByRole('tablist', { name: 'Stock' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Inventory' })).toBeInTheDocument()
    expect(tabs.getByRole('tab', { name: /^All\s*3$/ })).toBeInTheDocument()
    expect(tabs.getByRole('tab', { name: /^In stock\s*2$/ })).toBeInTheDocument()
    expect(tabs.getByRole('tab', { name: /^Sold out\s*1$/ })).toBeInTheDocument()
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Variant', 'SKU code', 'Reserved', 'In stock', 'Available'])
    expect(within(grid).getAllByRole('row')).toHaveLength(4)
    expect(within(grid).getByText('Sold out')).toHaveClass('text-danger')
    expect(within(grid).getByText('Large / Swan')).toBeInTheDocument()
    expect(within(grid).getByText('Pocket Knife')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument()
  })

  it('[E6.3][AC05][AC53] AC-1 the Sold out tab keeps the variants with nothing available, the In stock tab the others', async () => {
    answerWith(three)
    renderInventory()
    const { grid } = await loaded('VX-L-SWAN')
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: /Sold out/ }))
    await waitFor(() => expect(within(grid).getAllByRole('row')).toHaveLength(2))
    expect(within(grid).getAllByText('VX-L-SWAN').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: /In stock/ }))
    await waitFor(() => expect(within(grid).getAllByRole('row')).toHaveLength(3))
    expect(within(grid).queryAllByText('VX-L-SWAN')).toHaveLength(0)
  })

  it('[E6.3][AC05][AC53] AC-1 the search matches the code, the variant title and the keepsake name in any case, and says when nothing does', async () => {
    answerWith(three)
    renderInventory()
    const { grid } = await loaded('VX-L-SWAN')
    const user = userEvent.setup()
    const search = screen.getByRole('searchbox', { name: 'Search by code or name' })

    await user.type(search, 'vx-l')
    await waitFor(() => expect(within(grid).getAllByRole('row')).toHaveLength(2))
    expect(within(grid).getAllByText('VX-L-SWAN').length).toBeGreaterThan(0)
    await user.clear(search)
    await user.type(search, 'lion')
    await waitFor(() => expect(within(grid).getAllByText('VX-S-LION').length).toBeGreaterThan(0))
    expect(within(grid).queryAllByText('VX-S-SWAN')).toHaveLength(0)
    await user.clear(search)
    await user.type(search, 'pocket')
    await waitFor(() => expect(within(grid).getAllByText('VX-S-SWAN').length).toBeGreaterThan(0))
    expect(within(grid).queryAllByText('VX-S-LION')).toHaveLength(0)
    await user.clear(search)
    await user.type(search, 'zzz')
    expect((await screen.findAllByText('No variant matches “zzz”.')).length).toBeGreaterThan(0)
  })

  it('[E6.3][AC05][AC53] AC-1 shows the empty texts of a tab and of a store with no variants', async () => {
    answerWith([three[1]])
    renderInventory()
    const { grid } = await loaded('VX-S-LION')

    await userEvent.setup().click(screen.getByRole('tab', { name: /Sold out/ }))
    expect((await screen.findAllByText('Nothing is sold out.')).length).toBeGreaterThan(0)
    expect(within(grid).queryAllByText('VX-S-LION')).toHaveLength(0)
  })

  it('[E6.3][AC05][AC53] AC-1 shows loading rows shaped like the table while the stock is on its way', async () => {
    state.answer = call => (call.method === 'GET' && call.path === base ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderInventory()

    const grid = await screen.findByRole('grid', { name: 'Inventory' })

    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'true'))
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toContain('In stock')
  })

  it('[E6.3][AC05][AC53] AC-1 on a phone each row is a list item with the two stock lines and the box', async () => {
    answerWith(three)
    renderInventory()
    const { cards } = await loaded('VX-L-SWAN')
    const items = within(cards).getAllByRole('listitem')

    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Sold out')).toHaveClass('text-danger')
    expect(within(items[0]).getByText('2 reserved')).toBeInTheDocument()
    expect(within(items[0]).getByText('VX-L-SWAN')).toBeInTheDocument()
    expect(within(items[0]).getByText('Large / Swan')).toBeInTheDocument()
    expect(within(items[1]).getByText('3 available')).toBeInTheDocument()
    expect(within(items[1]).queryByText(/reserved/)).not.toBeInTheDocument()
    expect(within(items[2]).getByRole('textbox', { name: 'In stock for VX-S-SWAN' })).toHaveValue('7')
  })
})

describe('[E6.3][AC05][AC53] AC-2 editing a quantity in the list', () => {
  const rows = [{ skuId: skuOf(1), code: 'VX-S-SWAN', onHand: 5, reserved: 2, available: 3 }]
  const box = (grid: HTMLElement) => within(grid).getByRole('textbox', { name: 'In stock for VX-S-SWAN' })

  /** Focus the box with a click, empty it, then type `text` (the field takes focus from a click, not from `clear` alone). */
  async function typeInto(user: ReturnType<typeof userEvent.setup>, grid: HTMLElement, text: string) {
    await user.click(box(grid))
    await user.clear(box(grid))
    if (text)
      await user.type(box(grid), text)
  }

  it('[E6.3][AC05][AC53] AC-2 shows the refusal under the box in the danger colour and keeps the old figure when 1 is typed while 2 are reserved', async () => {
    state.answer = call => (call.method === 'PUT' ? stockProblem(2) : call.method === 'GET' && call.path === base ? Response.json(stockList(rows)) : undefined)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    await typeInto(user, grid, '1')
    await user.tab()

    const refusal = await within(grid).findByText('2 units are reserved by orders, so stock can’t go below the 2 reserved.')

    expect(refusal).toHaveClass('text-danger')
    expect(puts()).toHaveLength(1)
    expect(puts()[0]).toMatchObject({ path: `${base}/${skuOf(1)}`, body: { onHand: 1 } })
    expect(puts()[0].key).toBeTruthy()
    expect(box(grid)).toHaveValue('5')
  })

  it('[E6.3][AC05][AC53] AC-2 saves 7 on Enter, reads the list again and shows 5 available', async () => {
    let onHand = 5

    state.answer = (call) => {
      if (call.method === 'PUT') {
        onHand = (call.body as { onHand: number }).onHand

        return Response.json(stockRow({ skuId: skuOf(1), onHand, available: onHand - 2 }))
      }

      return call.method === 'GET' && call.path === base ? Response.json(stockList([{ ...rows[0], onHand, available: onHand - 2 }])) : undefined
    }
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    expect(within(grid).getByText('3')).toBeInTheDocument()
    await typeInto(user, grid, '7{Enter}')

    await waitFor(() => expect(within(grid).getByText('5')).toBeInTheDocument())
    expect(puts().map(call => call.body)).toEqual([{ onHand: 7 }])
    expect(box(grid)).toHaveValue('7')
    expect(within(grid).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('[E6.3][AC05][AC53] AC-2 saves a step of the box', async () => {
    state.answer = call => (call.method === 'PUT' ? Response.json(stockRow({ skuId: skuOf(1), onHand: 6, available: 4 })) : call.method === 'GET' && call.path === base ? Response.json(stockList(rows)) : undefined)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')

    await userEvent.setup().click(within(grid).getByRole('button', { name: /increase|increment/i }))
    await waitFor(() => expect(puts().map(call => call.body)).toEqual([{ onHand: 6 }]))
  })

  it('[E6.3][AC05][AC53] AC-2 two quick steps show 7 at once and end with a save of 7, one write after the other', async () => {
    const releases: (() => void)[] = []
    let onHand = 5

    state.answer = (call) => {
      if (call.method === 'PUT') {
        const figure = (call.body as { onHand: number }).onHand

        return new Promise<Response>((resolve) => {
          releases.push(() => {
            onHand = figure
            resolve(Response.json(stockRow({ skuId: skuOf(1), onHand, available: onHand - 2 })))
          })
        }) as unknown as Response
      }

      return call.method === 'GET' && call.path === base ? Response.json(stockList([{ ...rows[0], onHand, available: onHand - 2 }])) : undefined
    }
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()
    const increase = within(grid).getByRole('button', { name: /Increase/ })

    await user.click(increase)
    await user.click(increase)
    expect(box(grid)).toHaveValue('7')
    await waitFor(() => expect(puts().map(call => call.body)).toEqual([{ onHand: 6 }]))
    releases[0]()
    await waitFor(() => expect(puts().map(call => call.body)).toEqual([{ onHand: 6 }, { onHand: 7 }]))
    expect(box(grid)).toHaveValue('7')
    releases[1]()
    await waitFor(() => expect(within(grid).getByText('5')).toBeInTheDocument())
    expect(box(grid)).toHaveValue('7')
  })

  it('[E6.3][AC05][AC53] AC-2 Enter on a refused figure keeps the focus in the box, with the old figure and the refusal', async () => {
    state.answer = call => (call.method === 'PUT' ? stockProblem(2) : call.method === 'GET' && call.path === base ? Response.json(stockList(rows)) : undefined)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    await typeInto(user, grid, '1{Enter}')
    await within(grid).findByText('2 units are reserved by orders, so stock can’t go below the 2 reserved.')
    expect(box(grid)).toHaveValue('5')
    await waitFor(() => expect(box(grid)).toHaveFocus())
    await user.tab()
    expect(puts()).toHaveLength(1)
  })

  it('[E6.3][AC05][AC53] AC-2 a refusal that names no reserved figure uses the one of the row', async () => {
    state.answer = call => (call.method === 'PUT' ? Response.json({ type: 'stock-below-reserved', status: 422, title: 'refused', instance: '/x', requestId: 'req-3' }, { status: 422 }) : call.method === 'GET' && call.path === base ? Response.json(stockList(rows)) : undefined)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    await typeInto(user, grid, '1')
    await user.tab()
    expect(await within(grid).findByText('2 units are reserved by orders, so stock can’t go below the 2 reserved.')).toBeInTheDocument()
  })

  it.each([['abc'], ['-3'], ['1.5'], ['']])('[E6.3][AC05][AC53] AC-2 typing %j shows "Enter a whole number, 0 or more." and sends nothing', async (typed) => {
    answerWith(rows)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    await typeInto(user, grid, typed)
    await user.tab()

    const message = await within(grid).findByText('Enter a whole number, 0 or more.')

    expect(message).toHaveClass('text-danger')
    expect(puts()).toHaveLength(0)
    expect(box(grid)).toHaveValue('5')
  })

  it('[E6.3][AC05][AC53] AC-2 refuses more than 9999 with "Most 9999." and sends nothing', async () => {
    answerWith(rows)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')

    const user = userEvent.setup()

    await typeInto(user, grid, '12000')
    await user.tab()

    expect(await within(grid).findByText('Most 9999.')).toHaveClass('text-danger')
    expect(puts()).toHaveLength(0)
  })

  it('[E6.3][AC05][AC53] AC-2 leaving the box with the figure unchanged sends nothing', async () => {
    answerWith(rows)
    renderInventory()
    const { grid } = await loaded('VX-S-SWAN')
    const user = userEvent.setup()

    await user.click(box(grid))
    await user.tab()
    expect(puts()).toHaveLength(0)
  })
})
