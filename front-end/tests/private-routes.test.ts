import type { AnyRoute } from '@tanstack/react-router'
import { createRouter } from '@tanstack/react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { noIndexHead } from '@/lib/no-index'
import { isPrivatePath, PRIVATE_PREFIXES, privateHeaders } from '@/lib/private-routes'

/** A route's own option wins; otherwise it inherits the nearest parent's, as the router does for `ssr`. */
function effectiveSsr(route: AnyRoute): unknown {
  for (let current: AnyRoute | undefined = route; current; current = current.parentRoute as AnyRoute | undefined) {
    if (current.options.ssr !== undefined)
      return current.options.ssr
  }

  return undefined
}

/** Heads merge from parent to child, so a route yields the noindex meta when it or a parent does. */
function hasNoIndex(route: AnyRoute): boolean {
  for (let current: AnyRoute | undefined = route; current; current = current.parentRoute as AnyRoute | undefined) {
    const head = current.options.head as (() => unknown) | undefined
    const meta = (head?.() as { meta?: { name?: string, content?: string }[] } | undefined)?.meta

    if (meta?.some(item => item.name === 'robots' && item.content === 'noindex'))
      return true
  }

  return false
}

describe('private routes', () => {
  let routes: AnyRoute[] = []

  beforeAll(async () => {
    // jsdom has no CSS.supports, which one screen reads when its module loads.
    vi.stubGlobal('CSS', { supports: () => false })
    const { routeTree } = await import('@/routeTree.gen')

    // Building the router fills in each route's full path and parent.
    routes = Object.values(createRouter({ routeTree }).routesById as unknown as Record<string, AnyRoute>)
      .filter(route => route.fullPath && route.fullPath !== '/')
  }, 60_000)

  it('[E3.3][AC12] reads real routes from the generated tree', () => {
    expect(routes.length).toBeGreaterThan(40)
    expect(routes.some(route => route.fullPath === '/partner/$token')).toBe(true)
  })

  it('[E3.3][AC12] every client-only route with the noindex head sits under a private prefix', () => {
    const strays = routes
      .filter(route => effectiveSsr(route) === false && hasNoIndex(route))
      .filter(route => !isPrivatePath(route.fullPath))

    expect(strays.map(route => route.fullPath)).toEqual([])
  })

  it('[E3.3][AC12] every route under a private prefix is client-only and yields the noindex meta', () => {
    const privateRoutes = routes.filter(route => isPrivatePath(route.fullPath))

    expect(privateRoutes.length).toBeGreaterThan(20)
    expect(privateRoutes.filter(route => effectiveSsr(route) !== false).map(route => route.fullPath)).toEqual([])
    expect(privateRoutes.filter(route => !hasNoIndex(route)).map(route => route.fullPath)).toEqual([])
  })

  it.each(PRIVATE_PREFIXES)('[E3.3][AC12] treats %s and its sub-paths as private', (prefix) => {
    expect(isPrivatePath(prefix)).toBe(true)
    expect(isPrivatePath(`${prefix}/x`)).toBe(true)
    expect(isPrivatePath(`${prefix}/x/y`)).toBe(true)
    expect(privateHeaders(prefix)['X-Robots-Tag']).toBe('noindex')
  })

  it.each(['/partner/abc/def', '/store/orders'])('[E3.3][AC12] treats %s as private', (path) => {
    expect(isPrivatePath(path)).toBe(true)
  })

  it.each(['/stories', '/store-x', '/gifts', '/', '/rx', '/labs'])('[E3.3][AC12] treats %s as public', (path) => {
    expect(isPrivatePath(path)).toBe(false)
    expect(privateHeaders(path)).toEqual({})
  })

  it('[E3.3][AC12] sends no-referrer for the partner area only', () => {
    expect(privateHeaders('/partner')).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
    expect(privateHeaders('/partner/abc')).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
    expect(privateHeaders('/store')).toEqual({ 'X-Robots-Tag': 'noindex' })
  })

  it.each(['/Partner/abc', '/PARTNER', '/PARTNER/some-token/x', '/pArTnEr/abc', '/%50artner/x', '/%70artner/x', '/partner%2Fabc', '/%50artner/abc%E0', '/%50ARTNER/abc%ZZ', '/%50artner/tok%'])('[E3.3][AC12] sends the partner headers for %s', (path) => {
    expect(privateHeaders(path)).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
  })

  it.each(['/Store/orders', '/STORE', '/ADMIN', '/Lab', '/%53tore', '/R/abc', '/Sign-In', '/%53tore/%', '/%53tore/%E0%A4%A'])('[E3.3][AC12] sends noindex for the case variant %s', (path) => {
    expect(isPrivatePath(path)).toBe(true)
    expect(privateHeaders(path)).toEqual({ 'X-Robots-Tag': 'noindex' })
  })

  it.each(['//partner/abc', '///partner/abc', '/partner//abc', '//%50artner//abc'])('[E3.3][AC12] sends the partner headers for the repeated slashes in %s', (path) => {
    expect(privateHeaders(path)).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
  })

  it.each(['//store', '///admin/x', '//r/abc'])('[E3.3][AC12] treats %s as private', (path) => {
    expect(isPrivatePath(path)).toBe(true)
  })

  it.each(['//stories', '//store-x'])('[E3.3][AC12] keeps %s public', (path) => {
    expect(isPrivatePath(path)).toBe(false)
  })

  it.each(['/Stories', '/STORE-X', '/%', '/%E0%A4%A', '/Labs'])('[E3.3][AC12] keeps %s public and does not throw on a bad escape', (path) => {
    expect(privateHeaders(path)).toEqual({})
  })

  it('[E3.3][AC12] adds a robots noindex meta', () => {
    expect(noIndexHead()).toEqual({ meta: [{ name: 'robots', content: 'noindex' }] })
  })
})
