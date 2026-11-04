import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { PlaceDetail } from '@/features/map/lib/place-detail'

import type { MapSearch } from '@/features/map/lib/search-params'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate, useSearch } from '@tanstack/react-router'
import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { fetchMapCategories, fetchMapPin, fetchMapPins } from '@/features/map/api/map-client'

import { MapScreen } from '@/features/map/components/map-screen'
import { validateMapSearch } from '@/features/map/lib/search-params'
import { resetAnswersStoreForTests, saveAnswers } from '@/features/onboarding/lib/answers-store'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

// The first map of a file loads the kit's modules, which takes longer than a second when the machine is busy.
configure({ asyncUtilTimeout: 5000 })

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))
vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, parentId: string | null, position: number, en: string, de: string): PublicCategory {
  return { id: id(n), slug: `c${n}`, name: { en, de }, parentId, icon: null, showOnHome: false, position }
}

const walks = category(1, null, 0, 'Walks', 'Spaziergänge')
const photo = category(2, null, 1, 'Photo spots', 'Fotospots')
const food = category(3, null, 2, 'Food and drink', 'Essen und Trinken')
const bakeries = category(4, food.id, 0, 'Bakeries', 'Bäckereien')
const categories = [walks, photo, food, bakeries]

function pin(n: number, title: string, categoryIds: string[], extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05 + n * 0.01,
    longitude: 8.3 + n * 0.01,
    title,
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
    ...extra,
  }
}

// A is in two categories, B has none, C only in a sub-category (the server adds the parent), D is in Food, E is an event with a story.
const pinA = pin(1, 'Chapel Bridge', [walks.id, photo.id], { hasMainStory: true, mainStorySlug: 'chapel-bridge-story' })
const pinB = pin(2, 'Hotel am See', [])
const pinC = pin(3, 'Baeckerei Weinmarkt', [bakeries.id, food.id])
const pinD = pin(4, 'Wine Market', [food.id])
const pinE = pin(5, 'Organ Concert', [], { nextDate: { firstDay: '2026-11-07', lastDay: '2026-11-07', startTime: '18:00', endTime: '19:30' } })
const pins = [pinA, pinB, pinC, pinD, pinE]

/** What the pin read answers for a pin of the list: only the pins the tests care about have more than the basics. */
function detailOf(item: PublicMapItem): PlaceDetail {
  const base: PlaceDetail = {
    id: item.id,
    title: item.title,
    language: item.language,
    tip: `Tip for ${item.title}`,
    latitude: item.latitude,
    longitude: item.longitude,
    address: null,
    mapsLink: null,
    hours: [],
    nextDate: item.nextDate,
    link: null,
    photos: [],
    mainStory: null,
    otherStories: [],
  }

  if (item.id === pinA.id) {
    return {
      ...base,
      address: 'Kapellbrücke, Luzern',
      mapsLink: 'https://www.google.com/maps/place/Chapel+Bridge/@47.06,8.31,17z',
      hours: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, opens: '08:00', closes: '18:00' })),
      mainStory: { slug: 'chapel-bridge-story', title: 'The oldest wooden bridge', readMinutes: 6 },
      otherStories: [{ slug: 'lucerne-in-a-day', title: 'Lucerne in one day', readMinutes: 4 }],
    }
  }
  if (item.id === pinB.id)
    return { ...base, link: 'https://hotel-am-see.example/rooms' }

  return base
}

function MapAtRoute() {
  const { place, category, dated } = useSearch({ strict: false }) as MapSearch
  const navigate = useNavigate()

  return <MapScreen category={category} dated={dated} place={place} onSearchChange={search => void navigate({ to: '.', search, replace: true })} />
}

function renderMap(url = '/en/map') {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider>
          <Outlet />
        </LocaleProvider>
      </QueryClientProvider>
    ),
  })
  const map = createRoute({
    getParentRoute: () => root,
    path: '/$lang/map',
    validateSearch: validateMapSearch,
    loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined,
    component: MapAtRoute,
  })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => null })
  const story = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([map, home, story]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)

  return router
}

