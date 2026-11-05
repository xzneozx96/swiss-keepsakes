import type { PublicMapItem, PublicStory } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, configure, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { StoryPlaces } from '@/features/content/components/story-places'
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

function pin(n: number, title: string): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05 + n * 0.01,
    longitude: 8.3 + n * 0.01,
    title,
    language: 'en',
    categoryIds: [],
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

const bridge = pin(1, 'Chapel Bridge')
const cafe = pin(2, 'Cafe Heini')
const place = (item: PublicMapItem): PublicStory['places'][number] => ({ id: item.id, slug: item.slug, name: item.title })

function renderPlaces(places: PublicStory['places']) {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider>
          <Outlet />
        </LocaleProvider>
      </QueryClientProvider>
    ),
  })
  const page = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => (
    <div data-testid="page">
      <StoryPlaces language="en" places={places} />
    </div>
  ) })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ['/en'] }) })

  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('IntersectionObserver', NearObserver)
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue([bridge, cafe])
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue([])
  vi.mocked(fetchMapPin).mockReset().mockResolvedValue({ id: bridge.id, mapsLink: null } as never)
})

describe('[AC90] the story places map', () => {
  it('one place draws the map with that one pin and its card open, with Open in Google Maps', async () => {
    renderPlaces([place(bridge)])

    expect(await screen.findByRole('heading', { level: 2, name: en['article.places'] })).toBeInTheDocument()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('load'))
    act(() => FakeMap.instances[0]!.emit('idle'))
    const link = await screen.findByRole('link', { name: en['map.directions'] })

    expect(link.getAttribute('href')).toContain('google.com/maps')
    expect(screen.getAllByText('Chapel Bridge').length).toBeGreaterThan(0)
    expect(screen.queryByText('Cafe Heini')).not.toBeInTheDocument()
  })

  it('a place with no pin is left out; with none left, nothing is drawn', async () => {
    renderPlaces([{ id: id(999), slug: null, name: 'Hidden Cove' }])

    await waitFor(() => expect(fetchMapPins).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('heading', { name: en['article.places'] })).not.toBeInTheDocument())
    expect(FakeMap.instances).toHaveLength(0)
  })

  it('a failed map read draws the notice with a retry', async () => {
    vi.mocked(fetchMapPins).mockRejectedValue(new Error('down'))
    renderPlaces([place(bridge)])

    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })
})
