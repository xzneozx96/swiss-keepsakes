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
import { tourDiscoveryEn as discovery } from '@/features/tours/discovery/messages'
import { tourDiscoveryDe } from '@/features/tours/discovery/messages.de'
import { TourDetail } from '@/features/tours/discovery/tour-detail-page'
import { parseTourSearch } from '@/features/tours/discovery/tour-tabs'
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
    ['en', 'The route at a glance', [['3 hours', 'Duration'], ['6', 'Stops']], /^From .+ to .+$/],
    ['de', 'Die Route auf einen Blick', [['3 Stunden', 'Dauer'], ['6', 'Stationen']], /^Von .+ bis .+$/],
  ] as const)('[E3.1] the Overview card shows the duration and the stops, then where the route starts and ends; the header has no stats (%s)', async (language, label, facts, route) => {
    await renderTour(language)
    const card = screen.getByRole('region', { name: label })
    const shown = Array.from((card.querySelector('dl') as HTMLElement).children, item => [item.querySelector('dd')?.textContent, item.querySelector('dt')?.textContent])

    expect(shown).toEqual(facts.map(fact => [...fact]))
    expect(within(card).getByText(route)).toBeInTheDocument()
    // The card is the page's only figures list: the header lost its stats row (owner, 06.11.2026).
    expect(document.querySelectorAll('dl')).toHaveLength(1)
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
  const stats = () => Array.from((screen.getByRole('region', { name: 'The route at a glance' }).querySelector('dl') as HTMLElement).children, item => item.querySelector('dt')?.textContent)

  it('[E3.1] a tour with no stops has no stepper, and its card shows the duration alone', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, itinerary: [] }} />)

    expect(stats()).toEqual(['Duration'])
    expect(screen.queryByText(/^From .+ to .+$/)).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'Itinerary' }))
    expect(screen.queryByRole('heading', { name: 'Suggested itinerary' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Where it starts' })).toBeInTheDocument()
    expect(FakeMap.instances).toHaveLength(0)
  })

  it('[E3.1] a tour with no comments has no Comments section, and its tab has no count', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, id: 'new-tour' }} />)

    expect(stats()).toEqual(['Duration', 'Stops'])
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
