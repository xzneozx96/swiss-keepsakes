import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list, listItem, product, productId, renderKeepsakes, setUpHarness, state, storeId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

afterEach(() => vi.restoreAllMocks())

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const stock = `/api/store/${storeId}/inventory`
const SLOW = { timeout: 8000 }
const tag = '[E6.3][AC05][AC53]'
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`
const optSize = id(0xC1)
const names = ['Small', 'Medium', 'Large']
const valueIds = [id(0xC2), id(0xC3), id(0xC4)]
const sizeOf = (count: number) => ({ id: optSize, name: { en: 'Size' }, values: names.slice(0, count).map((name, index) => ({ id: valueIds[index]!, label: { en: name } })) })

interface Figures { onHand: number, reserved?: number, status?: 'published' | 'draft' | 'archived' }

function variantOf(index: number, figures: Figures) {
  return {
    id: id(0xA0 + index),
    skuCode: null,
    mediaId: null,
    photo: null,
    priceRappen: 4000,
    status: figures.status ?? 'published' as const,
    values: { [optSize]: valueIds[index]! },
    onHand: figures.onHand,
    reserved: figures.reserved ?? 0,
    available: Math.max(0, figures.onHand - (figures.reserved ?? 0)),
  }
}

let current: ReturnType<typeof product>

/** A fake server: stock writes move the figures like the API (422 below the reserved units), price writes change the row. */
function serve() {
  state.answer = (call) => {
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path.split('?')[0] === base)
      return Response.json(list([listItem()]))
    if (call.method === 'PUT' && call.path.startsWith(`${stock}/`)) {
      const skuId = call.path.split('/').at(-1)
      const { onHand } = call.body as { onHand: number }
      const row = current.variants.find(variant => variant.id === skuId)!

      if (onHand < (row.reserved ?? 0))
        return Response.json({ type: 'stock-below-reserved', status: 422, title: 'refused', instance: '/x', requestId: 'req-2', reserved: row.reserved }, { status: 422 })
      current = product({ ...current, variants: current.variants.map(variant => (variant.id === skuId ? { ...variant, onHand, available: Math.max(0, onHand - (variant.reserved ?? 0)) } : variant)) })

      return Response.json({ skuId, onHand })
    }
    if (call.method === 'PATCH' && call.path.startsWith(`${detail}/variants/`)) {
      const variantId = call.path.split('/').at(-1)
      const body = call.body as { priceRappen?: number }

      current = product({ ...current, variants: current.variants.map(variant => (variant.id === variantId ? { ...variant, priceRappen: body.priceRappen ?? variant.priceRappen } : variant)) })

      return Response.json(current)
    }

    return undefined
  }
}

async function openWith(figures: Figures[]) {
  current = product({ options: [sizeOf(3)], variants: figures.map((figure, index) => variantOf(index, figure)) })
  await setUpHarness()
  serve()
  renderKeepsakes(`/store/products/${productId}?step=options`)
  await screen.findByRole('region', { name: 'Variants' }, SLOW)
}

const rowOf = (name: string) => within(screen.getByRole('region', { name: 'Variants' })).getAllByTestId('variant-row').find(row => within(row).queryByLabelText(`In stock, ${name}`) !== null)!
const boxOf = (name: string) => within(rowOf(name)).getByRole('textbox', { name: `In stock, ${name}` })

/** Focus the box with a click, empty it, type `text`, leave it. */
async function typeInto(box: HTMLElement, text: string) {
  await userEvent.click(box)
  await userEvent.clear(box)
  await userEvent.type(box, text)
  await userEvent.tab()
}

describe(`${tag} the quantity box of a variant row`, () => {
  beforeEach(() => {
    current = product()
  })

  it(`${tag} AC-3 each row shows its own stock, Reserved as a muted second line above 0, and Sold out at 0 without hiding the row`, async () => {
    await openWith([{ onHand: 6, reserved: 2 }, { onHand: 0 }, { onHand: 9 }])

    expect(boxOf('Small')).toHaveValue('6')
    expect(boxOf('Medium')).toHaveValue('0')
    expect(boxOf('Large')).toHaveValue('9')
    expect(within(rowOf('Small')).getByText('Reserved 2')).toHaveClass('text-muted')
    expect(within(rowOf('Large')).queryByText(/Reserved/)).not.toBeInTheDocument()
    expect(within(rowOf('Medium')).getByText('Sold out')).toHaveClass('text-danger')
    expect(within(rowOf('Small')).queryByText('Sold out')).not.toBeInTheDocument()
  })

  it(`${tag} AC-3 one box set to 0 shows Sold out and the other two keep their numbers`, async () => {
    await openWith([{ onHand: 6 }, { onHand: 4 }, { onHand: 9 }])

    await typeInto(boxOf('Medium'), '0')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PUT', path: `${stock}/${id(0xA1)}`, body: { onHand: 0 } })
    expect(writes()[0]!.key).toBeTruthy()
    expect(await within(rowOf('Medium')).findByText('Sold out')).toBeInTheDocument()
    expect(boxOf('Small')).toHaveValue('6')
    expect(boxOf('Large')).toHaveValue('9')
    expect(within(rowOf('Small')).queryByText('Sold out')).not.toBeInTheDocument()
    expect(within(rowOf('Large')).queryByText('Sold out')).not.toBeInTheDocument()
  })

  it(`${tag} AC-4 1 typed while 2 are reserved shows the refusal at the box in danger colour, keeps 5, and the row's other edits still apply`, async () => {
    await openWith([{ onHand: 5, reserved: 2 }, { onHand: 3 }, { onHand: 9 }])
    const price = within(rowOf('Small')).getByLabelText('Price of Small, CHF')

    await userEvent.clear(price)
    await userEvent.type(price, '41')
    await userEvent.tab()
    await waitFor(() => expect(writes().filter(call => call.method === 'PATCH')).toHaveLength(1))
    await typeInto(boxOf('Medium'), '2')
    await typeInto(boxOf('Small'), '1')

    const refusal = await within(rowOf('Small')).findByText('2 units are reserved by orders, so stock can’t go below the 2 reserved.')

    expect(refusal).toHaveClass('text-danger')
    expect(boxOf('Small')).toHaveValue('5')
    expect(writes().find(call => call.method === 'PATCH')).toMatchObject({ body: { priceRappen: 4100 } })
    expect(writes().filter(call => call.method === 'PUT').map(call => call.path)).toEqual([`${stock}/${id(0xA1)}`, `${stock}/${id(0xA0)}`])
    await waitFor(() => expect(boxOf('Medium')).toHaveValue('2'))
    expect(within(rowOf('Small')).getByLabelText('Price of Small, CHF')).toHaveValue('41.00')
  })

  it(`${tag} AC-4 a figure that is not a whole number from 0 to 9999 is refused at the box and nothing is sent`, async () => {
    await openWith([{ onHand: 6 }, { onHand: 4 }, { onHand: 9 }])

    await typeInto(boxOf('Small'), '10000')

    expect(await within(rowOf('Small')).findByText('Most 9999.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it(`${tag} AC-6 an archived variant has no box and nothing is written for it, a live row's edit writes only that row`, async () => {
    await openWith([{ onHand: 6 }, { onHand: 4 }, { onHand: 3, status: 'archived' }])

    expect(screen.getAllByRole('textbox', { name: /^In stock/ })).toHaveLength(2)
    expect(screen.queryByRole('textbox', { name: 'In stock, Large' })).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)

    await typeInto(boxOf('Small'), '8')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes().map(call => call.path)).toEqual([`${stock}/${id(0xA0)}`])
    expect(boxOf('Medium')).toHaveValue('4')
  })

  it(`${tag} AC-2 a saved keepsake with 6 in stock that gets the option Size with Small and Large shows 6 in both rows`, async () => {
    current = product({ variants: [{ id: id(0xA0), skuCode: null, mediaId: null, photo: null, priceRappen: 4000, status: 'published', values: {}, onHand: 6, reserved: 0, available: 6 }] })
    await setUpHarness()
    serve()
    renderKeepsakes(`/store/products/${productId}?step=options`)
    await screen.findByRole('region', { name: 'Options' }, SLOW)
    await userEvent.click(screen.getAllByRole('button', { name: /^Add (another )?option$/ })[0]!)
    await userEvent.type(await screen.findByLabelText('Option name in English', { selector: 'input' }), 'Size')
    await userEvent.type(screen.getByLabelText(/^Add values to/), 'Small')
    await userEvent.type(screen.getByLabelText(/^Add values to/), 'Large')
    await userEvent.click(within(screen.getByRole('region', { name: 'Options' })).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Variants' })).getAllByTestId('variant-row')).toHaveLength(2))
    expect(boxOf('Small')).toHaveValue('6')
    expect(boxOf('Large')).toHaveValue('6')
  })
})

describe(`${tag} stock of a new keepsake`, () => {
  const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

  async function toOptions() {
    await setUpHarness()
    renderKeepsakes('/store/products/new')
    await userEvent.type(await screen.findByLabelText('Name (English)', undefined, SLOW), 'Knife')
    await next()

    return screen.findByRole('region', { name: 'Price' })
  }

  async function addSize(values: string[]) {
    await userEvent.click(screen.getAllByRole('button', { name: /^Add (another )?option$/ })[0]!)
    await userEvent.type(await screen.findByLabelText('Option name in English', { selector: 'input' }), 'Size')
    for (const value of values)
      await userEvent.type(screen.getByLabelText(/^Add values to/), value)
    await userEvent.click(within(screen.getByRole('region', { name: 'Options' })).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Variants' })).getAllByTestId('variant-row')).toHaveLength(values.length))
  }

  it(`${tag} AC-2 6 typed in the Price block, then the option Size with Small and Large: both rows start at 6, Small to 0 leaves Large at 6 and for sale`, async () => {
    const card = await toOptions()

    await userEvent.type(within(card).getByLabelText('Quantity'), '6')
    await userEvent.tab()
    await addSize(['Small', 'Large'])

    expect(boxOf('Small')).toHaveValue('6')
    expect(boxOf('Large')).toHaveValue('6')
    await typeInto(boxOf('Small'), '0')

    expect(await within(rowOf('Small')).findByText('Sold out')).toBeInTheDocument()
    expect(boxOf('Small')).toHaveValue('0')
    expect(boxOf('Large')).toHaveValue('6')
    expect(within(rowOf('Large')).queryByText('Sold out')).not.toBeInTheDocument()
    expect(within(rowOf('Large')).getByText('On sale')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it(`${tag} AC-5 a new keepsake with an option and three variants each given a quantity sends the three quantities in one create`, async () => {
    const card = await toOptions()

    await userEvent.type(within(card).getByLabelText('Price, CHF'), '39')
    await userEvent.tab()
    await addSize(names)
    await typeInto(boxOf('Small'), '3')
    await typeInto(boxOf('Medium'), '4')
    await typeInto(boxOf('Large'), '5')
    state.answer = call => (call.method === 'POST' && call.path === base ? Response.json(product(), { status: 201 }) : call.method === 'GET' && call.path === detail ? Response.json(product()) : call.method === 'GET' && call.path.split('?')[0] === base ? Response.json(list([listItem()])) : undefined)
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: base })
    expect((writes()[0]!.body as { variants: { quantity: number }[] }).variants.map(variant => variant.quantity)).toEqual([3, 4, 5])
  }, 20_000)
})
