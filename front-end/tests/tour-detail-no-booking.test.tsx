import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate, useSearch } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { TourDetailPage } from '@/features/tours/discovery'
import { parseTourSearch } from '@/features/tours/discovery/lib/search-params'
import { tourDiscoveryEn as discovery } from '@/features/tours/discovery/messages'
import { tourDiscoveryDe } from '@/features/tours/discovery/messages.de'
import { TourDetail } from '@/features/tours/discovery/tour-detail-page'
import { tourCommentSeed } from '@/features/tours/lucerne/comments'
import { thingsThatRemain } from '@/features/tours/lucerne/things-that-remain'
import { en } from '@/i18n/en'
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

/** The page as the route mounts it: the tab lives in `?tab=`. */
function RoutedTourPage() {
  const { tab } = useSearch({ strict: false }) as { tab?: 'itinerary' | 'comments' }
  const navigate = useNavigate()

  return (
    <TourDetailPage
      slug={slug}
      tab={tab}
      onTabChange={next => void navigate({ to: '.', search: next === 'overview' ? {} : { tab: next }, replace: true, resetScroll: false })}
    />
  )
}

async function renderTour(language = 'en', component: () => React.ReactNode = RoutedTourPage, search = '') {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify(language))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/tours/$slug', validateSearch: parseTourSearch, component })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [`/tours/${slug}${search}`] }),
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
}

describe('tour detail page', () => {
  it('[E3.1][AC50] tour page shows no booking entry', async () => {
    await renderTour()
    expect(document.querySelectorAll('a[href*="/book"]')).toHaveLength(0)
    expect(document.querySelectorAll('a[href*="private-tour"]')).toHaveLength(0)
    const choose = discovery['tourDiscovery.choose']
    const review = discovery['tourDiscovery.review'].split(' ·')[0]
    for (const button of screen.queryAllByRole('button')) {
      const name = button.getAttribute('aria-label') ?? button.textContent ?? ''
      expect(name.trim()).not.toBe(choose)
      expect(name.trim().startsWith(review)).toBe(false)
    }
  })

  it.each(['en', 'de'] as const)('[E3.1][AC50] tour page shows no price, departure, seat or payment text (%s)', async (language) => {
    await renderTour(language)
    const messages = language === 'en' ? discovery : tourDiscoveryDe
    const text = document.body.textContent ?? ''
    const banned = [
      messages['tourDiscovery.prices'],
      messages['tourDiscovery.noSeat'],
      messages['tourDiscovery.policy.variesShort'],
      messages['tourDiscovery.policyShort.full'],
      messages['tourDiscovery.policyShort.deposit'],
      messages['tourDiscovery.policyShort.later'],
      messages['tourDiscovery.ages.range'].replace('{from}', '0').replace('{to}', '5'),
      'CHF 89.00',
      'CHF 45.00',
      'CHF 0.00',
    ]
    for (const needle of banned) expect(text).not.toContain(needle)
    expect(screen.queryByText(messages['tourDiscovery.payment'], { exact: true })).toBeNull()
  })

  it.each(['en', 'de'] as const)('[E3.1] tour page has no included section, no reviews and no rating (%s)', async (language) => {
    await renderTour(language)
    const text = document.body.textContent ?? ''

    for (const needle of ['What the route covers', 'You pay on the way', 'Was die Route umfasst', 'Unterwegs bezahlen Sie selbst', 'Reviews', 'Bewertungen', 'Guest favourite', 'Gästeliebling', 'out of 5', 'von 5 Sternen'])
      expect(text, needle).not.toContain(needle)
    expect(screen.queryByRole('img', { name: /5/ })).toBeNull()
  })

  it.each([
    ['en', 'The route at a glance', ['3 hours', '6 stops'], ['Duration', /^From .+ to .+$/, 'Where it starts']],
    ['de', 'Die Route auf einen Blick', ['3 Stunden', '6 Stationen'], ['Dauer', /^Von .+ bis .+$/, 'Hier beginnt die Route']],
  ] as const)('[E3.1] Overview opens on the highlights list: the duration, the stops from first to last, and where it starts (%s)', async (language, label, titles, bodies) => {
    await renderTour(language)
    const list = screen.getByRole('region', { name: label })
    const rows = within(list).getAllByRole('listitem')

    expect(rows).toHaveLength(3)
    expect(rows.slice(0, 2).map(row => row.querySelector('.font-semibold')?.textContent)).toEqual([...titles])
    bodies.forEach((body, i) => expect(within(rows[i]!).getByText(body)).toBeInTheDocument())
    // No figures list anywhere: the header lost its stats row (owner, 06.11.2026).
    expect(document.querySelectorAll('dl')).toHaveLength(0)
  })

  it('[E3.1] comments show the first three, and "Show all" opens all of them in a sheet with the replies', async () => {
    await renderTour('en', RoutedTourPage, '?tab=comments')
    const section = (await screen.findByRole('heading', { name: 'Comments', level: 2 })).closest('section') as HTMLElement

    expect(within(section).getAllByRole('article')).toHaveLength(3)
    expect(within(section).queryByRole('textbox')).toBeNull()
    await userEvent.click(within(section).getByRole('button', { name: 'Show all 5 comments' }))
    const sheet = await screen.findByRole('dialog', { name: 'Comments on Luzerne: The Things That Remain' })

    expect(within(sheet).getAllByRole('article')).toHaveLength(5)
    expect(within(sheet).getAllByText('Reply from Lukas')).toHaveLength(2)
    expect(within(sheet).getByText('Thank you, Elena. Allow 40–50 minutes of moving time; the rest is time to look.')).toBeInTheDocument()
    await userEvent.click(within(sheet).getAllByRole('button', { name: en['detail.sheet.close'] }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[E3.1] the comments are German on the German page', async () => {
    await renderTour('de', RoutedTourPage, '?tab=comments')

    expect(await screen.findByRole('button', { name: 'Alle 5 Kommentare anzeigen' })).toBeInTheDocument()
    expect(screen.getByText(/Der Wasserturm wird nur von aussen/)).toBeInTheDocument()
  })
})

describe('tab change scroll', () => {
  /** The page is scrolled past its tab bar: the Tabs root sits 200px above the viewport. */
  const scrolledPast = () => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: -200, bottom: -100, left: 0, right: 0, width: 0, height: 100, x: 0, y: -200, toJSON: () => ({}) })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[E3.1] the routed page scrolls back to the bar when the tab changes after the bar was passed', async () => {
    await renderTour()
    scrolledPast()
    await userEvent.click(screen.getByRole('tab', { name: 'Comments (5)' }))

    expect(window.scrollBy).toHaveBeenCalledWith({ top: -200 })
  })

  it('[E3.1] the routed page does not scroll when the bar is still in view', async () => {
    await renderTour()
    await userEvent.click(screen.getByRole('tab', { name: 'Comments (5)' }))

    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('[E3.1] the M13 preview changes tab without scrolling the merchant window', async () => {
    await renderTour('en', () => <TourDetail preview tour={thingsThatRemain} />)
    scrolledPast()
    await userEvent.click(screen.getByRole('tab', { name: 'Itinerary' }))

    expect(screen.getByRole('tab', { name: 'Itinerary' })).toHaveAttribute('aria-selected', 'true')
    expect(window.scrollBy).not.toHaveBeenCalled()
  })
})

