import type { SearchKind, SearchSources } from '@/features/search/lib/search'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { SearchScreen } from '@/features/search/components/search-screen'
import { noIndexHead } from '@/lib/no-index'
import { Route as searchRoute } from '@/routes/_guest/$lang/search'
import { keepsakeCard, mapItem, tourCard } from './support/search-fixtures'
import { storyCard } from './support/story-cards'

const none: SearchSources = { stories: [], pins: [], tours: [], keepsakes: [] }

const full: SearchSources = {
  stories: [storyCard({ title: 'Lion story', slug: 'lion-story', interests: ['history-culture'] })],
  pins: [mapItem({ title: 'Lion Monument', slug: 'lion-monument', interests: ['history-culture'] })],
  tours: [tourCard({ title: 'Old town walk', slug: 'old-town-walk', interests: ['food-drink'] })],
  keepsakes: [keepsakeCard({ name: 'Lion knife', slug: 'lion-knife' })],
}

// The route reads its lists through this hook; the tests below give it the fixtures and keep the route, its `?q=` and its screen real.
vi.mock('@/features/search/api/search-reads', () => ({ useSearchSources: () => ({ sources: full, failed: [], isLoading: false }) }))

interface Options {
  sources?: SearchSources
  failed?: SearchKind[]
  isLoading?: boolean
  url?: string
}

