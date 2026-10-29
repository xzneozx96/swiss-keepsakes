import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, productId, renderKeepsakes, setUpHarness, state, storeId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const base = `/api/store/${storeId}/products`
const second = '0198a000-0000-7000-8000-0000000000a2'
const third = '0198a000-0000-7000-8000-0000000000a3'

beforeEach(setUpHarness)

/** The grid and the card list once `text` is on screen: the loading rows are another element, so wait for the text first. */
async function loaded(text: string, label = 'Keepsakes', wait?: { timeout: number }) {
  await screen.findAllByText(text, undefined, wait)

  return { grid: await screen.findByRole('grid', { name: label }, wait), cards: await screen.findByRole('list', { name: label }, wait) }
}

function answerWith(items: Record<string, unknown>[]) {
  state.answer = call => (call.method === 'GET' && call.path === base ? Response.json(list(items)) : undefined)
}

describe('[E6.1][list] M11 the keepsake list in English', () => {
  it('[E6.1][list] shows the name, the variant count with the sold-out count, and the status of each keepsake', async () => {
    answerWith([
      listItem({ name: { en: 'Classic' }, status: 'published', variantCount: 1 }),
      listItem({ id: second, name: { de: 'Messer' }, variantCount: 2, soldOutCount: 1 }),
      listItem({ id: third, name: { en: 'Edited' }, status: 'published', hasUnpublishedEdits: true, variantCount: 3, cover: null }),
    ])
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Classic')

    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Keepsake', 'Variants', 'Status', 'Actions'])
    expect(within(grid).getByText('1 variant')).toBeInTheDocument()
    expect(within(grid).getByText('2 variants · 1 sold out')).toBeInTheDocument()
    expect(within(grid).getByText('3 variants')).toBeInTheDocument()
    expect(within(grid).getByText('Published')).toBeInTheDocument()
    expect(within(grid).getByText('Draft')).toBeInTheDocument()
    expect(within(grid).getByText('Published · edits not live')).toBeInTheDocument()
    expect(within(grid).getByText('Messer')).toBeInTheDocument()
  })

  it('[E6.1][list] has no tours tab and no category filter, and Create opens the create flow', async () => {
    answerWith([listItem()])
    renderKeepsakes('/store/products')

    await loaded('Victorinox Classic')
    expect(screen.queryByText(/tours|categor/i)).not.toBeInTheDocument()
    const create = screen.getByRole('link', { name: 'Create' })

    expect(create).toHaveAttribute('href', '/store/products/gifts/new')
  })

  it('[E6.1][list] a row opens its keepsake, and the phone card does too', async () => {
    answerWith([listItem({ name: { en: 'Classic' } })])
    renderKeepsakes('/store/products')

    const { cards } = await loaded('Classic')

    expect(within(cards).getByRole('link')).toHaveAttribute('href', `/store/products/gifts/${productId}`)
    expect(within(cards).getByText('1 variant')).toBeInTheDocument()
  })

  it('[E6.1][list] shows loading rows shaped like the table while the list is on its way', async () => {
    state.answer = call => (call.method === 'GET' && call.path === base ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderKeepsakes('/store/products')

    const grid = await screen.findByRole('grid', { name: 'Keepsakes' })

    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'true'))
  })

  it('[E6.1][list] says so when there is no keepsake', async () => {
    answerWith([])
    renderKeepsakes('/store/products')

    expect((await screen.findAllByText('No keepsakes yet.')).length).toBeGreaterThan(0)
  })

  it('[E6.1][list] shows a refusal with a retry that reads again', async () => {
    state.answer = call => (call.path === base ? problem(500, 'internal-error') : undefined)
    renderKeepsakes('/store/products')

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Something went wrong. Try again in a moment.')
    expect(alert).toHaveTextContent('Reference: req-1')
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(state.calls.filter(call => call.path === base)).toHaveLength(2))
  })

  it('[E6.1][list] names the row menu after the keepsake and offers Edit', async () => {
    answerWith([listItem({ name: { en: 'Classic' } })])
    renderKeepsakes('/store/products')

    await loaded('Classic')
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Classic' })[0]!)

    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toHaveAttribute('href', `/store/products/gifts/${productId}`)
  })
})

// The German tests load the lazy German chunk and run slower than the default wait under load.
const SLOW = { timeout: 8000 }

describe('[E6.1][i18n] M11 the keepsake list in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E6.1][i18n] shows the title, the columns, the counts and the statuses in German', async () => {
    answerWith([
      listItem({ name: { de: 'Klassik' }, status: 'published', variantCount: 2, soldOutCount: 1 }),
      listItem({ id: second, name: { de: 'Messerchen' }, variantCount: 1 }),
    ])
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Klassik', 'Andenken', SLOW)

    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Andenken', 'Varianten', 'Status', 'Aktionen'])
    expect(within(grid).getByText('2 Varianten · 1 ausverkauft')).toBeInTheDocument()
    expect(within(grid).getByText('1 Variante')).toBeInTheDocument()
    expect(within(grid).getByText('Veröffentlicht')).toBeInTheDocument()
    expect(within(grid).getByText('Entwurf')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Erstellen' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  })
})