let currentRouter: ReturnType<typeof renderMap>

/** The map draws its style and its first view (the map's `idle`): the pins and the controls appear. */
async function loaded(url?: string) {
  currentRouter = renderMap(url)
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  act(() => FakeMap.instances[0]!.emit('load'))
  act(() => FakeMap.instances[0]!.emit('idle'))
}

const pinButton = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })
const allPinButtons = () => screen.getAllByRole('button', { pressed: false }).filter(button => button.hasAttribute('data-pin-return'))

beforeEach(() => {
  resetFakeMaps()
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue(pins)
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue(categories)
  vi.mocked(fetchMapPin).mockReset().mockImplementation(async id => detailOf(pins.find(candidate => candidate.id === id)!))
})

async function choose(...names: string[]) {
  await userEvent.click(screen.getByRole('button', { name: /^Categories/ }))
  const dialog = await screen.findByRole('dialog')
  const all = within(dialog).getByRole<HTMLInputElement>('checkbox', { name: new RegExp(en['map.filter.all']) })

  // The sheet opens with the current choice (every category when there is none): clear it, then tick the chosen ones.
  for (let i = 0; i < 2 && (all.checked || all.indeterminate); i++)
    await userEvent.click(all)
  for (const name of names)
    await userEvent.click(within(dialog).getByRole('checkbox', { name: new RegExp(name) }))
  await userEvent.click(within(dialog).getByRole('button', { name: /^Show \d+ place/ }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

describe('[E4.6][states] loading, empty and failed', () => {
  it('shows the map skeleton, the controls skeleton and "Loading the map" while the map loads', async () => {
    vi.mocked(fetchMapPins).mockReturnValue(new Promise(() => {}))
    renderMap()

    expect(await screen.findByText(en['map.loadingMap'])).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="map"]')).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="map-controls"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en['map.categories'] })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: en['map.heading'] })).toBeInTheDocument()
  })

  it('keeps the map skeleton until the map has drawn its first view, then fades it out', async () => {
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    // The style is loaded but the tiles are not drawn yet: still the skeleton, no controls.
    act(() => FakeMap.instances[0]!.emit('load'))
    await screen.findByText(en['map.loadingMap'])
    expect(document.querySelector('[data-skeleton="map-controls"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en['map.categories'] })).toBeNull()

    act(() => FakeMap.instances[0]!.emit('idle'))

    expect(await screen.findByRole('button', { name: en['map.categories'] })).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="map"]')).toHaveClass('opacity-0')
    await waitFor(() => expect(document.querySelector('[data-skeleton="map"]')).toBeNull())
  })

  it('shows "Loading places…" once the map is drawn and the places are still on the way', async () => {
    vi.mocked(fetchMapPins).mockReturnValue(new Promise(() => {}))
    await loaded()

    expect(await screen.findByText(en['map.loading'])).toBeInTheDocument()
  })

  it('shows a message and a way to Explore when no pin is published', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([])
    await loaded()

    expect(await screen.findByText(en['map.empty.title'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['map.empty.action'] })).toHaveAttribute('href', '/en')
    expect(screen.queryByRole('button', { name: en['map.categories'] })).toBeNull()
  })

  it('shows a failure and Try again, which reads the list again', async () => {
    vi.mocked(fetchMapPins).mockRejectedValueOnce(new Error('offline'))
    await loaded()

    expect(await screen.findByRole('alert')).toHaveTextContent(en['map.failed.title'])
    await userEvent.click(screen.getByRole('button', { name: en['map.failed.retry'] }))

    expect(await screen.findByRole('button', { name: pinButton('Chapel Bridge').getAttribute('aria-label')! })).toBeInTheDocument()
    expect(fetchMapPins).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the same failure when the map cannot load, and Try again builds a new map', async () => {
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    expect(await screen.findByRole('alert')).toHaveTextContent(en['map.failed.title'])
    await userEvent.click(screen.getByRole('button', { name: en['map.failed.retry'] }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
  })
})

describe('[E4.6][AC88] the filter dims on the map and filters the card row and the list', () => {
  it('puts every pin on the map with no filter', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })

    // The first place's card is open on load, so its pin is the pressed one.
    expect(allPinButtons()).toHaveLength(4)
    expect(screen.getAllByRole('button', { pressed: true }).filter(button => button.hasAttribute('data-pin-return'))).toHaveLength(1)
    expect(allPinButtons().some(button => /dimmed/.test(button.getAttribute('aria-label')!))).toBe(false)
  })

  it('dims the pins outside a chosen category, hides none, and keeps only the chosen ones in the list', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await choose('Photo spots')

    // All five stay on the map; only the pin in the category is lit.
    expect(allPinButtons().length + screen.queryAllByRole('button', { pressed: true }).length).toBe(5)
    expect(pinButton('Hotel am See')).toHaveAccessibleName(/dimmed/)
    expect(pinButton('Wine Market')).toHaveAccessibleName(/dimmed/)
    expect(pinButton('Chapel Bridge')).not.toHaveAccessibleName(/dimmed/)
    expect(screen.getByRole('button', { name: en['map.categoriesCount'].replace('{count}', '1') })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    const list = screen.getByRole('list')

    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Chapel Bridge')).toBeInTheDocument()
  })

  it('lights a pin in two categories under each of them', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await choose('Walks')
    expect(pinButton('Chapel Bridge')).not.toHaveAccessibleName(/dimmed/)

    await choose('Photo spots')
    expect(pinButton('Chapel Bridge')).not.toHaveAccessibleName(/dimmed/)
  })

  it('lets a parent category cover a pin tagged only with its sub-category', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await choose('Food and drink')

    expect(pinButton('Baeckerei Weinmarkt')).not.toHaveAccessibleName(/dimmed/)
    expect(pinButton('Wine Market')).not.toHaveAccessibleName(/dimmed/)
    expect(pinButton('Hotel am See')).toHaveAccessibleName(/dimmed/)

    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      expect.stringContaining('Baeckerei Weinmarkt'),
      expect.stringContaining('Wine Market'),
    ])
  })

  it('shows a pin with no category only under All', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })

    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    expect(within(screen.getByRole('list')).getByText('Hotel am See')).toBeInTheDocument()
    await choose('Walks', 'Photo spots', 'Food and drink')
    // Ticking every category is the same as no filter, so the pin with none is back.
    expect(screen.getByRole('button', { name: en['map.categories'] })).toBeInTheDocument()
    expect(pinButton('Hotel am See')).not.toHaveAccessibleName(/dimmed/)
  })
})

