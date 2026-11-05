import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let serial = 0

function tour(name: string, over: Record<string, unknown> = {}) {
  serial += 1
  return {
    id: `00000000-0000-4000-8000-${String(serial).padStart(12, '0')}`,
    slug: name.toLowerCase().replace(/\W+/g, '-'),
    title: name,
    stayTag: 'both',
    interests: [],
    durationMinutes: 150,
    stopCount: 5,
    coverKey: null,
    cover: null,
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en', 'de'],
    ...over,
  }
}

const asked: URL[] = []
let respond: (url: URL) => Response

async function routerAt(path: string) {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  const { getRouter } = await import('@/router')
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

/** The stubbed API pages like the real one: `limit`, a cursor that is the offset, and `total`. */
function api(all: ReturnType<typeof tour>[], over: { failPageFrom?: number, status?: number } = {}) {
  asked.length = 0
  respond = (url) => {
    asked.push(url)
    if (over.status)
      return Response.json({ title: 'down' }, { status: over.status })
    const start = Number(url.searchParams.get('cursor') ?? 0)
    if (over.failPageFrom !== undefined && start >= over.failPageFrom)
      return Response.json({ title: 'down' }, { status: 503 })
    const limit = Number(url.searchParams.get('limit') ?? all.length)
    return Response.json({ items: all.slice(start, start + limit), total: all.length, nextCursor: start + limit < all.length ? String(start + limit) : null })
  }
}

const many = (count: number) => Array.from({ length: count }, (_, i) => tour(`Walk ${String(i + 1).padStart(2, '0')}`))
const names = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
const loadMore = () => screen.getByRole('button', { name: 'Load more' })

// The full route tree loads on the first test; load it once before any test's own clock starts.
beforeAll(async () => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  await import('@/router')
}, 120_000)

beforeEach(() => {
  window.scrollTo = vi.fn()
  vi.stubGlobal('fetch', async (input: Request) => respond(new URL(input.url)))
})

afterEach(() => vi.unstubAllGlobals())

describe('[ADR-033] the guest tours list reads the API and pages with infinite scroll', { timeout: 60_000 }, () => {
  it('the server HTML holds the first ten cards in the order the API sends, and no eleventh, with the total from the server', async () => {
    api(many(25))

    const html = renderToString(<RouterProvider router={await routerAt('/en/tours')} />)

    expect(html).toContain('Walk 01')
    expect(html).toContain('Walk 10')
    expect(html).not.toContain('Walk 11')
    expect(html.indexOf('Walk 01')).toBeLessThan(html.indexOf('Walk 02'))
    expect(html).toContain('25 tours')
    expect(asked.map(u => u.searchParams.get('limit'))).toEqual(['10'])
  })

  it('a card shows the duration and the stops, opens its own address and shows no price', async () => {
    api([tour('Old town walk', { slug: 'old-town-walk', durationMinutes: 150, stopCount: 6 })])
    render(<RouterProvider router={await routerAt('/en/tours')} />)

    const link = await screen.findByRole('link', { name: /Old town walk/ })

    expect(link).toHaveAttribute('href', '/en/tours/old-town-walk')
    expect(link).toHaveTextContent('2.5 hours · 6 stops')
    expect(document.body.textContent).not.toMatch(/CHF|Fr\./)
  })

  it('load more adds the next ten, says so in a polite live region, and the end line shows when the list is complete', async () => {
    api(many(25))
    render(<RouterProvider router={await routerAt('/en/tours')} />)
    await screen.findByText('Walk 01')

    await userEvent.click(loadMore())
    await waitFor(() => expect(names()).toHaveLength(20))
    expect(screen.getByText('10 more tours')).toHaveAttribute('role', 'status')

    await userEvent.click(loadMore())
    await waitFor(() => expect(names()).toHaveLength(25))
    expect(screen.getByText('That’s all 25 tours')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    expect(asked.map(u => u.searchParams.get('cursor'))).toEqual([null, '10', '20'])
  })

  it('a tour that shows on two pages draws once', async () => {
    const base = many(11)
    api([...base, base[0]!])
    render(<RouterProvider router={await routerAt('/en/tours')} />)
    await screen.findByText('Walk 01')

    await userEvent.click(loadMore())

    await waitFor(() => expect(names()).toHaveLength(11))
    expect(names().filter(name => name === 'Walk 01')).toHaveLength(1)
  })

  it('a failed page shows Try again in place of the button, no toast, and does not retry by itself', async () => {
    api(many(25), { failPageFrom: 10 })
    render(<RouterProvider router={await routerAt('/en/tours')} />)
    await screen.findByText('Walk 01')
    const before = asked.length

    await userEvent.click(loadMore())

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('The next page did not load.')
    expect(document.querySelector('.toast')).toBeNull()
    expect(names()).toHaveLength(10)
    expect(asked.length).toBe(before + 1)
  })

  it('a failed first read shows an error with retry and no demo tour', async () => {
    api([], { status: 503 })
    render(<RouterProvider router={await routerAt('/en/tours')} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('The tours did not load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('no published tour shows the shared empty state', async () => {
    api([])
    render(<RouterProvider router={await routerAt('/en/tours')} />)

    expect(await screen.findByText(/New tours are on their way/)).toBeInTheDocument()
  })

  it('a tour with only a German text, asked for in English, shows the language note and links to its German address', async () => {
    api([tour('Altstadtgang', { slug: 'altstadtgang', language: 'de', requestedLanguage: 'en', fallback: true, availableLanguages: ['de'] })])
    render(<RouterProvider router={await routerAt('/en/tours')} />)

    const link = await screen.findByRole('link', { name: /Altstadtgang/ })

    expect(link).toHaveAttribute('href', '/de/tours/altstadtgang')
    expect(link).toHaveTextContent('Text in German')
  })
})
