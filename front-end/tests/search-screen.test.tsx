import type { PublicSearchItem } from '@sk/api-contract'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { noIndexHead } from '@/lib/no-index'
import { Route as searchRoute } from '@/routes/_guest/$lang/search'
import { keepsakeCard, mapItem, tourCard } from './support/search-fixtures'
import { storyCard } from './support/story-cards'

// The search runs on the server (ADR-033 slice 6). These tests stub the API the way the real one answers: the text and the kind
// filter the hits, `limit` and a cursor that is the offset page them, and `counts` always covers every kind.
vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))

const asked: URL[] = []
let respond: (url: URL) => Response

const story = (title: string, over = {}): PublicSearchItem => ({ kind: 'story', card: storyCard({ title, slug: title.toLowerCase().replace(/\W+/g, '-'), ...over }) })
const place = (title: string, over = {}): PublicSearchItem => ({ kind: 'place', card: mapItem({ title, ...over }) })
const tour = (title: string): PublicSearchItem => ({ kind: 'tour', card: tourCard({ title }) })
const keepsake = (name: string): PublicSearchItem => ({ kind: 'keepsake', card: keepsakeCard({ name }) })

const titleOf = (item: PublicSearchItem) => (item.kind === 'keepsake' ? item.card.name : item.card.title).toLowerCase()
const kinds = ['story', 'place', 'tour', 'keepsake'] as const

function api(all: PublicSearchItem[], over: { failFrom?: number, status?: number } = {}) {
  asked.length = 0
  respond = (url) => {
    asked.push(url)
    const start = Number(url.searchParams.get('cursor') ?? 0)
    if (over.status || (over.failFrom !== undefined && start >= over.failFrom))
      return Response.json({ title: 'down' }, { status: over.status ?? 503 })
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const interest = url.searchParams.get('interest')
    const kind = url.searchParams.get('kind')
    const matches = all.filter(item => titleOf(item).includes(q) && (!interest || (item.kind === 'keepsake' ? interest === 'shopping-keepsakes' : item.card.interests.includes(interest))))
    const shown = kind ? matches.filter(item => item.kind === kind) : matches
    const limit = Number(url.searchParams.get('limit'))

    return Response.json({
      items: shown.slice(start, start + limit),
      total: shown.length,
      counts: Object.fromEntries(kinds.map(k => [k, matches.filter(item => item.kind === k).length])),
      nextCursor: start + limit < shown.length ? String(start + limit) : null,
    })
  }
}

const lion = [story('Lion story', { interests: ['history-culture'] }), place('Lion Monument', { slug: 'lion-monument', interests: ['history-culture'] }), tour('Old town walk'), keepsake('Lion knife')]