describe('[E4.6][AC88] a filter that matches nothing', () => {
  it('says so in both views, opens no card, and forgets the card that was open', async () => {
    vi.mocked(fetchMapCategories).mockResolvedValue([...categories, category(5, null, 3, 'Boat trips', 'Bootsfahrten')])
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })
    await choose('Boat trips')

    expect(screen.getByText(en['map.none.title'])).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Hotel am See' })).toBeNull()
    expect(allPinButtons()).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    expect(screen.getByText(en['map.none.title'])).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()

    // Back to All: the card that was open before the filter does not come back by itself.
    await userEvent.click(screen.getByRole('button', { name: en['map.filter.clear'] }))
    expect(screen.queryByText(en['map.none.title'])).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: 'Hotel am See' })).toBeNull()
    expect(screen.getByRole('button', { name: en['map.categories'] })).toBeInTheDocument()
  })
})

describe('[E4.5][AC93][AC44] the answers order the card row and the list alike', () => {
  afterEach(() => resetAnswersStoreForTests())

  it('sinks a multi-day pin in both views for a short stay and hides none', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([pin(1, 'Mountain hike', [], { stayTag: 'multi_day' }), pin(2, 'Old town walk', [], { stayTag: 'short_stay' }), pin(3, 'Wine bar', [], { stayTag: 'both' })])
    saveAnswers({ stay: 'short_stay', interests: [] })
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })

    const row = await screen.findByRole('region', { name: '3 places' })
    const cardTitles = within(row).getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)

    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    const listTitles = within(screen.getByRole('list')).getAllByRole('listitem').map(item => item.querySelector('[lang]')!.textContent)

    expect(cardTitles).toEqual(['Old town walk', 'Wine bar', 'Mountain hike'])
    expect(listTitles).toEqual(cardTitles)
  })
})

