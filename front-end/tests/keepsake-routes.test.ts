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

  it('the old /store/products/gifts/... addresses are gone and open neither the editor of that keepsake nor the create flow (owner, 04.11.2026)', async () => {
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/store/products/gifts/p1'] }) })

    await router.load()
    expect(router.state.matches.some(m => (m.params as { productId?: string }).productId === 'p1')).toBe(false)
    expect((await open('/store/products/gifts/new')).id).not.toBe('/store/products/new')
  })
})
