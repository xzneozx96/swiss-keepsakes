import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Vitest runs the server branch of `createIsomorphicFn`, so the request headers are stubbed here.
const request = vi.hoisted(() => ({ headers: {} as Record<string, string> }))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: (name: string) => request.headers[name],
}))

let routeTree: typeof import('@/routeTree.gen').routeTree

/** Loads the address, follows any redirect, and returns where the router ends up as `path?search#hash`. The 302 status is checked against the built server. */
async function landAt(url: string) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }) })

  await router.load()

  return router.state.location.href
}

beforeAll(async () => {
  // jsdom has no CSS.supports, which one screen reads when its module loads.
  vi.stubGlobal('CSS', { supports: () => false })
  routeTree = (await import('@/routeTree.gen')).routeTree
}, 60_000)

beforeEach(() => {
  request.headers = {}
})

describe('[E3.5] redirects to a language home', () => {
  it('sends / to the cookie language', async () => {
    request.headers.cookie = 'theme=x; sk_lang=de'

    expect(await landAt('/')).toBe('/de')
  })

  it('sends / to de for a German browser with no cookie', async () => {
    request.headers['accept-language'] = 'de-CH,de;q=0.9'

    expect(await landAt('/')).toBe('/de')
  })

  it('lets the cookie win over the browser language', async () => {
    request.headers.cookie = 'sk_lang=en'
    request.headers['accept-language'] = 'de-CH'

    expect(await landAt('/')).toBe('/en')
  })

  it('sends / to en with no cookie and an English browser', async () => {
    expect(await landAt('/')).toBe('/en')
  })

  it.each([
    ['/stories?x=1', '/en/stories?x=1'],
    ['/stories/some-slug', '/en/stories/some-slug'],
    ['/tours/some-slug', '/en/tours/some-slug'],
    ['/gifts', '/en/gifts'],
    ['/search?q=a', '/en/search?q=a'],
    ['/plan', '/en/plan'],
    ['/plan/sent', '/en/plan/sent'],
    ['/credits', '/en/credits'],
    ['/stories#top', '/en/stories#top'],
  ])('sends %s to %s', async (url, href) => {
    expect(await landAt(url)).toBe(href)
  })

  it('uses the cookie language for an old path', async () => {
    request.headers.cookie = 'theme=x; sk_lang=de'

    expect(await landAt('/tours/some-slug')).toBe('/de/tours/some-slug')
  })

  it.each(['/cart', '/en/stories', '/de', '/unknown'])('does not redirect %s', async (url) => {
    expect(await landAt(url)).toBe(url)
  })
})