async function renderAt(url = '/en/search') {
  if (url.startsWith('/de'))
    await loadDictionary('de')
  const root = createRootRoute({ component: () => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    </QueryClientProvider>
  ) })
  const search = searchRoute.update({ getParentRoute: () => root, path: '/$lang/search' } as never)
  const pages = ['/$lang/map', '/$lang/stories/$slug', '/$lang/tours/$slug', '/$lang/gifts/$slug', '/$lang/plan'].map(path => createRoute({ getParentRoute: () => root, path, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([search, ...pages]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)
  await screen.findByRole('searchbox')

  return { user: userEvent.setup(), router }
}

const tiles = () => within(screen.getByRole('region', { name: /browse by interest|nach interesse/i })).getAllByRole('button')
const rows = () => within(screen.getByRole('list', { name: /results|suchergebnisse/i })).getAllByRole('link')
const filterRow = () => screen.getByRole('group', { name: 'Filter results' })

beforeEach(() => {
  window.scrollTo = vi.fn()
  vi.stubGlobal('fetch', async (input: Request) => respond(new URL(input.url)))
})

afterEach(() => vi.unstubAllGlobals())

describe('[E4.14][AC94] an empty field shows the five interest tiles and asks nothing', () => {
  it('ac-1 en: the heading, the tiles in order, the focused field, and no request', async () => {
    api(lion)
    await renderAt()

    expect(tiles().map(t => t.textContent)).toEqual(['History and culture', 'Food and drink', 'Lake and mountains', 'Shopping and keepsakes', 'Local activities'])
    expect(tiles().map(t => t.dataset.photo)).toEqual(['musegg-wall', 'pralines', 'lake-steamboat', 'vx-chapel-bridge', 'lucerne-old-town'])
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(asked).toHaveLength(0)
  })

  it('ac-1 de: the German labels and field text', async () => {
    api(lion)
    await renderAt('/de/search')

    expect(tiles().map(t => t.textContent)).toEqual(['Geschichte und Kultur', 'Essen und Trinken', 'See und Berge', 'Shopping und Andenken', 'Lokale Aktivitäten'])
    expect(screen.getByRole('searchbox', { name: 'Sehenswertes, Essen, Anlässe, Touren, Geschichten und Andenken suchen' })).toHaveAttribute('placeholder', 'Löwendenkmal, Bäckerei, Rigi')
  })
})

describe('[ADR-033][slice 6] typing sends one request after the pause, with the text in the address', () => {
  it('typing "lion" quickly asks the server once with q=lion and limit=10, never for "l", "li" or "lio"', async () => {
    api(lion)
    const { user, router } = await renderAt()

    await user.type(screen.getByRole('searchbox'), 'lion')
    await screen.findByText('Lion Monument')

    expect(asked.map(url => Object.fromEntries(url.searchParams))).toEqual([{ lang: 'en', limit: '10', q: 'lion' }])
    expect(router.state.location.search).toMatchObject({ q: 'lion' })
  })

  it('ac-2: one list with a kind per row, a filter row with the server counts, and the count line as a status', async () => {
    api(lion)
    const { user } = await renderAt()

    await user.type(screen.getByRole('searchbox'), 'lion')
    await screen.findByText('Lion Monument')

    expect(rows().map(l => l.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Place'), expect.stringContaining('Story'), expect.stringContaining('Keepsake')]))
    expect(screen.getAllByRole('status').some(region => region.textContent === '3 results for “lion”')).toBe(true)
    expect(filterRow()).toHaveTextContent('All · 3')
    expect(filterRow()).toHaveTextContent('Places on the map · 1')
  })

  it('ac-2 de: the language goes to the server, and the kind labels and count line are German', async () => {
    api(lion)
    const { user } = await renderAt('/de/search')

    await user.type(screen.getByRole('searchbox'), 'lion')

    await waitFor(() => expect(screen.getAllByRole('status').some(region => region.textContent === '3 Treffer für «lion»')).toBe(true))
    expect(asked[0]!.searchParams.get('lang')).toBe('de')
    expect(rows().some(l => l.textContent?.includes('Ort'))).toBe(true)
  })

  it('ac-2: hits of one kind only show no filter row', async () => {
    api(lion)
    const { user } = await renderAt()

    await user.type(screen.getByRole('searchbox'), 'knife')
    await screen.findByText('Lion knife')

    expect(screen.queryByRole('group', { name: 'Filter results' })).not.toBeInTheDocument()
  })

  it('the field stops at the 100 characters the API takes', async () => {
    api(lion)
    await renderAt()

    expect(screen.getByRole('searchbox')).toHaveAttribute('maxlength', '100')
  })
})

describe('[ADR-033][slice 6] a kind filter is a new search from page 1, kept in the address', () => {
  it('choosing Stories asks again with kind=story and no cursor, puts it in the address, and typing a new text drops it', async () => {
    api(lion)
    const { user, router } = await renderAt('/en/search?q=lion')
    await screen.findByText('Lion Monument')

    await user.click(within(filterRow()).getByRole('button', { name: /^Stories/ }))

    await waitFor(() => expect(asked.at(-1)!.searchParams.get('kind')).toBe('story'))
    expect(asked.at(-1)!.searchParams.has('cursor')).toBe(false)
    expect(router.state.location.search).toMatchObject({ q: 'lion', kind: 'story' })
    await waitFor(() => expect(rows()).toHaveLength(1))
    // The counts still cover every kind, so the other chips stay.
    expect(filterRow()).toHaveTextContent('Keepsakes · 1')

    await user.type(screen.getByRole('searchbox'), 's')
    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'lions' }))
  })

  it('a link with ?kind=tour opens with that kind asked for', async () => {
    api(lion)
    await renderAt('/en/search?q=old&kind=tour')

    await screen.findByText('Old town walk')

    expect(asked[0]!.searchParams.get('kind')).toBe('tour')
  })
})

describe('[ADR-033][slice 6] ten a page with infinite scroll', () => {
  const many = Array.from({ length: 25 }, (_, i) => story(`Lake walk ${String(i + 1).padStart(2, '0')}`))

  it('the first page holds ten, "Load more" adds the next ten with the cursor, and the end says how many there are', async () => {
    api(many)
    const { user } = await renderAt('/en/search?q=lake')
    await screen.findByText('Lake walk 01')

    expect(rows()).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(rows()).toHaveLength(20))
    expect(asked.at(-1)!.searchParams.get('cursor')).toBe('10')
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(rows()).toHaveLength(25))

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByText('That’s all 25 results')).toBeInTheDocument()
    expect(new Set(rows().map(r => r.getAttribute('href'))).size).toBe(25)
  })

  it('a failed next page keeps the loaded rows and offers "Try again", which asks for the same page and never loops', async () => {
    api(many, { failFrom: 10 })
    const { user } = await renderAt('/en/search?q=lake')
    await screen.findByText('Lake walk 01')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(rows()).toHaveLength(10)
    const calls = asked.length
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(asked).toHaveLength(calls)

    api(many)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(rows()).toHaveLength(20))
    expect(asked[0]!.searchParams.get('cursor')).toBe('10')
  })

  it('a failed first page shows an error with "Try again", never an empty result', async () => {
    api(many, { status: 503 })
    const { user } = await renderAt('/en/search?q=lake')

    expect(await screen.findByText('Search is not available right now.')).toBeInTheDocument()
    expect(screen.queryByText(/Nothing for/)).not.toBeInTheDocument()

    api(many)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Lake walk 01')).toBeInTheDocument()
  })
})

