import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { fetchMapCategories, fetchMapPins } from '@/features/map/api/map-client'
import { MapScreen } from '@/features/map/components/map-screen'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))
vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn() }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, parentId: string | null, position: number, en: string, de: string): PublicCategory {
  return { id: id(n), slug: `c${n}`, name: { en, de }, parentId, position }
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
    photoKey: null,
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
    loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined,
    component: MapScreen,
  })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => null })
  const story = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([map, home, story]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)

  return router
}

/** The map draws its style: the pins and the controls appear. */
async function loaded(url?: string) {
  renderMap(url)
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  act(() => FakeMap.instances[0]!.emit('load'))
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
  it('shows the controls skeleton and the loading text while the map and places load', async () => {
    vi.mocked(fetchMapPins).mockReturnValue(new Promise(() => {}))
    renderMap()

    expect(await screen.findByText(en['map.loading'], { selector: '.sr-only' })).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="map-controls"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en['map.categories'] })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: en['map.heading'] })).toBeInTheDocument()
  })

  it('shows "Loading places…" once the map is drawn and the places are still on the way', async () => {
    vi.mocked(fetchMapPins).mockReturnValue(new Promise(() => {}))
    await loaded()

    expect(await screen.findByText(en['map.loading'], { selector: ':not(.sr-only)' })).toBeInTheDocument()
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

    expect(allPinButtons()).toHaveLength(5)
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
    expect(within(title.closest('article')!).queryByRole('link', { name: en['map.card.readStory'] })).toBeNull()
  })

  it('shows the place icon on the pin and on the card (no photo address yet)', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Hotel am See'))
    const title = await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })

    expect(pinButton('Hotel am See').querySelector('svg')).not.toBeNull()
    expect(title.closest('article')!.querySelector('[aria-hidden] svg')).not.toBeNull()
    expect(document.querySelector('img')).toBeNull()
  })

  it('links the main story only when the pin has one', async () => {
    await loaded()
    await screen.findByRole('button', { name: en['map.categories'] })
    await userEvent.click(pinButton('Chapel Bridge'))

    const title = await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })

    expect(within(title.closest('article')!).getByRole('link', { name: en['map.card.readStory'] })).toHaveAttribute('href', '/en/stories/chapel-bridge-story')
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
