import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list, listItem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

afterEach(() => vi.restoreAllMocks())

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const stock = `/api/store/${storeId}/inventory`
const SLOW = { timeout: 8000 }

const one = (over: Record<string, unknown> = {}) => ({ id: variantId, skuCode: 'VX-1', mediaId: null, photo: null, priceRappen: 6000, status: 'published' as const, values: {}, onHand: 0, reserved: 0, available: 0, ...over })

let current: ReturnType<typeof product>

/** A fake server: the keepsake reads as `current`, a stock write moves the variant's figures like the API (refused below the reserved units), a variant create keeps its quantity. */
function serve() {
  state.answer = (call) => {
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))
    if (call.method === 'PUT' && call.path === `${stock}/${variantId}`) {
      const { onHand } = call.body as { onHand: number }
      const row = current.variants[0]!

      if (onHand < (row.reserved ?? 0))
        return Response.json({ type: 'stock-below-reserved', status: 422, title: 'refused', instance: '/x', requestId: 'req-2', reserved: row.reserved }, { status: 422 })
      current = product({ ...current, variants: [{ ...row, onHand, available: onHand - (row.reserved ?? 0) }] })

      return Response.json({ skuId: variantId, onHand })
    }
    if (call.method === 'POST' && call.path === `${detail}/variants`) {
      const body = call.body as { priceRappen: number, quantity?: number }

      current = product({ ...current, variants: [one({ priceRappen: body.priceRappen, onHand: body.quantity ?? 0, available: body.quantity ?? 0 })] })

      return Response.json(current, { status: 201 })
    }

    return undefined
  }
}

beforeEach(async () => {
  current = product({ variants: [one()] })
  await setUpHarness()
  serve()
})

async function openStep() {
  renderKeepsakes(`/store/products/${productId}?step=options`)
  await screen.findByRole('region', { name: 'Options' }, SLOW)

  return screen.getByRole('region', { name: 'Price' })
}

const tag = '[E6.3][AC05][AC53]'

describe(`${tag} the Quantity field of the Price block`, () => {
  it(`${tag} AC-1 12 typed and left is written for the one variant, and reopening the editor shows 12`, async () => {
    const card = await openStep()
    const quantity = within(card).getByLabelText('Quantity')

    expect(quantity).toHaveValue('0')
    await userEvent.type(quantity, '{Control>}a{/Control}12')
    await userEvent.tab()

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PUT', path: `${stock}/${variantId}`, body: { onHand: 12 } })
    expect(writes()[0]!.key).toBeTruthy()
    cleanup()
    const again = await openStep()

    await waitFor(() => expect(within(again).getByLabelText('Quantity')).toHaveValue('12'))
  })

  it.each([
    ['10000', 'Most 9999.'],
    ['-1', 'Enter a whole number, 0 or more.'],
    ['abc', 'Enter a whole number, 0 or more.'],
    ['', 'Enter a whole number, 0 or more.'],
  ])(`${tag} AC-1 "%s" shows "%s" and nothing is saved`, async (typed, text) => {
    const card = await openStep()
    const quantity = within(card).getByLabelText('Quantity')

    await userEvent.clear(quantity)
    if (typed)
      await userEvent.type(quantity, typed)
    await userEvent.tab()

    expect(await within(card).findByText(text)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it(`${tag} AC-4 a figure below the reserved units is refused under the field with the reserved text, and the figure goes back`, async () => {
    current = product({ variants: [one({ onHand: 5, reserved: 2, available: 3 })] })
    serve()
    const card = await openStep()
    const quantity = within(card).getByLabelText('Quantity')

    await userEvent.clear(quantity)
    await userEvent.type(quantity, '1')
    await userEvent.tab()

    expect(await within(card).findByText('2 units are reserved by orders, so stock can’t go below the 2 reserved.')).toBeInTheDocument()
    expect(quantity).toHaveValue('5')
  })

  it(`${tag} AC-1 with no variant yet the typed quantity waits in the card and travels with the write that creates the variant`, async () => {
    current = product({ variants: [] })
    serve()
    const card = await openStep()

    await userEvent.type(within(card).getByLabelText('Quantity'), '6')
    await userEvent.tab()
    expect(writes()).toHaveLength(0)
    await userEvent.type(within(card).getByLabelText('Price, CHF'), '39')
    await userEvent.tab()

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/variants`, body: { priceRappen: 3900, quantity: 6 } })
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Price' })).getByLabelText('Quantity')).toHaveValue('6'))
  })

  it(`${tag} AC-5 a new keepsake sends the quantity with its variant on create`, async () => {
    state.answer = call => (call.method === 'POST' && call.path === base ? Response.json(product(), { status: 201 }) : call.method === 'GET' && call.path === detail ? Response.json(product()) : call.method === 'GET' && call.path === base ? Response.json(list([listItem()])) : undefined)
    renderKeepsakes('/store/products/new')
    await userEvent.type(await screen.findByLabelText('Name (English)', undefined, SLOW), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    const card = await screen.findByRole('region', { name: 'Price' })

    await userEvent.type(within(card).getByLabelText('Quantity'), '12')
    await userEvent.type(within(card).getByLabelText('Price, CHF'), '39')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: base, body: { variants: [{ priceRappen: 3900, quantity: 12 }] } })
  })

  it(`${tag} AC-5 a new keepsake with an empty Quantity shows no error and sends no quantity (0)`, async () => {
    state.answer = call => (call.method === 'POST' && call.path === base ? Response.json(product(), { status: 201 }) : call.method === 'GET' && call.path === detail ? Response.json(product()) : call.method === 'GET' && call.path === base ? Response.json(list([listItem()])) : undefined)
    renderKeepsakes('/store/products/new')
    await userEvent.type(await screen.findByLabelText('Name (English)', undefined, SLOW), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    const card = await screen.findByRole('region', { name: 'Price' })

    await userEvent.click(within(card).getByLabelText('Quantity'))
    await userEvent.tab()
    expect(within(card).queryByText('Enter a whole number, 0 or more.')).not.toBeInTheDocument()
    await userEvent.type(within(card).getByLabelText('Price, CHF'), '39')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect((writes()[0]!.body as { variants: object[] }).variants[0]).not.toHaveProperty('quantity')
  })
})
