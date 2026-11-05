import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { FoodMapSection } from '@/features/home/components/food-map-section'
import { en } from '@/i18n/en'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, name: string, parentId: string | null = null, icon: PublicCategory['icon'] = null): PublicCategory {
  return { id: id(n), slug, name: { en: name, de: name }, parentId, icon, showOnHome: false, storyCount: 0, position: n }
}

function pin(n: number, title: string, categoryIds: string[], extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    address: null,
    weeklyHours: [],
    title,
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: `https://img.example/${n}-320.webp`,
    photoVariants: [{ width: 320, url: `https://img.example/${n}-320.webp` }, { width: 640, url: `https://img.example/${n}-640.webp` }],
    mustVisit: false,
    tip: '',
    ...extra,
  }
}

const food = category(1, 'food-and-drink', 'Food and drink', null, 'restaurant')
const cafes = category(2, 'cafes', 'Cafés and bakeries', food.id, 'cafe')
const fondue = category(3, 'fondue', 'Fondue', food.id)
const restaurants = category(6, 'restaurants', 'Restaurants', food.id)
const bars = category(7, 'bars', 'Bars', food.id, 'bar')
const walks = category(9, 'walks', 'Walks')
const categories = [walks, bars, food, restaurants, fondue, cafes]

// Thursday 5 November 2026 (day 4), noon in Lucerne.
const NOW = new Date('2026-11-05T11:00:00Z')
const sip = pin(1, 'SiP Café', [food.id, cafes.id], { address: 'Weinmarkt 14, 6004 Luzern', weeklyHours: [{ day: 4, opens: '09:00', closes: '19:00' }, { day: 5, opens: '09:00', closes: '20:00' }] })
const reussbad = pin(2, 'Restaurant Reussbad', [food.id, restaurants.id], { address: 'Brüggligasse 19, 6004 Luzern', weeklyHours: [{ day: 4, opens: '18:00', closes: '22:00' }, { day: 4, opens: '11:30', closes: '14:00' }] })
const storchen = pin(3, 'Storchen Restaurant & Weinbar', [food.id, bars.id, restaurants.id], { weeklyHours: [{ day: 2, opens: '14:00', closes: '22:00' }] })
const market = pin(4, 'Weekly market', [food.id], { nextDate: { firstDay: '2090-11-07', lastDay: '2090-11-07', startTime: null, endTime: null } })
const mamie = pin(5, 'Café Mamie', [food.id, cafes.id], { photoUrl: null, photoVariants: [] })
const bridge = pin(6, 'Chapel Bridge', [walks.id])
const pins = [sip, reussbad, storchen, market, mamie, bridge]
const at = (iso: string) => vi.setSystemTime(new Date(iso))

interface Read { pins?: PublicMapItem[] | null, categories?: PublicCategory[] | null }

function renderSection(read: Read = { pins, categories }, onRetry = () => {}) {
  const root = createRootRoute({
    component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ),
  })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => (
    <div data-testid="page">
      <FoodMapSection categories={read.categories} pins={read.pins} onRetry={onRetry} />
    </div>
  ) })
  const map = createRoute({ getParentRoute: () => root, path: '/$lang/map', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([home, map]), history: createMemoryHistory({ initialEntries: ['/en'] }) })

  render(<RouterProvider router={router} />)
}

