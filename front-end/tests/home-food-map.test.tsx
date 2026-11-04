import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { RankPrefs } from '@sk/domain/content'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { FoodMapSection } from '@/features/home/components/food-map-section'
import { fetchMapCategories, fetchMapPin, fetchMapPins } from '@/features/map/api/map-client'
import { en } from '@/i18n/en'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

configure({ asyncUtilTimeout: 5000 })

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))
vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

/** The section is near the viewport as soon as it is watched. */
class NearObserver {
  constructor(private callback: IntersectionObserverCallback) {}

  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, name: string, parentId: string | null = null, icon: PublicCategory['icon'] = null): PublicCategory {
  return { id: id(n), slug, name: { en: name, de: name }, parentId, icon, showOnHome: false, position: n }
}

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

const walks = category(1, 'walks', 'Walks')
const food = category(2, 'food-and-drink', 'Food and drink', null, 'cafe')
const bakeries = category(3, 'bakeries', 'Bakeries', food.id)
const categories = [walks, food, bakeries]

const bridge = pin(1, 'Chapel Bridge', [walks.id], { interests: ['history-culture'] })
const cafe = pin(2, 'Cafe Heini', [food.id])
const bakery = pin(3, 'Baeckerei Weinmarkt', [bakeries.id, food.id], { interests: ['food-drink'], photoUrl: 'https://img.example/bakery.webp' })
const pins = [bridge, cafe, bakery]

interface Read { pins?: PublicMapItem[] | null, categories?: PublicCategory[] | null }

function renderSection(prefs?: RankPrefs, read: Read = { pins, categories }, onRetry = () => {}) {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider>
          <Outlet />
        </LocaleProvider>
      </QueryClientProvider>
    ),
  })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => (
    <div data-testid="page">
      <FoodMapSection categories={read.categories} pins={read.pins} prefs={prefs} onRetry={onRetry} />
    </div>
  ) })
  const others = ['map', 'stories/$slug'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: ['/en'] }) })

  render(<RouterProvider router={router} />)
}

/** The map draws its style and first view: the Categories and List buttons appear. */
async function drawn(prefs?: RankPrefs, read?: Read) {
  renderSection(prefs, read)
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  act(() => FakeMap.instances[0]!.emit('load'))
  act(() => FakeMap.instances[0]!.emit('idle'))
  await screen.findByRole('button', { name: /^Categories/ })
}

const listRows = () => within(screen.getByRole('heading', { name: /places?$/ }).parentElement!).getAllByRole('button').map(row => row.textContent)

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('IntersectionObserver', NearObserver)
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue(pins)
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue(categories)
  vi.mocked(fetchMapPin).mockReset().mockResolvedValue({ id: cafe.id } as never)
})

describe('[E4.13][AC54][AC95] the food map section', () => {
  it('draws the heading and a map with cooperative gestures and no tab-bar space', async () => {
    await drawn()

    expect(screen.getByRole('heading', { level: 2, name: en['homePage.food.title'] })).toBeInTheDocument()
    expect(FakeMap.instances[0]!.options.cooperativeGestures).toBe(true)
    expect(document.body.textContent).not.toMatch(/CHF|Fr\./)
  })

  it('aC-3 holds the food and drink pins and their sub-categories only in the list, and Categories reaches the others', async () => {
    await drawn()
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))

    expect(screen.getByRole('heading', { name: '2 places' })).toBeInTheDocument()
    expect(listRows().join('|')).toContain('Cafe Heini')
    expect(listRows().join('|')).toContain('Baeckerei Weinmarkt')
    expect(listRows().join('|')).not.toContain('Chapel Bridge')

    await userEvent.click(screen.getByRole('button', { name: /^Categories/ }))
    const dialog = await screen.findByRole('dialog')

    // The sheet opens with food and drink alone chosen; ticking Walks adds the other pins.
    expect(within(dialog).getByRole<HTMLInputElement>('checkbox', { name: /Food and drink/ }).checked).toBe(true)
    expect(within(dialog).getByRole<HTMLInputElement>('checkbox', { name: /Walks/ }).checked).toBe(false)
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Walks/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: /^Show 3 places/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))

    expect(listRows().join('|')).toContain('Chapel Bridge')
  })

  it('aC-4 puts the pins that match the answers first and keeps the count', async () => {
    await drawn({ interests: ['food-drink'] })
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))

    const rows = listRows()

    expect(screen.getByRole('heading', { name: '2 places' })).toBeInTheDocument()
    expect(rows[0]).toContain('Baeckerei Weinmarkt')
    expect(rows[1]).toContain('Cafe Heini')
  })

  it('aC-6 shows the category icon in the thumbnail of a card for a pin without a photo, at the same size as a photo', async () => {
    await drawn()
    // The first card opens with the section (the answers put no pin first here, so it is Cafe Heini: no photo, so the coffee icon).
    const card = await screen.findByRole('article', { name: 'Cafe Heini' })
    const thumb = card.querySelector('[data-pin-icon]')

    expect(thumb).toHaveAttribute('data-pin-icon', 'cafe')
    expect(card.querySelector('img')).toBeNull()
    expect(thumb!.closest('.size-\\[84px\\]')).not.toBeNull()
  })

  it('aC-5a is not drawn when the category is gone', async () => {
    renderSection(undefined, { pins, categories: [walks] })
    await waitFor(() => expect(screen.getByTestId('page')).toBeEmptyDOMElement())

    expect(FakeMap.instances).toHaveLength(0)
  })

  it('reads nothing itself: it draws from the pins and categories it is given, and shows a skeleton while there are none yet', async () => {
    renderSection(undefined, {})

    expect(await screen.findByRole('heading', { name: en['homePage.food.title'] })).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="food-map"]')).not.toBeNull()
    expect(fetchMapPins).not.toHaveBeenCalled()
    expect(fetchMapCategories).not.toHaveBeenCalled()
  })

  it('shows its own error with Try again when the read failed, and Try again asks the page to read again', async () => {
    const onRetry = vi.fn()

    renderSection(undefined, { pins: null, categories }, onRetry)
    await screen.findByText(en['homePage.food.failed'])
    await userEvent.click(screen.getByRole('button', { name: en['errorNotice.retry'] }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('aC-5b is drawn as before when a merchant renamed the category', async () => {
    await drawn(undefined, { pins, categories: [walks, { ...food, name: { en: 'Restaurants', de: 'Restaurants' } }, bakeries] })

    expect(screen.getByRole('heading', { level: 2, name: en['homePage.food.title'] })).toBeInTheDocument()
    expect(FakeMap.instances).toHaveLength(1)
  })
})
