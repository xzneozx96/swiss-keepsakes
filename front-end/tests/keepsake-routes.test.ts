import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { routeTree } from '@/routeTree.gen'

/** Which route the real route tree picks for an address, and where a redirect ends up. */
async function open(url: string) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }) })

  await router.load()

  return { id: router.state.matches.at(-1)?.routeId, location: router.state.location }
}

describe('keepsake editor addresses have no /gifts segment', () => {
  it('/store/products/<id> is the editor', async () => {
    expect((await open('/store/products/p1')).id).toBe('/store/products/$productId')
  })

  it('/store/products/new is the create flow', async () => {
    expect((await open('/store/products/new')).id).toBe('/store/products/new')
  })

  it.each([
    ['/store/products/inventory', '/store/products/inventory/'],
    ['/store/products/pickup', '/store/products/pickup'],
    ['/store/products/tours', '/store/products/tours/'],
    ['/store/products/tours/new', '/store/products/tours/new'],
  ])('%s is still its own page', async (url, id) => {
    expect((await open(url)).id).toBe(id)
  })

  it('the old /store/products/gifts/<id> address redirects, keeping the search', async () => {
    const { id, location } = await open('/store/products/gifts/p1?step=review')

    expect(location.pathname).toBe('/store/products/p1')
    expect(location.search).toEqual({ step: 'review' })
    expect(id).toBe('/store/products/$productId')
  })

  it('the old /store/products/gifts/new address redirects to /store/products/new', async () => {
    const { id, location } = await open('/store/products/gifts/new')

    expect(location.pathname).toBe('/store/products/new')
    expect(id).toBe('/store/products/new')
  })
})