const section = async () => (await screen.findByRole('heading', { level: 2, name: en['homePage.food.title'] })).closest('section')!
const rail = (name = en['homePage.food.places']) => screen.getByRole('region', { name })
const cardNames = (name?: string) => within(rail(name)).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)
const card = (title: string) => screen.getByRole('link', { name: new RegExp(title) })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('[E4.13][AC54][AC95] the food section (owner, 05.11.2026)', () => {
  it('shows the undated food places newest first as cards, and no price', async () => {
    renderSection()
    const box = await section()

    expect(cardNames()).toEqual(['SiP Café', 'Restaurant Reussbad', 'Storchen Restaurant & Weinbar', 'Café Mamie'])
    expect(box.textContent).not.toMatch(/Chapel Bridge|Weekly market|CHF|Fr\./)
    // The card takes the sharp 640 px copy, not the small one.
    expect(card('SiP Café').querySelector('img')).toHaveAttribute('src', 'https://img.example/1-640.webp')
  })

  it('badges each card with its kind, the first sub-category in position order', async () => {
    renderSection()
    await section()

    expect(card('SiP Café')).toHaveTextContent('Cafés and bakeries')
    expect(card('Storchen')).toHaveTextContent('Restaurants')
    expect(card('Storchen')).not.toHaveTextContent('Bars')
  })

  const corner = (title: string) => card(title).querySelector('[data-status]')

  it('shows the week’s hours under the name, grouped by day, also on a day with no span today', async () => {
    renderSection()
    await section()

    expect(card('SiP Café')).toHaveTextContent('Thu 09:00–19:00 · Fri 09:00–20:00')
    expect(card('Reussbad')).toHaveTextContent('Thu 11:30–14:00, 18:00–22:00')
    // Storchen is open on Tuesdays only: the week still shows.
    expect(card('Storchen')).toHaveTextContent('Tue 14:00–22:00')
    expect(card('SiP Café').querySelector('.line-clamp-2')).toHaveTextContent('Thu 09:00–19:00 · Fri 09:00–20:00')
    // No hours at all: no hours line.
    expect(card('Café Mamie')).not.toHaveTextContent(/\d{2}:\d{2}/)
  })

  it('says Daily when every day has the same hours', async () => {
    const daily = pin(8, 'Daily Bakery', [food.id, cafes.id], { weeklyHours: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, opens: '07:00', closes: '18:30' })) })

    renderSection({ pins: [daily], categories })
    await section()

    expect(card('Daily Bakery')).toHaveTextContent('Daily 07:00–18:30')
  })

  it('puts “Open” and “until” the closing time in the top corner while open, with one sentence for screen readers', async () => {
    renderSection()
    await section()

    expect(corner('SiP Café')).toHaveAttribute('aria-hidden', 'true')
    expect(corner('SiP Café')).toHaveAttribute('data-status', 'open')
    expect(corner('SiP Café')).toHaveTextContent('Openuntil 19:00')
    expect(within(card('SiP Café')).getByText('Open now, until 19:00')).toHaveClass('sr-only')
    expect(corner('Reussbad')).toHaveTextContent('Openuntil 14:00')
  })

  it('says when it opens later today, between two spans', async () => {
    at('2026-11-05T14:00:00Z') // 15:00 in Lucerne
    renderSection()
    await section()

    expect(corner('Reussbad')).toHaveTextContent('ClosedOpens 18:00')
    expect(within(card('Reussbad')).getByText('Closed now, opens at 18:00')).toBeInTheDocument()
  })

  it('after closing says Tomorrow and the time, and on a day off the weekday it is back', async () => {
    at('2026-11-05T20:30:00Z') // 21:30
    renderSection()
    await section()

    expect(corner('SiP Café')).toHaveTextContent('ClosedOpens tomorrow 09:00')
    expect(within(card('SiP Café')).getByText('Closed now, opens tomorrow at 09:00')).toBeInTheDocument()
    // Storchen opens on Tuesdays only.
    expect(corner('Storchen')).toHaveAttribute('data-status', 'closed-today')
    expect(corner('Storchen')).toHaveTextContent('ClosedOpens Tue')
    expect(within(card('Storchen')).getByText('Closed now, opens Tuesday at 14:00')).toBeInTheDocument()
  })

  it('counts a span that closes after midnight as open until then, also on the next morning', async () => {
    const late = pin(7, 'Bar & Lounge', [food.id, bars.id], { weeklyHours: [{ day: 3, opens: '20:00', closes: '02:00' }, { day: 4, opens: '18:00', closes: '01:30' }] })

    at('2026-11-05T22:30:00Z') // Thursday 23:30
    renderSection({ pins: [late], categories })
    await section()

    expect(corner('Bar & Lounge')).toHaveTextContent('Openuntil 01:30')
    cleanup()
    at('2026-11-04T23:30:00Z') // Thursday 00:30, Wednesday's span still runs
    renderSection({ pins: [late], categories })
    await section()

    expect(corner('Bar & Lounge')).toHaveTextContent('Openuntil 02:00')
  })

  it('draws no corner for a place without hours', async () => {
    renderSection()
    await section()

    expect(corner('Café Mamie')).toBeNull()
  })

  it('sends no corner in the server HTML, only the hours', async () => {
    const root = createRootRoute({ component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ) })
    const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => <FoodMapSection categories={categories} pins={pins} onRetry={() => {}} /> })
    const router = createRouter({ routeTree: root.addChildren([home]), history: createMemoryHistory({ initialEntries: ['/en'] }) })

    await router.load()
    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('09:00–19:00')
    expect(html).not.toContain('data-status')
    expect(html).not.toContain('until 19:00')
  })

  it('shows the street before the postcode, and no address line without an address', async () => {
    renderSection()
    await section()

    expect(card('SiP Café')).toHaveTextContent('Weinmarkt 14')
    expect(card('SiP Café')).not.toHaveTextContent('6004')
    expect(card('Café Mamie').querySelectorAll('svg')).toHaveLength(1)
  })

  it('shows the category icon for a place without a photo', async () => {
    renderSection()
    await section()

    expect(card('Café Mamie').querySelector('[data-pin-icon]')).not.toBeNull()
    expect(card('Café Mamie').querySelector('img')).toBeNull()
  })

  it('shows at most five cards, newest first, and the button opens the map filtered to food and drink', async () => {
    const newCafes = Array.from({ length: 6 }, (_, index) => pin(10 + index, `Café ${index + 1}`, [food.id, cafes.id]))

    renderSection({ pins: [...newCafes, pin(30, 'Old Bar', [food.id, bars.id])], categories })
    await section()
    const seeAll = screen.getByRole('link', { name: en['homePage.food.seeAll'] })

    expect(cardNames()).toEqual(['Café 1', 'Café 2', 'Café 3', 'Café 4', 'Café 5'])
    expect(seeAll).toHaveAttribute('href', '/en/map?category=food-and-drink')
    expect(seeAll).toHaveTextContent(/^See all on the map$/)
  })

  it('has no kind filter row', async () => {
    renderSection()
    await section()

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('region').map(region => region.getAttribute('aria-label'))).not.toContain('Kinds of place')
  })

  it('opens each place on the map', async () => {
    renderSection()
    await section()

    expect(card('SiP Café')).toHaveAttribute('href', '/en/map?place=pin-1')
    expect(card('Café Mamie')).toHaveAttribute('href', '/en/map?place=pin-5')
  })

  it('is not drawn without the category, without a food place, or with dated food places only', async () => {
    for (const read of [{ pins, categories: [walks] }, { pins: [bridge], categories }, { pins: [market], categories }]) {
      renderSection(read)
      await waitFor(() => expect(screen.getByTestId('page')).toBeEmptyDOMElement())
      cleanup()
    }
  })

  it('shows a skeleton of the cards while the map list loads', async () => {
    renderSection({})
    await section()

    expect(document.querySelector('[data-skeleton="food-map"]')).not.toBeNull()
    expect(screen.queryByRole('link', { name: en['homePage.food.seeAll'] })).toBeNull()
  })

  it('shows its own error with Try again when the read failed, and Try again asks the page to read again', async () => {
    const onRetry = vi.fn()

    renderSection({ pins: null, categories }, onRetry)
    await screen.findByText(en['homePage.food.failed'])
    await userEvent.click(screen.getByRole('button', { name: en['errorNotice.retry'] }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