describe('[E4.6][AC93] the Map and List switch', () => {
  it('lists the same pins in the same order as the card row, under the same filter', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await choose('Food and drink')

    // The filter opened the card row on its first place.
    const row = await screen.findByRole('region', { name: '2 places' })
    const cardTitles = within(row).getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)

    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    const listTitles = within(screen.getByRole('list')).getAllByRole('listitem').map(item => item.querySelector('[lang]')!.textContent)

    expect(cardTitles).toEqual(['Baeckerei Weinmarkt', 'Wine Market'])
    expect(listTitles).toEqual(cardTitles)
  })

  it('opens the same card from a list row and goes back to the map', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    await userEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /Wine Market/ }))

    const title = await screen.findByRole('heading', { level: 2, name: 'Wine Market' })

    expect(screen.getByRole('button', { name: en['map.view.list'] })).toBeInTheDocument()
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('reaches the controls and every list row with Tab', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    const rows = within(screen.getByRole('list')).getAllByRole('button')

    expect(rows).toHaveLength(5)
    rows.forEach(row => expect(row).not.toHaveAttribute('tabindex', '-1'))
  })

  it('takes the map and its pins out of the tab order and the accessibility tree while the list covers them', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    const pins = document.querySelectorAll('button[data-pin-return]')

    expect(pins.length).toBe(5)
    pins.forEach(button => expect(button.closest('[inert]')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))

    const list = screen.getByRole('list')

    // jsdom keeps inert elements in the tree, so check the attribute: every pin sits inside an inert box, no row does.
    document.querySelectorAll('button[data-pin-return]').forEach((button) => {
      if (list.contains(button))
        expect(button.closest('[inert]')).toBeNull()
      else
        expect(button.closest('[inert]')).not.toBeNull()
    })
    await userEvent.click(screen.getByRole('button', { name: en['map.view.map'] }))
    document.querySelectorAll('button[data-pin-return]').forEach(button => expect(button.closest('[inert]')).toBeNull())
  })
})

describe('[E4.6][AC42] a pin opens its card', () => {
  it('opens the card with the title and moves focus to it', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))

    const title = await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })

    await waitFor(() => expect(title).toHaveFocus())
    expect(pinButton('Hotel am See')).toHaveAttribute('aria-pressed', 'true')
    expect(within(title.closest('article')!).getByRole('button', { name: en['map.card.more'] })).toBeInTheDocument()
  })

  it('shows the place icon on the pin and on the card of a pin with no photo', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    const title = await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })

    expect(pinButton('Hotel am See').querySelector('svg')).not.toBeNull()
    expect(title.closest('article')!.querySelector('[aria-hidden] svg')).not.toBeNull()
    expect(document.querySelector('img')).toBeNull()
  })

  it('[E4.7][N03] shows the cover photo of a pin on its map pin, its card and its list row', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue(pins.map(item => (item.id === pinB.id ? { ...item, photoUrl: 'https://media.test/hotel/w320.webp' } : item)))
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    const title = await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })

    expect(pinButton('Hotel am See').querySelector('img')).toHaveAttribute('src', 'https://media.test/hotel/w320.webp')
    expect(title.closest('article')!.querySelector('img')).toHaveAttribute('src', 'https://media.test/hotel/w320.webp')
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    expect(document.querySelectorAll('img[src="https://media.test/hotel/w320.webp"]').length).toBeGreaterThan(0)
  })

  it('shows the next date of a pin that has dates', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Organ Concert'))

    expect(await screen.findByText(/Sat 7 Nov, 18:00–19:30/)).toBeInTheDocument()
    expect(pinButton('Organ Concert')).toHaveAccessibleName(/Event, Sat 7 Nov/)
  })

  it('closes the card with the button and returns focus to the pin', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })
    await userEvent.click(screen.getByRole('button', { name: en['map.card.close'] }))

    expect(screen.queryByRole('heading', { level: 2, name: 'Hotel am See' })).toBeNull()
    await waitFor(() => expect(pinButton('Hotel am See')).toHaveFocus())
  })

  it('closes the card with Escape from inside the row and returns focus to the pin', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    const title = await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })

    await waitFor(() => expect(title).toHaveFocus())
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('heading', { level: 2, name: 'Hotel am See' })).toBeNull()
    await waitFor(() => expect(pinButton('Hotel am See')).toHaveFocus())
  })

  it('does not open a card for a dimmed pin', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await choose('Walks')
    await userEvent.click(pinButton('Wine Market'))

    expect(screen.queryByRole('heading', { level: 2, name: 'Wine Market' })).toBeNull()
  })
})

