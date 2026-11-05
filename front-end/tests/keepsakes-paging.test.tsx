import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listItem, renderKeepsakes, setUpHarness, state, storeId } from './keepsakes-harness'
import { serverProductPage } from './support/pages'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

const base = `/api/store/${storeId}/products`
const idOf = (n: number) => `0198a000-0000-7000-8000-0000000003${String(n).padStart(2, '0')}`

beforeEach(setUpHarness)

// 25 keepsakes: every fourth published (7), the rest drafts (18), 2 more archived. The server pages, filters and counts them.
function many() {
  return [
    ...Array.from({ length: 25 }, (_, index) => listItem({ id: idOf(index), name: { en: `Knife ${String(index + 1).padStart(2, '0')}` }, status: index % 4 === 0 ? 'published' : 'draft' })),
    listItem({ id: idOf(90), name: { en: 'Old knife' }, status: 'archived' }),
    listItem({ id: idOf(91), name: { en: 'Older knife' }, status: 'archived' }),
  ]
}

function serve() {
  const items = many()

  state.answer = call => (call.method === 'GET' && call.path.split('?')[0] === base ? Response.json(serverProductPage(items as never, new URL(call.path, 'http://x'))) : undefined)
}

const reads = () => state.calls.filter(call => call.method === 'GET' && call.path.split('?')[0] === base).map(call => new URL(call.path, 'http://x').searchParams)
const here = (router: { state: { location: { search: unknown } } }) => router.state.location.search
const table = () => within(screen.getByRole('grid', { name: 'Keepsakes' }))

describe('[ADR-033] the keepsake table reads numbered pages from the server', () => {
  it('asks for page 1 of 10, shows that page and the pager from the server total (archived left out)', async () => {
    serve()
    renderKeepsakes('/store/products')

    await screen.findAllByText('Knife 01')

    expect(table().getAllByRole('row')).toHaveLength(11)
    expect(Object.fromEntries(reads().at(-1)!)).toEqual({ page: '1', pageSize: '10' })
    expect(screen.getAllByText('1–10 of 25').length).toBeGreaterThan(0)
  })

  it('a page link reads that page and puts it in the URL', async () => {
    serve()
    const router = renderKeepsakes('/store/products')
    await screen.findAllByText('Knife 01')

    await userEvent.click(screen.getAllByLabelText('Page 3')[0]!)

    await waitFor(() => expect(table().getAllByText('Knife 21').length).toBeGreaterThan(0))
    expect(reads().at(-1)!.get('page')).toBe('3')
    expect(here(router)).toEqual({ page: 3 })
  })

  it('the filter and the page open from the URL, and a new filter starts again at page 1', async () => {
    serve()
    const router = renderKeepsakes('/store/products?status=draft&page=2')
    await screen.findAllByText('Knife 15')

    expect(Object.fromEntries(reads().at(-1)!)).toEqual({ status: 'draft', page: '2', pageSize: '10' })
    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Status' })).getByRole('checkbox', { name: /^Published(?! ·)/ }))

    await waitFor(() => expect(here(router)).toEqual({ status: ['draft', 'published'] }))
    await waitFor(() => expect(Object.fromEntries(reads().at(-1)!)).toEqual({ status: 'draft,published', page: '1', pageSize: '10' }))
  })

  it('the counts on the filter come from the API, not from the rows on the page', async () => {
    serve()
    renderKeepsakes('/store/products')
    await screen.findAllByText('Knife 01')

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    const popover = await screen.findByRole('dialog', { name: 'Status' })

    // 18 drafts, 7 published and 2 archived; only 10 rows are on the page.
    expect(within(popover).getAllByRole('checkbox').map(box => box.closest('.checkbox')?.textContent)).toEqual(['Draft18', 'Published7', 'Archived2', 'Published · edits not live0'])
  })

  it('the search is sent once, a moment after the last key, and starts again at page 1', async () => {
    serve()
    const router = renderKeepsakes('/store/products?page=2')
    await screen.findAllByText('Knife 11')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name' }), 'Knife 07')

    await waitFor(() => expect(here(router)).toEqual({ q: 'Knife 07' }))
    expect(Object.fromEntries(reads().at(-1)!)).toEqual({ q: 'Knife 07', page: '1', pageSize: '10' })
    expect(reads().filter(read => read.has('q'))).toHaveLength(1)
  })

  it('a page past the end moves to the last page that exists', async () => {
    serve()
    const router = renderKeepsakes('/store/products?page=9')

    await waitFor(() => expect(here(router)).toEqual({ page: 3 }))
    await screen.findAllByText('Knife 21')
  })

  it('clear search and filters empties the address when a filter hides every row', async () => {
    serve()
    const router = renderKeepsakes('/store/products?q=nothing')

    await userEvent.click(await screen.findByRole('button', { name: 'Clear search and filters' }))

    await waitFor(() => expect(here(router)).toEqual({}))
    await screen.findAllByText('Knife 01')
  })
})
