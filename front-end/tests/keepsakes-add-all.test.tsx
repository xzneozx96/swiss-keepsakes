import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list, listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`
const optSize = id(0xC1)
const vSmall = id(0xC2)
const vLarge = id(0xC3)
const optTheme = id(0xC4)
const vSwan = id(0xC5)
const vLion = id(0xC6)

const options = [
  { id: optSize, name: { en: 'Size', de: 'Grösse' }, values: [{ id: vSmall, label: { en: 'Small', de: 'Klein' }, swatch: null }, { id: vLarge, label: { en: 'Large', de: 'Gross' }, swatch: null }] },
  { id: optTheme, name: { en: 'Theme' }, values: [{ id: vSwan, label: { en: 'Swan' }, swatch: null }, { id: vLion, label: { en: 'Lion Monument' }, swatch: null }] },
]
// Small and Swan for sale, Small and Lion archived: two of the four combinations are missing.
const variants = [
  { id: id(0xD1), skuCode: 'VX-S-SWAN', priceRappen: 3900, status: 'published', values: { [optSize]: vSmall, [optTheme]: vSwan } },
  { id: id(0xD3), skuCode: 'VX-S-LION', priceRappen: 3900, status: 'archived', values: { [optSize]: vSmall, [optTheme]: vLion } },
]

let current: ReturnType<typeof product>

function serve(extra: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))

    return undefined
  }
}

beforeEach(async () => {
  current = product({ options, variants, text: {} })
  await setUpHarness()
  serve()
})

afterEach(() => vi.restoreAllMocks())

async function openAddAll() {
  renderKeepsakes(`/store/products/gifts/${productId}?step=variants`)
  await screen.findByLabelText('Name (English)', undefined, SLOW)
  await userEvent.click(screen.getAllByRole('button', { name: 'Add all combinations' })[0]!)

  return screen.findByRole('form', { name: 'Add all combinations' })
}

const created = (body: { skuCode: string, values: object }) => product({ text: {}, options, variants: [...variants, { id: crypto.randomUUID(), priceRappen: 4900, status: 'published', ...body }] })

describe('[ADD-ALL] saved keepsake', () => {
  it('[ADD-ALL] is offered with the count of missing combinations, archived ones counting as taken', async () => {
    const form = await openAddAll()

    expect(within(form).getByRole('heading', { level: 4, name: 'Add the 2 missing combinations' })).toBeInTheDocument()
  })

  it('[ADD-ALL] is not offered when every combination is sold, or when there is no option', async () => {
    current = product({ text: {}, options, variants: [...variants, { id: id(0xD4), skuCode: 'VX-L-SWAN', priceRappen: 1, status: 'draft', values: { [optSize]: vLarge, [optTheme]: vSwan } }, { id: id(0xD5), skuCode: 'VX-L-LION', priceRappen: 1, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } }] })
    renderKeepsakes(`/store/products/gifts/${productId}?step=variants`)
    await screen.findByLabelText('Name (English)', undefined, SLOW)
    expect(screen.queryByRole('button', { name: 'Add all combinations' })).not.toBeInTheDocument()
  })

  it('[ADD-ALL] sends one POST per missing combination with the price, the suggested code and on sale; nothing without a price', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/variants` ? Response.json(created(call.body as { skuCode: string, values: object }), { status: 201 }) : undefined))
    const form = await openAddAll()

    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))
    expect(await within(form).findByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '49')
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes().map(call => call.body)).toEqual(expect.arrayContaining([
      { skuCode: 'VX-L-SWAN', priceRappen: 4900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vSwan } },
      { skuCode: 'VX-L-LION', priceRappen: 4900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } },
    ]))
    expect(writes().every(call => call.method === 'POST' && call.path === `${detail}/variants` && call.key !== null)).toBe(true)
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Add all combinations' })).not.toBeInTheDocument())
  })

  it('[ADD-ALL] a refusal is named in one summary inside the form and the others stay added', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/variants`
      ? ((call.body as { skuCode: string }).skuCode === 'VX-L-LION' ? problem(409, 'sku-code-taken') : Response.json(created(call.body as { skuCode: string, values: object }), { status: 201 }))
      : undefined))
    const form = await openAddAll()

    await userEvent.type(within(form).getByLabelText('Price, CHF'), '49')
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))

    expect(await within(form).findByText('1 variant added.')).toBeInTheDocument()
    expect(within(form).getByText('1 variant was not added.')).toBeInTheDocument()
    expect(within(form).getByText('Large · Lion Monument: VX-L-LION is already used in your shop.')).toBeInTheDocument()
    expect(writes()).toHaveLength(2)
  })

  it('[ADD-ALL] a suggested code another variant already uses is not sent and is named', async () => {
    current = product({ text: {}, options, variants: [...variants, { id: id(0xD6), skuCode: 'VX-L-LION', priceRappen: 1, status: 'published', values: {} }] })
    serve(call => (call.method === 'POST' ? Response.json(created(call.body as { skuCode: string, values: object }), { status: 201 }) : undefined))
    const form = await openAddAll()

    await userEvent.type(within(form).getByLabelText('Price, CHF'), '49')
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))

    expect(await within(form).findByText('Large · Lion Monument: VX-L-LION is already used in your shop.')).toBeInTheDocument()
    expect(writes()).toHaveLength(1)
  })
})

// Distinct first letters in the first option and distinct first words in the second, so every suggested code differs.
const FIRST = ['Apple', 'Banana', 'Cherry', 'Date', 'Elder', 'Fig', 'Grape', 'Hazel']
const SECOND = ['Red', 'Sky', 'Teal', 'Umber', 'Violet', 'White', 'Yellow']

describe('[ADD-ALL] new keepsake', () => {
  const ref = (n: string) => `ref-${n}`
  const optionDrafts = [
    { ref: ref('size'), name: { en: 'Size', de: '' }, values: [{ ref: ref('s'), label: { en: 'Small', de: '' }, swatch: null }, { ref: ref('l'), label: { en: 'Large', de: '' }, swatch: null }] },
    { ref: ref('theme'), name: { en: 'Theme', de: '' }, values: [{ ref: ref('swan'), label: { en: 'Swan', de: '' }, swatch: null }, { ref: ref('lion'), label: { en: 'Lion', de: '' }, swatch: null }] },
  ]

  const seed = () => sessionStorage.setItem(`sk:new-keepsake:${storeId}`, JSON.stringify({ value: { name: { en: 'Knife', de: '' }, text: { en: '', de: '' } }, photoIds: [], commission: 0, options: optionDrafts, variants: [], step: 'variants', reached: 2 }))

  it('[ADD-ALL] adds every combination to the browser draft, sends nothing, and the list shows them', async () => {
    seed()
    renderKeepsakes('/store/products/gifts/new')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add all combinations' }, SLOW))[0]!)
    const form = await screen.findByRole('form', { name: 'Add all combinations' })

    expect(within(form).getByRole('heading', { level: 4, name: 'Add the 4 missing combinations' })).toBeInTheDocument()
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '29')
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(screen.queryByRole('form', { name: 'Add all combinations' })).not.toBeInTheDocument())
    const nav = screen.getByRole('navigation', { name: 'Variants' })

    expect(within(nav).getAllByRole('button')).toHaveLength(4)
    expect(nav).toHaveTextContent(/Large · Lion\s*CHF\s*29\.00/)
    expect(screen.queryByRole('button', { name: 'Add all combinations' })).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[ADD-ALL] above 50 combinations the first press asks, naming the count, and sends nothing yet', async () => {
    const many = [{ ref: ref('a'), name: { en: 'A', de: '' }, values: FIRST.map(word => ({ ref: ref(word), label: { en: word, de: '' }, swatch: null })) }, { ref: ref('b'), name: { en: 'B', de: '' }, values: SECOND.map(word => ({ ref: ref(word), label: { en: word, de: '' }, swatch: null })) }]

    sessionStorage.setItem(`sk:new-keepsake:${storeId}`, JSON.stringify({ value: { name: { en: 'Knife', de: '' }, text: { en: '', de: '' } }, photoIds: [], commission: 0, options: many, variants: [], step: 'variants', reached: 2 }))
    renderKeepsakes('/store/products/gifts/new')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add all combinations' }, SLOW))[0]!)
    const form = await screen.findByRole('form', { name: 'Add all combinations' })

    await userEvent.type(within(form).getByLabelText('Price, CHF'), '5')
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }))
    expect(await within(form).findByText(/This adds 56 variants at once/)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Variants' })).not.toHaveTextContent('CHF')
    await userEvent.click(within(form).getByRole('button', { name: 'Add 56 variants' }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Add all combinations' })).not.toBeInTheDocument())
    expect(within(screen.getByRole('navigation', { name: 'Variants' })).getAllByRole('button')).toHaveLength(56)
  })
})