describe('[E4.6][AC54] no price anywhere', () => {
  it('prints no price or currency in the loaded screen, the card, the list or the sheet', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Chapel Bridge'))
    await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })
    const noPrice = () => expect(document.body.textContent).not.toMatch(/CHF|Fr\.|€|\$|price|preis/i)

    noPrice()
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    noPrice()
    await userEvent.click(screen.getByRole('button', { name: en['map.view.map'] }))
    await userEvent.click(screen.getByRole('button', { name: en['map.categories'] }))
    await screen.findByRole('dialog')
    noPrice()
  })
})

describe('[E4.6][AC30] German', () => {
  it('writes the controls, the sheet and the card in German on /de/map', async () => {
    await loaded('/de/map')

    expect(await screen.findByRole('button', { name: de['map.categories'] })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: de['map.view.list'] })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: de['map.heading'] })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: de['map.categories'] }))
    const dialog = await screen.findByRole('dialog', { name: de['map.filter.title'] })

    expect(within(dialog).getByRole('checkbox', { name: new RegExp(de['map.filter.all']) })).toBeInTheDocument()
    expect(fetchMapPins).toHaveBeenCalledWith('de')
  })
})

const cardOfTitle = (title: string) => screen.getByRole('heading', { level: 2, name: title }).closest('article')!

async function openCardOf(title: string) {
  await loaded()
  await screen.findByRole('button', { name: en['map.categories'] })
  await userEvent.click(pinButton(title))
  await screen.findByRole('heading', { level: 2, name: title })
}

async function openSheetOf(title: string) {
  await openCardOf(title)
  await userEvent.click(within(cardOfTitle(title)).getByRole('button', { name: en['map.card.more'] }))

  return within(await screen.findByRole('dialog'))
}