async function renderScreen({ sources = full, failed = [], isLoading = false, url = '/en/search' }: Options = {}) {
  if (url.startsWith('/de'))
    await loadDictionary('de')
  const root = createRootRoute({ component: () => (
    <LocaleProvider>
      <SearchScreen failed={failed} isLoading={isLoading} sources={sources} urlQuery="" onQueryCommit={() => {}} />
    </LocaleProvider>
  ) })
  const pages = ['/$lang/search', '/$lang/map', '/$lang/stories/$slug', '/$lang/tours/$slug', '/$lang/gifts/$slug', '/$lang/plan'].map(path => createRoute({ getParentRoute: () => root, path, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren(pages), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)
  await screen.findByRole('searchbox')

  return userEvent.setup()
}

const tiles = () => within(screen.getByRole('region', { name: /browse by interest|nach interesse/i })).getAllByRole('button')

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('[E4.14][AC94] an empty field shows the five interest tiles', () => {
  it('ac-1 en: the heading, the tiles in order and the focused field', async () => {
    await renderScreen()

    expect(tiles().map(t => t.textContent)).toEqual(['History and culture', 'Food and drink', 'Lake and mountains', 'Shopping and keepsakes', 'Local activities'])
    expect(tiles().map(t => t.dataset.photo)).toEqual(['musegg-wall', 'pralines', 'lake-steamboat', 'vx-chapel-bridge', 'lucerne-old-town'])
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(screen.getByRole('searchbox', { name: 'Search sights, food, events, tours, stories and keepsakes' })).toHaveAttribute('placeholder', 'Lion Monument, bakery, Rigi…')
  })

  it('ac-1 de: the German labels and field text', async () => {
    await renderScreen({ url: '/de/search' })

    expect(tiles().map(t => t.textContent)).toEqual(['Geschichte und Kultur', 'Essen und Trinken', 'See und Berge', 'Shopping und Andenken', 'Lokale Aktivitäten'])
    expect(screen.getByRole('searchbox', { name: 'Sehenswertes, Essen, Anlässe, Touren, Geschichten und Andenken suchen' })).toHaveAttribute('placeholder', 'Löwendenkmal, Bäckerei, Rigi')
  })
})

describe('[E4.14][AC94] typing returns one list with kinds and a filter', () => {
  it('ac-2: a kind label per row, a filter row with counts, and the count line as a status', async () => {
    const user = await renderScreen()

    await user.type(screen.getByRole('searchbox'), 'lion')
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBe(3))

    const list = screen.getByRole('list', { name: /results/i })

    expect(within(list).getAllByRole('link').map(l => l.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Place'), expect.stringContaining('Story'), expect.stringContaining('Keepsake')]))
    expect(screen.getByRole('status')).toHaveTextContent('3 results for “lion”')
    expect(screen.getByRole('group', { name: 'Filter results' })).toHaveTextContent('All3')
    expect(screen.getByRole('group', { name: 'Filter results' })).toHaveTextContent('Places on the map1')
  })

  it('ac-2: a filter narrows the list', async () => {
    const user = await renderScreen()

    await user.type(screen.getByRole('searchbox'), 'lion')
    await user.click(await screen.findByRole('group', { name: 'Filter results' }).then(r => within(r).getByText('Stories')))

    expect(within(screen.getByRole('list', { name: /results/i })).getAllByRole('link')).toHaveLength(1)
  })

  it('ac-2: matches of one kind only show no filter row', async () => {
    const user = await renderScreen()

    await user.type(screen.getByRole('searchbox'), 'knife')
    await screen.findByText('Lion knife')

    expect(screen.queryByRole('group', { name: 'Filter results' })).not.toBeInTheDocument()
  })

  it('ac-2 de: kind labels and the count line in German', async () => {
    const user = await renderScreen({ url: '/de/search' })

    await user.type(screen.getByRole('searchbox'), 'lion')

    expect(await screen.findByRole('status')).toHaveTextContent('3 Treffer für «lion»')
    const kinds = within(screen.getByRole('list', { name: 'Suchergebnisse' })).getAllByRole('link').map(l => l.textContent)

    expect(kinds.some(k => k?.includes('Ort'))).toBe(true)
    expect(kinds.some(k => k?.includes('Geschichte'))).toBe(true)
    expect(kinds.some(k => k?.includes('Andenken'))).toBe(true)
  })

  it('ac-2: "lowen" finds Löwendenkmal', async () => {
    const user = await renderScreen({ sources: { ...none, pins: [mapItem({ title: 'Löwendenkmal' })] } })

    await user.type(screen.getByRole('searchbox'), 'lowen')

    expect(await screen.findByText('Löwendenkmal')).toBeInTheDocument()
  })
})

describe('[E4.14][AC90] rows open the right page', () => {
  it('ac-3: place to the map with its card, story, tour and keepsake to their pages', async () => {
    const user = await renderScreen({
      sources: {
        stories: [storyCard({ title: 'Zeta story', slug: 'zeta' })],
        pins: [mapItem({ title: 'Zeta place', slug: 'zeta-place' })],
        tours: [tourCard({ title: 'Zeta tour', slug: 'zeta-tour' })],
        keepsakes: [keepsakeCard({ name: 'Zeta keepsake', slug: 'zeta-keepsake' })],
      },
    })

    await user.type(screen.getByRole('searchbox'), 'zeta')
    await screen.findByText('Zeta tour')

    const href = (name: string) => screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href')

    expect(href('Zeta place')).toBe('/en/map?place=zeta-place')
    expect(href('Zeta story')).toBe('/en/stories/zeta')
    expect(href('Zeta tour')).toBe('/en/tours/zeta-tour')
    expect(href('Zeta keepsake')).toBe('/en/gifts/zeta-keepsake')
  })
})

describe('[E4.14][AC94] a tile lists its items and the chip clears', () => {
  it('ac-4: the chip, the count line and the clear button', async () => {
    const user = await renderScreen()

    await user.click(tiles()[0]!)

    expect(screen.getByRole('status')).toHaveTextContent('2 results in History and culture')
    expect(screen.getByText('Lion Monument')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear History and culture' }))

    expect(tiles()).toHaveLength(5)
  })

  it('ac-4 de: the count line in German', async () => {
    const user = await renderScreen({ url: '/de/search' })

    await user.click(tiles()[0]!)

    expect(screen.getByRole('status')).toHaveTextContent('2 Treffer in Geschichte und Kultur')
  })

  it('ac-4: typing replaces the chosen tile', async () => {
    const user = await renderScreen()

    await user.click(tiles()[0]!)
    await user.type(screen.getByRole('searchbox'), 'knife')

    expect(screen.queryByRole('button', { name: /^Clear History/ })).not.toBeInTheDocument()
  })
})

describe('[E4.14][AC54] no price, noindex', () => {
  it('ac-5: keepsake results show no CHF and no price', async () => {
    const user = await renderScreen()

    await user.type(screen.getByRole('searchbox'), 'knife')
    await screen.findByText('Lion knife')

    expect(document.body.textContent).not.toMatch(/CHF|Fr\.|€/)
  })

  it('ac-5: the route sends noindex, renders in the browser only', () => {
    expect(searchRoute.options.ssr).toBe(false)
    expect(searchRoute.options.head?.({} as never)).toMatchObject(noIndexHead())
  })
})

describe('[E4.14][AC94] the route binds the field to ?q=', () => {
  it('ac-4: /en/search?q=lion opens with "lion" in the field and its results listed', async () => {
    const root = createRootRoute({ component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ) })
    const search = searchRoute.update({ getParentRoute: () => root, path: '/$lang/search' } as never)
    const pages = ['/$lang/map', '/$lang/stories/$slug', '/$lang/tours/$slug', '/$lang/gifts/$slug', '/$lang/plan'].map(path => createRoute({ getParentRoute: () => root, path, component: () => null }))
    const router = createRouter({ routeTree: root.addChildren([search, ...pages]), history: createMemoryHistory({ initialEntries: ['/en/search?q=lion'] }) })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('searchbox')).toHaveValue('lion')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 results for “lion”'))
    expect(within(screen.getByRole('list', { name: /results/i })).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/en/map?place=lion-monument', '/en/stories/lion-story', '/en/gifts/lion-knife']),
    )
  })
})

describe('[E4.14][AC94] no results and a failed read', () => {
  it('ac-6: the plain message, real suggestions, the tiles and the advice banner', async () => {
    const user = await renderScreen()

    await user.type(screen.getByRole('searchbox'), 'zzzz')

    expect(await screen.findByText('Nothing for “zzzz” yet')).toBeInTheDocument()
    expect(screen.getByText(/Lion Monument/)).toBeInTheDocument()
    expect(tiles()).toHaveLength(5)
    expect(screen.getByRole('link', { name: /Ask me where to go/ })).toHaveAttribute('href', '/en/plan')
  })

  it('ac-6 de: the no-results line in German', async () => {
    const user = await renderScreen({ url: '/de/search' })

    await user.type(screen.getByRole('searchbox'), 'zzzz')

    expect(await screen.findByText('Noch nichts zu «zzzz»')).toBeInTheDocument()
  })

  it('ac-6: with no names to suggest, the hint is not shown (EN)', async () => {
    const user = await renderScreen({ sources: none })

    await user.type(screen.getByRole('searchbox'), 'zzzz')

    expect(await screen.findByText('Nothing for “zzzz” yet')).toBeInTheDocument()
    expect(screen.queryByText(/look around the map/)).not.toBeInTheDocument()
  })

  it('ac-6 de: with no names to suggest, the hint is not shown', async () => {
    const user = await renderScreen({ sources: none, url: '/de/search' })

    await user.type(screen.getByRole('searchbox'), 'zzzz')

    expect(await screen.findByText('Noch nichts zu «zzzz»')).toBeInTheDocument()
    expect(screen.queryByText(/auf der Karte/)).not.toBeInTheDocument()
  })

  it('the status region stays mounted while its text changes between count and no-match', async () => {
    const user = await renderScreen()

    const region = screen.getByRole('status')

    expect(region).toBeEmptyDOMElement()
    await user.type(screen.getByRole('searchbox'), 'lion')
    await waitFor(() => expect(region).toHaveTextContent('3 results for “lion”'))
    await user.type(screen.getByRole('searchbox'), 'zzz')
    await waitFor(() => expect(region).toHaveTextContent('Nothing for “lionzzz” yet'))
    expect(screen.getByRole('status')).toBe(region)
  })

  it('ac-6: a failed keepsake read still shows the other kinds, with a notice', async () => {
    const user = await renderScreen({ sources: { ...full, keepsakes: [] }, failed: ['keepsake'] })

    await user.type(screen.getByRole('searchbox'), 'lion')

    expect(await screen.findByText('Lion Monument')).toBeInTheDocument()
    expect(screen.getByText('Keepsakes could not be loaded. Showing the rest.')).toBeInTheDocument()
  })

  it('a pending read shows a skeleton status instead of the list', async () => {
    const user = await renderScreen({ sources: none, isLoading: true })

    await user.type(screen.getByRole('searchbox'), 'lion')

    expect(await screen.findByText('Searching…')).toBeInTheDocument()
    expect(screen.queryByText(/Nothing for/)).not.toBeInTheDocument()
  })
})
