import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { HomeEnding } from '@/features/home/components/home-ending'

import { HomeHero } from '@/features/home/components/home-hero'
import { MapInvitation } from '@/features/home/components/map-invitation'
import { ServiceTiles } from '@/features/home/components/service-tiles'
import { fetchMapCategories, fetchMapPins } from '@/features/map/api/map-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, enName: string | null, deName: string | null, extra: Partial<PublicCategory> = {}): PublicCategory {
  return { id: id(n), slug, name: { en: enName, de: deName }, parentId: null, icon: 'water', showOnHome: true, position: n, ...extra }
}

function pin(n: number, categoryIds: string[]): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    title: `Pin ${n}`,
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }
}

const water = category(1, 'drinking-water', 'Drinking water', 'Trinkwasser')
const toilets = category(2, 'toilets', 'Toilets', 'Toiletten', { icon: 'toilet' })
const lockers = category(3, 'lockers', 'Luggage lockers', null, { icon: 'locker' })
const museums = category(4, 'museums', 'Museums', 'Museen', { showOnHome: false })
const unused = category(5, 'sim', 'SIM and Wi-Fi', 'SIM und WLAN')
const categories = [water, toilets, lockers, museums, unused]
const pins = [pin(1, [water.id]), pin(2, [toilets.id]), pin(3, [lockers.id]), pin(4, [museums.id])]

/** The cart and the search icon of the hero read the demo store, as they do on the page. */
function renderAt(url: string, element: React.ReactNode) {
  const demo = startSeedDemo()
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataClientProvider client={demo.dataClient}>
          <LocaleProvider>
            <DemoProvider store={demo.store}>
              <Outlet />
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/$lang',
    loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined,
    component: () => element,
  })
  const others = ['map', 'search', 'plan'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)

  return router
}

function TilesThenText() {
  return (
    <>
      <ServiceTiles />
      <p>after</p>
    </>
  )
}

function InvitationAndTiles() {
  return (
    <>
      <MapInvitation />
      <ServiceTiles />
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue(pins)
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue(categories)
})

describe('[E4.13][AC95] the service tiles block', () => {
  it('draws a tile per Show on the home category with a pin, in order, each a link to the map with its category (AC-1)', async () => {
    renderAt('/en', <ServiceTiles />)

    await screen.findByRole('link', { name: 'Drinking water' })
    const section = screen.getByRole('region', { name: en['homePage.services.title'] })
    const links = within(section).getAllByRole('link')

    expect(links.map(link => link.textContent)).toEqual(['Drinking water', 'Toilets', 'Luggage lockers'])
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/en/map?category=drinking-water', '/en/map?category=toilets', '/en/map?category=lockers'])
    expect(within(section).queryByText('Museums')).toBeNull()
    expect(within(section).queryByText('SIM and Wi-Fi')).toBeNull()
    expect(section.querySelectorAll('li svg')).toHaveLength(3)
    expect(screen.getByText(en['homePage.services.body'])).toBeInTheDocument()
  })

  it('prints no count, and no price', async () => {
    renderAt('/en', <ServiceTiles />)
    await screen.findByRole('link', { name: 'Drinking water' })
    const section = screen.getByRole('region', { name: en['homePage.services.title'] })

    expect(section.textContent).not.toMatch(/\d|CHF/)
  })

  it('a category named in English only shows the English name with the language tag for a German guest (AC-3)', async () => {
    renderAt('/de', <ServiceTiles />)

    const link = await screen.findByRole('link', { name: /Luggage lockers/ })

    expect(within(link).getByText(de['map.card.onlyIn.en'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trinkwasser' })).toBeInTheDocument()
  })

  it('shows tile-shaped skeletons while the map reads load, and no heading yet', async () => {
    vi.mocked(fetchMapCategories).mockReturnValue(new Promise(() => {}))
    renderAt('/en', <ServiceTiles />)

    const skeleton = await waitFor(() => {
      const found = document.querySelector('[data-skeleton="service-tiles"]')

      expect(found).toBeInTheDocument()

      return found!
    })

    expect(skeleton.querySelectorAll('li')).toHaveLength(6)
    expect(skeleton.className).toContain('grid-cols-3')
  })

  it('draws nothing, not even the heading, when no category has a tile (AC-2)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([])

    renderAt('/en', <TilesThenText />)
    await screen.findByText('after')
    await waitFor(() => expect(fetchMapCategories).toHaveBeenCalled())
    await waitFor(() => expect(document.querySelector('[data-skeleton="service-tiles"]')).toBeNull())

    expect(document.querySelector('section')).toBeNull()
    expect(screen.queryByText(en['homePage.services.title'])).toBeNull()
  })

  it('a failed read shows an error with retry in the block, the other blocks still render, and retry reads again (AC-6)', async () => {
    vi.mocked(fetchMapCategories).mockRejectedValueOnce(new Error('down'))
    renderAt('/en', <InvitationAndTiles />)

    const alert = await screen.findByRole('alert')

    expect(within(alert).getByText(en['homePage.services.failed'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['homePage.map.action'] })).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(await screen.findByRole('link', { name: 'Drinking water' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('[E4.13][AC95] the map invitation', () => {
  it('is one link to the map holding the title, the words and the aerial, with curated photos from the library', async () => {
    renderAt('/en', <MapInvitation />)

    const link = await screen.findByRole('link', { name: en['homePage.map.action'] })

    expect(link).toHaveAttribute('href', '/en/map')
    expect(screen.getByRole('heading', { level: 2, name: en['homePage.map.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['homePage.map.body'])).toBeInTheDocument()
    expect(link.querySelectorAll('img[src*="wmts.geo.admin.ch"]').length).toBeGreaterThan(3)
    expect(link.querySelectorAll('img:not([src*="wmts.geo.admin.ch"])').length).toBeGreaterThanOrEqual(4)
    expect(link.textContent).not.toMatch(/\d|CHF/)
  })

  it('speaks German', async () => {
    renderAt('/de', <MapInvitation />)

    expect(await screen.findByRole('link', { name: 'Karte öffnen' })).toHaveAttribute('href', '/de/map')
    expect(screen.getByRole('heading', { level: 2, name: 'Zum ersten Mal in Luzern?' })).toBeInTheDocument()
  })
})

describe('[E4.13][AC24][AC54] the hero and the ending', () => {
  it('the hero keeps the shipped greeting and its search pill opens search', async () => {
    renderAt('/en', <HomeHero />)

    expect(await screen.findByText(en['home.hello'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(en['home.searchPrompt']) })).toHaveAttribute('href', '/en/search')
  })

  it('the ending shows the Victorinox showcase without prices, the thread line, and the advice banner opening the demo form', async () => {
    const items = [{ slug: 'victorinox-swan', name: 'Victorinox Swan', fromLabel: '', price: '', pickupLine: '' }]

    renderAt('/en', <HomeEnding isLoading={false} items={items} />)

    expect(await screen.findByRole('heading', { name: 'Victorinox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Swan' })).toHaveAttribute('href', '/en/gifts/victorinox-swan')
    expect(screen.getByRole('link', { name: en['homePage.ending.seeAll'] })).toBeInTheDocument()
    expect(screen.getByText(en['homePage.ending.line'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(en['home.advice.action']) })).toHaveAttribute('href', '/en/plan')
    expect(document.body.textContent).not.toContain('CHF')
  })
})