describe('[E4.7][AC42] a pin with stories', () => {
  it('in the sheet links the main story first and lists the other stories, with no price', async () => {
    const sheet = await openSheetOf('Chapel Bridge')
    const stories = (await sheet.findAllByRole('link')).filter(link => link.getAttribute('href')?.includes('/stories/'))

    expect(stories.map(link => link.getAttribute('href'))).toEqual(['/en/stories/chapel-bridge-story', '/en/stories/lucerne-in-a-day'])
    expect(screen.getByRole('dialog').textContent).not.toMatch(/CHF|price|Preis/i)
    expect(fetchMapPin).toHaveBeenCalledWith(pinA.id, 'en')
  })

  it('reads the pin once its card opens, and the card shows no tip: it keeps its Show more and map button and does not grow', async () => {
    await openCardOf('Chapel Bridge')
    await waitFor(() => expect(fetchMapPin).toHaveBeenCalledWith(pinA.id, 'en'))
    const card = cardOfTitle('Chapel Bridge')

    await waitFor(() => expect(within(card).getByRole('button', { name: en['map.card.more'] })).toBeInTheDocument())
    await waitFor(() => expect(within(card).getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual([en['map.directions']]))
    expect(within(card).queryByText('Tip for Chapel Bridge')).toBeNull()
  })
})

describe('[E4.7][AC62] a pin with no story', () => {
  it('shows its details in the sheet and no story link or heading', async () => {
    const sheet = await openSheetOf('Baeckerei Weinmarkt')

    expect(await sheet.findByText('Tip for Baeckerei Weinmarkt')).toBeInTheDocument()
    expect(sheet.queryByRole('heading', { name: en['map.sheet.stories'] })).toBeNull()
    expect(sheet.queryAllByRole('link').filter(link => link.getAttribute('href')?.includes('/stories/'))).toHaveLength(0)
  })
})

describe('[E4.7][AC49] a pin with an outbound link', () => {
  it('shows the hotel link by its host and no booking or payment button', async () => {
    const sheet = await openSheetOf('Hotel am See')

    expect(await sheet.findByRole('link', { name: /hotel-am-see\.example/ })).toHaveAttribute('href', 'https://hotel-am-see.example/rooms')
    expect(sheet.queryByRole('button', { name: /book|buy|pay|reserve|cart/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /book|buy|pay|reserve|cart/i })).toBeNull()
  })
})

describe('[E4.7][AC89] Open in Google Maps', () => {
  it('opens the position at once on the card, and the stored link once the pin has been read, in a new tab', async () => {
    await openCardOf('Chapel Bridge')
    const link = () => within(cardOfTitle('Chapel Bridge')).getByRole('link', { name: en['map.directions'] })

    await waitFor(() => expect(link()).toHaveAttribute('href', 'https://www.google.com/maps/place/Chapel+Bridge/@47.06,8.31,17z'))
    expect(link()).toHaveAttribute('target', '_blank')
    expect(link().getAttribute('rel')).toContain('noreferrer')
  })

  it('opens the position, destination only, for a pin with no stored link', async () => {
    await openCardOf('Wine Market')
    const href = new URL(within(cardOfTitle('Wine Market')).getByRole('link', { name: en['map.directions'] }).getAttribute('href')!)

    expect(href.origin + href.pathname).toBe('https://www.google.com/maps/search/')
    expect([...href.searchParams.keys()].sort()).toEqual(['api', 'query'])
    expect(href.searchParams.get('query')).toBe(`${pinD.latitude},${pinD.longitude}`)
  })
})

describe('[E4.7][N03] the sheet and its Previous and Next place', () => {
  it('steps to the next place in the card row\'s order and reads that pin', async () => {
    const sheet = await openSheetOf('Chapel Bridge')

    await userEvent.click(sheet.getByRole('button', { name: en['map.sheet.next'] }))

    await waitFor(() => expect(fetchMapPin).toHaveBeenCalledWith(pinB.id, 'en'))
    expect(await within(screen.getByRole('dialog')).findByRole('link', { name: /hotel-am-see\.example/ })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Hotel am See' })).toBeInTheDocument()
  })

  it('has Previous place disabled on the first place', async () => {
    const sheet = await openSheetOf('Chapel Bridge')

    expect(sheet.getByRole('button', { name: en['map.sheet.previous'] })).toBeDisabled()
  })

  it('says the details could not load and tries again', async () => {
    vi.mocked(fetchMapPin).mockRejectedValueOnce(new Error('offline'))
    const sheet = await openSheetOf('Chapel Bridge')

    expect(await sheet.findByRole('alert')).toHaveTextContent(en['map.sheet.failed'])
    await userEvent.click(sheet.getByRole('button', { name: en['map.sheet.retry'] }))

    expect(await sheet.findByRole('heading', { name: en['map.sheet.stories'] })).toBeInTheDocument()
  })

  it('closes the sheet with Escape and leaves the card open', async () => {
    await openSheetOf('Chapel Bridge')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { level: 2, name: 'Chapel Bridge' })).toBeInTheDocument()
  })

  it('shows the card and the sheet in German', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue(pins.map(item => ({ ...item, language: 'de' as const })))
    await loaded('/de/map')
    await screen.findByRole('button', { name: de['map.categories'] })
    await userEvent.click(pinButton('Chapel Bridge'))
    await userEvent.click(within(cardOfTitle('Chapel Bridge')).getByRole('button', { name: de['map.card.more'] }))
    const sheet = within(await screen.findByRole('dialog'))

    expect(sheet.getAllByRole('link', { name: de['map.directions'] }).length).toBeGreaterThan(0)
    expect(await sheet.findByRole('heading', { name: de['map.sheet.stories'] })).toBeInTheDocument()
  })
})