describe('[E4.14][AC90] rows open the right page', () => {
  it('ac-3: place to the map with its card, story, tour and keepsake to their pages', async () => {
    api([story('Zeta story', { slug: 'zeta' }), place('Zeta place', { slug: 'zeta-place' }), { kind: 'tour', card: tourCard({ title: 'Zeta tour', slug: 'zeta-tour' }) }, { kind: 'keepsake', card: keepsakeCard({ name: 'Zeta keepsake', slug: 'zeta-keepsake' }) }])
    await renderAt('/en/search?q=zeta')
    await screen.findByText('Zeta tour')

    const href = (name: string) => screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href')

    expect(href('Zeta place')).toBe('/en/map?place=zeta-place')
    expect(href('Zeta story')).toBe('/en/stories/zeta')
    expect(href('Zeta tour')).toBe('/en/tours/zeta-tour')
    expect(href('Zeta keepsake')).toBe('/en/gifts/zeta-keepsake')
  })
})

describe('[E4.14][AC94] a tile asks the server for its interest and the chip clears', () => {
  it('ac-4: the tile sends interest and no text, the chip and the count line show, and clearing returns to the tiles', async () => {
    api(lion)
    const { user } = await renderAt()

    await user.click(tiles()[0]!)
    await screen.findByText('Lion Monument')

    expect(Object.fromEntries(asked[0]!.searchParams)).toEqual({ lang: 'en', limit: '10', interest: 'history-culture' })
    expect(screen.getAllByRole('status').some(region => region.textContent === '2 results in History and culture')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Clear History and culture' }))

    expect(tiles()).toHaveLength(5)
  })

  it('the tile is in the address, so a shared link opens it, and a long ?q= is cut to the 100 characters the API takes', async () => {
    api(lion)
    const { router } = await renderAt('/en/search?interest=history-culture')
    await screen.findByText('Lion Monument')

    expect(router.state.location.search).toMatchObject({ interest: 'history-culture' })
    expect(asked[0]!.searchParams.get('interest')).toBe('history-culture')
  })

  it('a ?q= of 150 characters asks the API for 100', async () => {
    api(lion)
    await renderAt(`/en/search?q=${'a'.repeat(150)}`)

    await waitFor(() => expect(asked).toHaveLength(1))
    expect(asked[0]!.searchParams.get('q')).toHaveLength(100)
  })

  it('ac-4 de: the count line in German', async () => {
    api(lion)
    const { user } = await renderAt('/de/search')

    await user.click(tiles()[0]!)

    await waitFor(() => expect(screen.getAllByRole('status').some(region => region.textContent === '2 Treffer in Geschichte und Kultur')).toBe(true))
  })

  it('ac-4: typing replaces the chosen tile', async () => {
    api(lion)
    const { user } = await renderAt()

    await user.click(tiles()[0]!)
    await user.type(screen.getByRole('searchbox'), 'knife')

    expect(screen.queryByRole('button', { name: /^Clear History/ })).not.toBeInTheDocument()
  })
})

describe('[E4.14][AC54] no price, noindex', () => {
  it('ac-5: keepsake results show no CHF and no price', async () => {
    api(lion)
    await renderAt('/en/search?q=knife')
    await screen.findByText('Lion knife')

    expect(document.body.textContent).not.toMatch(/CHF|Fr\.|€/)
  })

  it('ac-5: the route sends noindex, renders in the browser only', () => {
    expect(searchRoute.options.ssr).toBe(false)
    expect(searchRoute.options.head?.({} as never)).toMatchObject(noIndexHead())
  })
})

describe('[E4.14][AC94] no results', () => {
  it('ac-6: the plain message, the tiles and the advice banner', async () => {
    api(lion)
    await renderAt('/en/search?q=zzzz')

    expect(await screen.findByText('Nothing for “zzzz” yet')).toBeInTheDocument()
    expect(tiles()).toHaveLength(5)
    expect(screen.getByRole('link', { name: /Ask me where to go/ })).toHaveAttribute('href', '/en/plan')
  })

  it('ac-6 de: the no-results line in German', async () => {
    api(lion)
    await renderAt('/de/search?q=zzzz')

    expect(await screen.findByText('Noch nichts zu «zzzz»')).toBeInTheDocument()
  })

  it('the status region stays mounted while its text changes between count and no-match', async () => {
    api(lion)
    const { user } = await renderAt()
    // The count line is the first live region; the list adds its own for new rows.
    const region = screen.getAllByRole('status')[0]!

    await user.type(screen.getByRole('searchbox'), 'lion')
    await waitFor(() => expect(region).toHaveTextContent('3 results for “lion”'))
    await user.type(screen.getByRole('searchbox'), 'zzz')
    await waitFor(() => expect(region).toHaveTextContent('Nothing for “lionzzz” yet'))
  })
})
