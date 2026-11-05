import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, writes } from './keepsakes-harness'
import { serverProductPage } from './support/pages'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

const base = `/api/store/${storeId}/products`
const second = '0198a000-0000-7000-8000-0000000000a2'

beforeEach(setUpHarness)

type Item = Record<string, unknown>

// The server pages, filters and counts (serverProductPage). A removal changes what it serves next: `after` says how (default: the row is gone).
function serve(items: Item[], remove: (call: { method: string, path: string }) => Response | undefined, after?: (item: Item) => Item) {
  let current = items
  state.answer = (call) => {
    if (call.method === 'GET' && call.path.split('?')[0] === base)
      return Response.json(serverProductPage(current as never, new URL(call.path, 'http://x')))
    const answered = remove(call)
    if (answered?.ok && call.method === 'DELETE')
      current = current.flatMap(item => (item.id === call.path.split('/').at(-1) ? (after ? [after(item)] : []) : [item]))

    return answered
  }
}

async function openMenu(name: string) {
  const grid = await screen.findByRole('grid', { name: 'Keepsakes' })

  await userEvent.click(within(grid).getByRole('button', { name: `Actions for ${name}` }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
}

describe('[E6.1][remove] the list row menu', () => {
  it('[E6.1][remove] a keepsake with no orders: the dialog says it is deleted, and the row leaves when the server answers', async () => {
    serve([listItem({ name: { en: 'Classic' }, rowVersion: 3 }), listItem({ id: second, name: { en: 'Other' } })], call =>
      call.method === 'DELETE' && call.path === `${base}/${productId}` ? Response.json({ id: productId, outcome: 'deleted' }) : undefined)
    renderKeepsakes('/store/products')
    await screen.findAllByText('Classic')

    await openMenu('Classic')
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).getByText('Delete Classic?')).toBeInTheDocument()
    expect(within(dialog).getByText('It can’t be undone. Its photos stay in your library.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Classic')).not.toBeInTheDocument())
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0)
    expect(writes()).toEqual([expect.objectContaining({ method: 'DELETE', path: `${base}/${productId}`, ifMatch: '3', key: expect.any(String) })])
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('[E6.1][remove] a keepsake with orders: the dialog says it is archived; after the answer the row leaves the default list and shows under Archived', async () => {
    serve([listItem({ name: { en: 'Sold' }, status: 'published', hasOrders: true })], call =>
      call.method === 'DELETE' ? Response.json({ id: productId, outcome: 'archived' }) : undefined, item => ({ ...item, status: 'archived' }))
    renderKeepsakes('/store/products')
    await screen.findAllByText('Sold')

    await openMenu('Sold')
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).getByText('Archive Sold?')).toBeInTheDocument()
    expect(within(dialog).getByText('Sold has orders, so it will be archived: guests no longer see it, its orders keep working. This can’t be undone.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(screen.queryByText('Sold')).not.toBeInTheDocument())
  })

  it('[E6.1][remove] a refusal stays inside the dialog and the row stays', async () => {
    serve([listItem({ name: { en: 'Classic' } })], call => (call.method === 'DELETE' ? problem(412, 'precondition-failed') : undefined))
    renderKeepsakes('/store/products')
    await screen.findAllByText('Classic')

    await openMenu('Classic')
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Someone saved this keepsake after you opened it')
    expect(screen.getAllByText('Classic').length).toBeGreaterThan(0)
  })

  it('[E6.1][remove] an archived keepsake has no menu', async () => {
    serve([listItem({ id: second, name: { en: 'Current' } }), listItem({ name: { en: 'Old' }, status: 'archived' })], () => undefined)
    renderKeepsakes('/store/products')
    await screen.findAllByText('Current')
    expect(screen.queryByText('Old')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Status' }))
    const popover = await screen.findByRole('dialog', { name: 'Status' })

    await userEvent.click(within(popover).getByRole('checkbox', { name: /^Archived/ }))
    await userEvent.keyboard('{Escape}')
    const grid = await screen.findByRole('grid', { name: 'Keepsakes' })

    expect(await within(grid).findByText('Old')).toBeInTheDocument()
    expect(within(grid).queryByRole('button', { name: 'Actions for Old' })).not.toBeInTheDocument()
  })
})

describe('[E6.1][remove] the editor', () => {
  it('[E6.1][remove] Delete in the header asks, deletes with the version and returns to the list', async () => {
    const detail = `${base}/${productId}`
    state.answer = (call) => {
      if (call.method === 'GET' && call.path === detail)
        return Response.json(product({ rowVersion: 5 }))
      if (call.method === 'GET' && call.path.split('?')[0] === base)
        return Response.json(serverProductPage([], new URL(call.path, 'http://x')))
      if (call.method === 'DELETE' && call.path === detail)
        return Response.json({ id: productId, outcome: 'deleted' })

      return undefined
    }
    const router = renderKeepsakes(`/store/products/${productId}`)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete keepsake' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).getByText('Delete Victorinox Classic?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/store/products'))
    expect(writes()).toEqual([expect.objectContaining({ method: 'DELETE', path: detail, ifMatch: '5' })])
  })

  it('[E6.1][remove] an archived keepsake opens as a notice, not an editor', async () => {
    state.answer = call => (call.method === 'GET' && call.path === `${base}/${productId}` ? Response.json(product({ status: 'archived', slug: { en: 'x' } })) : undefined)
    renderKeepsakes(`/store/products/${productId}`)

    expect(await screen.findByText(/This keepsake is archived/)).toBeInTheDocument()
    expect(screen.queryByTestId('keepsake-editor')).not.toBeInTheDocument()
  })
})
