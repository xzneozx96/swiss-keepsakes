import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { TourDetailPage } from '@/features/tours/discovery'
import { parseTourSearch } from '@/features/tours/discovery/lib/search-params'
import { thingsThatRemain } from '@/features/tours/lucerne/things-that-remain'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

class ImmediateObserver {
  constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
  observe() {
    this.callback([{ isIntersecting: true }])
  }

  unobserve() {}
  disconnect() {}
}

const slug = 'lucerne-the-things-that-remain'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  resetFakeMaps()
  vi.stubGlobal('IntersectionObserver', ImmediateObserver)
  window.scrollTo = vi.fn()
  window.scrollBy = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The page mounted the way the route does: `validateSearch` is the route's, the tab lives in `?tab=`. */
async function renderTour(search = '') {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify('en'))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/$lang/tours/$slug',
    validateSearch: parseTourSearch,
    component: function Page() {
      const { tab } = page.useSearch()
      const navigate = page.useNavigate()

      return (
        <TourDetailPage
          slug={slug}
          tab={tab}
          onTabChange={next => void navigate({ search: { tab: next === 'overview' ? undefined : next }, replace: true, resetScroll: false })}
        />
      )
    },
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [`/en/tours/${slug}${search}`] }),
    disableGlobalCatchBoundary: true,
  })
  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { level: 1 })

  return router
}

const selectedTab = () => screen.getAllByRole('tab').find(tab => tab.getAttribute('aria-selected') === 'true')?.textContent

describe('tour detail tabs', () => {
  it('[E3.1] the page has Overview, Itinerary and Comments (5) tabs, with Overview selected', async () => {
    await renderTour()

    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Overview', 'Itinerary', 'Comments (5)'])
    expect(selectedTab()).toBe('Overview')
    expect(screen.getByRole('heading', { name: 'About this route', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Where it starts' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Comments', level: 2 })).toBeNull()
    expect(FakeMap.instances).toHaveLength(0)
  })

  it('[E3.1] ?tab=itinerary shows the map, the stops, where it starts and before you go, with no map button', async () => {
    await renderTour('?tab=itinerary')

    expect(selectedTab()).toBe('Itinerary')
    expect(screen.queryByRole('button', { name: 'Open the itinerary map' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'About this route' })).toBeNull()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1), { timeout: 20000 })
    const panel = screen.getByRole('tabpanel')
    const headings = within(panel).getAllByRole('heading', { level: 2 }).map(h => h.textContent)

    expect(headings.slice(0, 3)).toEqual(['Suggested itinerary', 'Where it starts', 'Before you go'])
    expect(within(panel).getByRole('heading', { name: 'At a glance' })).toBeInTheDocument()
    expect(within(panel).getByText(/Practical information checked on/)).toBeInTheDocument()
    expect(within(panel).getAllByRole('listitem').length).toBeGreaterThanOrEqual(thingsThatRemain.itinerary.length)
  }, 40000)

  it('[E3.1] each stop shows once in the stepper, and there is no separate stop-by-stop section', async () => {
    await renderTour('?tab=itinerary')
    const stepper = (await screen.findByRole('tabpanel')).querySelector('ol') as HTMLElement
    const panel = screen.getByRole('tabpanel')

    // Not every row of the timetable is a stop: a timetable row may carry a stop's name, but it is a time and a note, not a second list of the stops.
    expect(within(panel).queryByRole('heading', { name: /stop by stop/i })).toBeNull()
    for (const stop of thingsThatRemain.itinerary) {
      const name = stop.name.en as string

      expect(within(stepper).getAllByText(name), name).toHaveLength(1)
    }
  }, 40000)

  it('[E3.1] ?tab=comments shows the comments and the count is in the label', async () => {
    await renderTour('?tab=comments')

    expect(selectedTab()).toBe('Comments (5)')
    expect(screen.getByRole('heading', { name: 'Comments', level: 2 })).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getAllByRole('article')).toHaveLength(3)
    expect(screen.queryByRole('heading', { name: 'About this route' })).toBeNull()
  })

  it('[E3.1] an unknown tab value falls back to Overview', async () => {
    await renderTour('?tab=photos')

    expect(selectedTab()).toBe('Overview')
    expect(screen.getByRole('heading', { name: 'About this route', level: 2 })).toBeInTheDocument()
  })

  it('[E3.1] choosing a tab writes ?tab= and replaces the history entry, and Overview leaves the URL', async () => {
    const router = await renderTour()
    const entries = router.history.length

    await userEvent.click(screen.getByRole('tab', { name: 'Comments (5)' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ tab: 'comments' }))
    expect(selectedTab()).toBe('Comments (5)')
    await userEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    expect(router.state.location.href).not.toContain('tab')
    expect(router.history.length).toBe(entries)
  })
})