describe('[E4.7][AC90] the deep link /map?place=<slug>', () => {
  it('opens the map with that place\'s card showing and focus on its title', async () => {
    await loaded('/en/map?place=pin-3')

    const title = await screen.findByRole('heading', { level: 2, name: 'Baeckerei Weinmarkt' })

    await waitFor(() => expect(title).toHaveFocus())
    expect(pinButton('Baeckerei Weinmarkt')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(en['map.gone'])).toBeNull()
  })

  it('opens the map normally with the notice for a slug that is not on the map (hidden, ended or unknown), and the notice closes', async () => {
    await loaded('/en/map?place=hidden-or-ended')

    expect(await screen.findByText(en['map.gone'])).toBeInTheDocument()
    expect(screen.queryByRole('article')).toBeNull()
    expect(allPinButtons()).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: en['map.gone.close'] }))

    expect(screen.queryByText(en['map.gone'])).toBeNull()
  })

  it('says the notice in German', async () => {
    await loaded('/de/map?place=weg')

    expect(await screen.findByText(de['map.gone'])).toBeInTheDocument()
  })

  it('shows no notice and opens the card of the first place without the parameter (owner, 2026-11-02)', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })

    expect(screen.queryByText(en['map.gone'])).toBeNull()
    expect(await screen.findAllByRole('article')).not.toHaveLength(0)
  })
})

