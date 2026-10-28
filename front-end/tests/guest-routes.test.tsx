import { createMemoryHistory, isNotFound } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

// The full route tree pulls in modules that probe CSS.supports at import time; jsdom has none.
async function routerAt(path: string) {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  const { getRouter } = await import('@/router')
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  return router
}

describe('guest routes under /$lang', { timeout: 60_000 }, () => {
  it('matches the language-prefixed stories list', async () => {
    const ids = (await routerAt('/de/stories')).matchRoutes('/de/stories').map(m => m.routeId)
    expect(ids).toContain('/_guest/$lang/stories/')
  })

  it('keeps the cart outside the language prefix', async () => {
    const ids = (await routerAt('/cart')).matchRoutes('/cart').map(m => m.routeId)
    expect(ids).toContain('/_guest/cart')
  })

  it('answers 404 for an unknown language', async () => {
    const router = await routerAt('/xx/stories')
    await router.load()
    // A notFound thrown by a route's beforeLoad is handed to the nearest boundary, the root, as its match error.
    expect(router.state.matches.some(match => isNotFound(match.error))).toBe(true)
  })

  it('does not answer 404 for a known language', async () => {
    const router = await routerAt('/de/stories')
    await router.load()
    expect(router.state.matches.some(match => isNotFound(match.error))).toBe(false)
  })
})