describe('itinerary stepper', () => {
  it.each([
    ['en', ['Start', '+20 min', '+1 h', '+1 h 25 min']],
    ['de', ['Start', '+20 Min.', '+1 Std.', '+1 Std. 25 Min.']],
  ] as const)('[E3.1] lists the stops as an ordered list with the time from the start (%s)', async (language, times) => {
    await renderTour(language, RoutedTourPage, '?tab=itinerary')
    const list = document.querySelector('section ol') as HTMLElement
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(6)
    expect(list.querySelectorAll('[aria-hidden]').length).toBeGreaterThanOrEqual(6)
    expect(items.slice(0, 4).map(item => item.querySelector('span.text-muted')?.textContent)).toEqual(times)
  })
})

describe('tour page without comments or stops', () => {
  const rows = () => within(screen.getByRole('region', { name: 'The route at a glance' })).getAllByRole('listitem').map(row => row.querySelector('.text-muted')?.textContent)

  it('[E3.1] a tour with no stops has no stepper, and its highlights skip the stops row', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, itinerary: [] }} />)

    expect(rows()).toEqual(['Duration', 'Where it starts'])
    expect(screen.queryByText(/^From .+ to .+$/)).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'Itinerary' }))
    expect(screen.queryByRole('heading', { name: 'Suggested itinerary' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Where it starts' })).toBeInTheDocument()
    expect(FakeMap.instances).toHaveLength(0)
  })

  it('[E3.1] a tour with no comments has no Comments section, and its tab has no count', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, id: 'new-tour' }} />)

    expect(rows()).toHaveLength(3)
    expect(screen.getByRole('tab', { name: 'Comments' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Comments' }))
    expect(screen.queryByRole('heading', { name: 'Comments', level: 2 })).toBeNull()
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument()
  })

  it('[E3.1] with no comments in the page language, the other language shows with a note', async () => {
    const original = tourCommentSeed.filter(c => c.articleId === 'things-that-remain-de')

    try {
      tourCommentSeed.splice(0, tourCommentSeed.length, ...tourCommentSeed.filter(c => c.articleId !== 'things-that-remain-de'))
      await renderTour('de', RoutedTourPage, '?tab=comments')

      expect(await screen.findByText('Diese Kommentare gibt es nur auf Englisch.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Kommentare', level: 2 })).toBeInTheDocument()
      expect(document.querySelector('#tour-comments article p[lang="en"]')).not.toBeNull()
    }
    finally {
      tourCommentSeed.push(...original)
    }
  })
})
