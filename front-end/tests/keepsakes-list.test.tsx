import { dateTimeFormat } from '@sk/domain/shared'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, productId, renderKeepsakes, setUpHarness, state, storeId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

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

    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Keepsake', 'Variants', 'Status', 'Last update', 'Actions'])
    expect(within(grid).getByText('1 variant')).toBeInTheDocument()
    expect(within(grid).getByText('2 variants · 1 sold out')).toBeInTheDocument()
    expect(within(grid).getByText('3 variants')).toBeInTheDocument()
    expect(within(grid).getByText('Published')).toBeInTheDocument()
    expect(within(grid).getByText('Draft')).toBeInTheDocument()
    expect(within(grid).getByText('Published · edits not live')).toBeInTheDocument()
    expect(within(grid).getByText('Messer')).toBeInTheDocument()
  })

  it('[E6.1][list] has no tours tab and a Status filter but no category filter, and Create opens the create flow', async () => {
    answerWith([listItem()])
    renderKeepsakes('/store/products')

    await loaded('Victorinox Classic')
    expect(screen.queryByText(/tours|categor/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /categor/i })).not.toBeInTheDocument()
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

const stamp = (iso: string) => dateTimeFormat('en-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const rowNames = (grid: HTMLElement) => within(grid).getAllByRole('row').slice(1).map(row => within(row).queryByRole('rowheader')?.textContent)

describe('[T-006][list] the keepsake list matches the Places list', () => {
  const items = () => [
    listItem({ name: { en: 'Victorinox Classic' }, updatedAt: '2026-10-30T08:00:00.000Z' }),
    listItem({ id: second, name: { en: 'SwissCard Lite' }, status: 'published', updatedAt: '2026-10-29T10:30:00.000Z' }),
    listItem({ id: third, name: { de: 'Taschenmesser' }, updatedAt: '2026-10-28T07:15:00.000Z' }),
  ]

  it('[T-006][AC-1] has the search box and the Status filter button above the four columns', async () => {
    answerWith(items())
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Victorinox Classic')

    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Keepsake', 'Variants', 'Status', 'Last update', 'Actions'])
  })

  it('[T-006][AC-2] searches the name as I type, and finds a keepsake that has only a German name', async () => {
    answerWith(items())
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Victorinox Classic')
    const box = screen.getByRole('searchbox', { name: 'Search by name' })

    await userEvent.type(box, 'swiss')
    await waitFor(() => expect(rowNames(grid)).toEqual(['SwissCard Lite']))
    await userEvent.clear(box)
    await userEvent.type(box, 'taschen')
    await waitFor(() => expect(rowNames(grid)).toEqual(['Taschenmesser']))
  })

  it('[T-006][AC-3] the Status filter keeps the chosen rows, shows a removable chip and counts each option', async () => {
    answerWith(items())
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Victorinox Classic')

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    const popover = await screen.findByRole('dialog', { name: 'Status' })

    expect(within(popover).getAllByRole('checkbox').map(box => box.closest('.checkbox')?.textContent)).toEqual(['Draft2', 'Published1', 'Published · edits not live0'])
    await userEvent.click(within(popover).getByRole('checkbox', { name: /^Draft/ }))
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(rowNames(grid)).toEqual(['Victorinox Classic', 'Taschenmesser']))
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Status: Draft' }))
    await waitFor(() => expect(rowNames(grid)).toHaveLength(3))
    expect(screen.queryByRole('button', { name: /Remove filter/ })).not.toBeInTheDocument()
  })

  it('[T-006][AC-4] says that nothing matches and offers to clear, never "No keepsakes yet"', async () => {
    answerWith(items())
    renderKeepsakes('/store/products')

    await loaded('Victorinox Classic')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name' }), 'zzz')

    expect((await screen.findAllByText('No keepsake matches. Try another word or remove a filter.')).length).toBeGreaterThan(0)
    expect(screen.queryByText('No keepsakes yet.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect((await screen.findAllByText('Victorinox Classic')).length).toBeGreaterThan(0)
    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear search and filters' })).not.toBeInTheDocument()
  })

  it('[T-006][AC-5] shows the date and time of the last update in the Places format', async () => {
    answerWith(items())
    renderKeepsakes('/store/products')

    const { grid } = await loaded('Victorinox Classic')

    expect(within(grid).getByText(stamp('2026-10-30T08:00:00.000Z'))).toBeInTheDocument()
    expect(within(grid).getByText(stamp('2026-10-29T10:30:00.000Z'))).toBeInTheDocument()
  })

  it('[T-006][AC-6] a phone card shows the name, the variants, the status chip and the last update', async () => {
    answerWith([items()[1]!])
    renderKeepsakes('/store/products')

    const { cards } = await loaded('SwissCard Lite')

    expect(within(cards).getByText('1 variant')).toBeInTheDocument()
    expect(within(cards).getByText('Published')).toBeInTheDocument()
    expect(within(cards).getByText(stamp('2026-10-29T10:30:00.000Z'))).toBeInTheDocument()
  })

  it('[T-006][AC-6] the loading cards have the chip row and the update line of a real card', async () => {
    state.answer = call => (call.method === 'GET' && call.path === base ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderKeepsakes('/store/products')

    await screen.findByRole('grid', { name: 'Keepsakes' })
    const loading = document.querySelectorAll('ul[aria-hidden] > li')

    expect(loading.length).toBeGreaterThan(0)
    // thumbnail + title + variants line + status chip + update line + menu
    expect(loading[0]!.querySelectorAll('[data-slot="skeleton"], .skeleton').length).toBeGreaterThanOrEqual(6)
    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toBeDisabled()
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

    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Andenken', 'Varianten', 'Status', 'Zuletzt geändert', 'Aktionen'])
    expect(within(grid).getByText('2 Varianten · 1 ausverkauft')).toBeInTheDocument()
    expect(within(grid).getByText('1 Variante')).toBeInTheDocument()
    expect(within(grid).getByText('Veröffentlicht')).toBeInTheDocument()
    expect(within(grid).getByText('Entwurf')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Erstellen' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  })
})
