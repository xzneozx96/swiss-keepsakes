import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { FoodMapSection } from '@/features/home/components/food-map-section'
import { en } from '@/i18n/en'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, name: string, parentId: string | null = null, icon: PublicCategory['icon'] = null): PublicCategory {
  return { id: id(n), slug, name: { en: name, de: name }, parentId, icon, showOnHome: false, position: n }
}

function pin(n: number, title: string, categoryIds: string[], extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
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

const walks = category(1, 'walks', 'Walks')
const food = category(2, 'food-and-drink', 'Food and drink', null, 'cafe')
const bakeries = category(3, 'bakeries', 'Bakeries', food.id)
const categories = [walks, food, bakeries]

const heini = pin(1, 'Café Heini', [food.id], { tip: 'Order the Luzerner Lebkuchen with a café crème by the window.' })
const bridge = pin(2, 'Chapel Bridge', [walks.id])
const weinmarkt = pin(3, 'Bäckerei Weinmarkt', [bakeries.id, food.id])
const market = pin(4, 'Weekly market', [food.id], { nextDate: { firstDay: '2090-11-07', lastDay: '2090-11-07', startTime: null, endTime: null } })
const pickwick = pin(5, 'Mr. Pickwick Pub', [food.id], { photoUrl: null, photoVariants: [] })
const galliker = pin(6, 'Wirtshaus Galliker', [food.id])
const rathaus = pin(7, 'Rathaus Brauerei', [food.id])
const neubad = pin(8, 'Neubad', [food.id])
const pins = [heini, bridge, weinmarkt, market, pickwick, galliker, rathaus, neubad]

interface Read { pins?: PublicMapItem[] | null, categories?: PublicCategory[] | null }

function renderSection(read: Read = { pins, categories }, onRetry = () => {}) {
  const root = createRootRoute({ component: () => (
    <LocaleProvider>
      <Outlet />
    </LocaleProvider>
  ) })
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
const rail = () => screen.getByRole('region', { name: en['homePage.food.more'] })
const railNames = () => within(rail()).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)

describe('[E4.13][AC54][AC95] the food section (owner, 05.11.2026)', () => {
  it('shows the newest place as the poster with its tip, the next four undated places in the rail, and no price', async () => {
    renderSection()
    const box = await section()
    const poster = within(box).getAllByRole('link')[0]!

    expect(poster).toHaveTextContent('Café Heini')
    expect(poster).toHaveTextContent(heini.tip)
    expect(poster).toHaveAttribute('href', '/en/map?place=pin-1')
    expect(poster.querySelector('.line-clamp-2')).toHaveTextContent(heini.tip)
    // The poster takes the sharp 640 px copy, not the small one.
    expect(poster.querySelector('img')).toHaveAttribute('src', 'https://img.example/1-640.webp')
    // The bridge is not food, the market has a date, and the sixth food place is beyond the five.
    expect(railNames()).toEqual(['Bäckerei Weinmarkt', 'Mr. Pickwick Pub', 'Wirtshaus Galliker', 'Rathaus Brauerei'])
    expect(box.textContent).not.toMatch(/Chapel Bridge|Weekly market|Neubad|CHF|Fr\./)
    expect(within(rail()).getByRole('link', { name: /Bäckerei Weinmarkt/ })).toHaveTextContent('Bakeries')
  })

  it('opens each place on the map and the button opens the map filtered to food and drink', async () => {
    renderSection()
    await section()

    expect(within(rail()).getByRole('link', { name: /Mr. Pickwick Pub/ })).toHaveAttribute('href', '/en/map?place=pin-5')
    expect(screen.getByRole('link', { name: en['homePage.food.seeAll'] })).toHaveAttribute('href', '/en/map?category=food-and-drink')
  })

  it('shows the category icon for a place without a photo', async () => {
    renderSection()
    await section()
    const card = within(rail()).getByRole('link', { name: /Mr. Pickwick Pub/ })

    expect(card.querySelector('[data-pin-icon="cafe"]')).not.toBeNull()
    expect(card.querySelector('img')).toBeNull()
  })

  it('shows the kind of place on the poster when the place has no tip', async () => {
    renderSection({ pins: [weinmarkt], categories })
    const box = await section()

    expect(within(box).getAllByRole('link')[0]).toHaveTextContent('Bakeries')
  })

  it('shows the poster alone with one place, then the button', async () => {
    renderSection({ pins: [heini, bridge], categories })
    const box = await section()

    expect(screen.queryByRole('region', { name: en['homePage.food.more'] })).toBeNull()
    expect(within(box).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/en/map?place=pin-1', '/en/map?category=food-and-drink'])
  })

  it('is not drawn without the category, without a food place, or with dated food places only', async () => {
    for (const read of [{ pins, categories: [walks] }, { pins: [bridge], categories }, { pins: [market], categories }]) {
      renderSection(read)
      await waitFor(() => expect(screen.getByTestId('page')).toBeEmptyDOMElement())
      cleanup()
    }
  })

  it('shows a skeleton of the poster and the rail while the map list loads', async () => {
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