describe('[E4.13][AC42][AC90] the map opens filtered through ?category and ?dated', () => {
  const inList = async (label = en['map.view.list']) => {
    await userEvent.click(await screen.findByRole('button', { name: label }))

    return within(screen.getByRole('list')).getAllByRole('listitem').map(item => item.textContent ?? '')
  }
  const showSheet = async () => {
    await userEvent.click(screen.getByRole('button', { name: /^Categories/ }))

    return screen.findByRole('dialog')
  }
  const search = () => currentRouter.state.location.search as Record<string, unknown>

  it('aC-1 a parent slug lists the pins of the parent and its sub-category, and dims the others', async () => {
    await loaded('/en/map?category=c3')
    await screen.findByRole('button', { name: en['map.categoriesCount'].replace('{count}', '1') })

    expect(pinButton('Chapel Bridge')).toHaveAccessibleName(/dimmed/)
    expect(pinButton('Hotel am See')).toHaveAccessibleName(/dimmed/)
    expect(pinButton('Wine Market')).not.toHaveAccessibleName(/dimmed/)
    expect(pinButton('Baeckerei Weinmarkt')).not.toHaveAccessibleName(/dimmed/)
    const rows = await inList()

    expect(rows).toHaveLength(2)
    expect(rows.join(' ')).toContain('Wine Market')
    expect(rows.join(' ')).toContain('Baeckerei Weinmarkt')
  })

  it('aC-2 a sub-category slug lists only the pins of that sub-category', async () => {
    await loaded('/en/map?category=c4')
    const rows = await inList()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('Baeckerei Weinmarkt')
  })

  it('aC-2 the sheet opened on a sub-category counts its places and does not tick a top-level row', async () => {
    await loaded('/en/map?category=c4')
    await screen.findByRole('button', { name: en['map.categoriesCount'].replace('{count}', '1') })
    const dialog = await showSheet()

    expect(within(dialog).getByRole('button', { name: /^Show 1 place/ })).toBeInTheDocument()
    expect(within(dialog).getByRole<HTMLInputElement>('checkbox', { name: /Food and drink/ }).checked).toBe(false)
  })

  it('aC-3 dated lists only the pins with a next date and dims the rest', async () => {
    await loaded('/en/map?dated=1')
    const rows = await inList()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('Organ Concert')
    await userEvent.click(screen.getByRole('button', { name: en['map.view.map'] }))
    expect(pinButton('Chapel Bridge')).toHaveAccessibleName(/dimmed/)
  })

  it('aC-3 category and dated together list the pins that are in both', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([pinA, pinB, pinC, { ...pinD, nextDate: pinE.nextDate }, pinE])
    await loaded('/en/map?category=c3&dated=1')
    const rows = await inList()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('Wine Market')
  })

  it('aC-4 an unknown slug opens an unfiltered map with a notice that closes, and the address loses it', async () => {
    await loaded('/en/map?category=nope')

    expect(await screen.findByText(en['map.category.unknown'])).toBeInTheDocument()
    expect(allPinButtons().length + screen.queryAllByRole('button', { pressed: true }).length).toBe(5)
    expect(screen.queryAllByRole('button', { name: /dimmed/ })).toHaveLength(0)
    await waitFor(() => expect(search()).toEqual({}))
    await userEvent.click(screen.getByRole('button', { name: en['map.gone.close'] }))

    expect(screen.queryByText(en['map.category.unknown'])).toBeNull()
  })

  it('aC-4 an empty slug opens an unfiltered map with the same notice, in German too', async () => {
    await loaded('/de/map?category=')

    expect(await screen.findByText(de['map.category.unknown'])).toBeInTheDocument()
    expect(await inList(de['map.view.list'])).toHaveLength(5)
  })

  it('aC-5 clearing the filter in the sheet removes the parameter and adds no history entry', async () => {
    await loaded('/en/map?category=c3')
    await screen.findByRole('button', { name: en['map.categoriesCount'].replace('{count}', '1') })
    const before = currentRouter.history.length
    const dialog = await showSheet()

    await userEvent.click(within(dialog).getByRole('button', { name: en['map.filter.clear'] }))
    await userEvent.click(within(dialog).getByRole('button', { name: /^Show \d+ place/ }))

    await waitFor(() => expect(search()).toEqual({}))
    expect(currentRouter.history.length).toBe(before)
  })

  it('aC-5 choosing in the sheet writes the slug to the address, replacing the entry', async () => {
    await loaded('/en/map')
    await screen.findByRole('button', { name: en['map.categories'] })
    const before = currentRouter.history.length

    await choose('Photo spots')

    await waitFor(() => expect(search()).toEqual({ category: 'c2' }))
    expect(currentRouter.history.length).toBe(before)
  })

  it('aC-6 a place link opens that card, clears category and dated, lists every pin and cleans the address', async () => {
    await loaded('/en/map?place=pin-1&category=c3&dated=1')

    const title = await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })

    expect(title).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /dimmed/ })).toHaveLength(0)
    await waitFor(() => expect(search()).toEqual({ place: 'pin-1' }))
    expect(await inList()).toHaveLength(5)
  })

  it('aC-6 a category picked in the sheet after a place link applies, and the address then describes the view', async () => {
    await loaded('/en/map?place=pin-1&dated=1')
    await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })

    await choose('Food and drink')

    expect(pinButton('Chapel Bridge')).toHaveAccessibleName(/dimmed/)
    expect(pinButton('Wine Market')).not.toHaveAccessibleName(/dimmed/)
    await waitFor(() => expect(search()).toEqual({ category: 'c3' }))
    expect(screen.queryByText(en['map.gone'])).toBeNull()
  })

  it('aC-6 a place that is gone with a category shows the notice and opens with the filters cleared', async () => {
    await loaded('/en/map?place=gone&category=c3')

    expect(await screen.findByText(en['map.gone'])).toBeInTheDocument()
    expect(screen.queryByText(en['map.category.unknown'])).toBeNull()
    expect(screen.queryAllByRole('button', { name: /dimmed/ })).toHaveLength(0)
    await waitFor(() => expect(search()).toEqual({ place: 'gone' }))
  })
})
