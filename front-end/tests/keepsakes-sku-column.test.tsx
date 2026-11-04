import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list, listItem, product, productId, renderKeepsakes, setUpHarness, state, storeId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

afterEach(() => vi.restoreAllMocks())

const base = `/api/store/${storeId}/products`
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`
const optSize = id(0xC1)
const sizeValues = [id(0xC2), id(0xD2)]
const option = { id: optSize, name: { en: 'Size' }, values: [{ id: sizeValues[0]!, label: { en: 'Small' } }, { id: sizeValues[1]!, label: { en: 'Large' } }] }
const variantsOf = (codes: (string | null)[]) => sizeValues.map((value, index) => ({ id: id(0xA0 + index), skuCode: codes[index]!, mediaId: null, photo: null, priceRappen: 4000, status: 'published' as const, values: { [optSize]: value } }))

async function openWith(codes: (string | null)[]) {
  const current = product({ options: [option], variants: variantsOf(codes) })

  await setUpHarness()
  state.answer = call => (call.method === 'GET' && call.path === `${base}/${productId}` ? Response.json(current) : call.method === 'GET' && call.path === base ? Response.json(list([listItem()])) : undefined)
  renderKeepsakes(`/store/products/${productId}?step=options`)
  await screen.findByRole('region', { name: 'Variants' }, { timeout: 8000 })

  return within(screen.getByRole('region', { name: 'Variants' })).getAllByTestId('variant-row')
}

describe('[T-018][AC7] the SKU code has its own column on wide screens', () => {
  beforeEach(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

  it('[T-018][AC7] with codes on, a row has a code column between the photo and the values, and the code is not inside the values cell', async () => {
    const [first] = await openWith(['K-0', 'K-1'])
    const code = within(first!).getByRole('button', { name: 'Edit the SKU code of Small' })

    expect(first!.className).toMatch(/lg:grid-cols-\[[^\]]*14rem[^\]]*\]/)
    // The values cell turns into plain grid cells on lg, so the code is a cell of its own; below lg it is stacked under the chips.
    expect(code.parentElement!.className).toContain('lg:contents')
    const chips = code.parentElement!.querySelector('ul')!

    expect(chips).not.toBeNull()
    // Before the chips in the markup (so before them on lg), stacked under them below lg, centred on the row, wrapping rather than truncating.
    expect(code.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(code.className).toContain('max-lg:order-last')
    expect(code.className).toContain('lg:self-center')
    expect(code.className).not.toContain('truncate')
    expect(code).toHaveAttribute('title', 'K-0')
  })

  it('[T-018][AC7] a row with no code keeps an empty cell so the codes of the other rows still line up', async () => {
    const [first] = await openWith([null, 'K-1'])

    expect(within(first!).queryByRole('button', { name: /SKU code/ })).not.toBeInTheDocument()
    expect(first!.querySelector('[data-testid="sku-cell-empty"]')).not.toBeNull()
  })

  it('[T-018][AC7] with codes off the row has no code column and no empty cell', async () => {
    const [first] = await openWith([null, null])

    expect(first!.className).not.toMatch(/14rem/)
    expect(first!.querySelector('[data-testid="sku-cell-empty"]')).toBeNull()
  })
})
