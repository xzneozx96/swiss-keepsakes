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
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderTour(language = 'en', component: () => React.ReactNode = () => <TourDetailPage slug={slug} />) {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify(language))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/tours/$slug', component })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [`/tours/${slug}`] }),
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
    ['en', ['6', 'Stops'], ['3 hours', 'Duration'], ['5', 'Comments']],
    ['de', ['6', 'Stationen'], ['3 Stunden', 'Dauer'], ['5', 'Kommentare']],
  ] as const)('[E3.1] the header stats show the stops, the duration in the middle and the comments (%s)', async (language, ...stats) => {
    await renderTour(language)
    const list = document.querySelector('dl') as HTMLElement
    const shown = Array.from(list.children, item => [item.querySelector('dd')?.textContent, item.querySelector('dt')?.textContent])

    expect(shown).toHaveLength(3)
    expect(shown).toEqual(stats.map(stat => [...stat]))
  })

  it('[E3.1] comments show the first three, and "Show all" opens all of them in a sheet with the replies', async () => {
    await renderTour()
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
    await renderTour('de')

    expect(await screen.findByRole('button', { name: 'Alle 5 Kommentare anzeigen' })).toBeInTheDocument()
    expect(screen.getByText(/Der Wasserturm wird nur von aussen/)).toBeInTheDocument()
  })

  it('[E3.1] the itinerary is a sheet: it comes before the comments, loads the map only when opened, and focus returns to its button', async () => {
    await renderTour()
    const heading = screen.getByRole('heading', { name: 'Suggested itinerary', level: 2 })
    const comments = screen.getByRole('heading', { name: 'Comments', level: 2 })

    expect(heading.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(FakeMap.instances).toHaveLength(0)
    // The route sections are not on the page: they sit in the sheet.
    expect(screen.queryByRole('heading', { name: 'At a glance' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Before you go' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Where it starts' })).toBeNull()
    expect(screen.queryByText(/Practical information checked on/)).toBeNull()
    const open = screen.getByRole('button', { name: 'Open the itinerary map' })

    await userEvent.click(open)
    const sheet = await screen.findByRole('dialog', { name: 'Suggested itinerary' })

    await waitFor(() => expect(FakeMap.instances).toHaveLength(1), { timeout: 20000 })
    const headings = within(sheet).getAllByRole('heading', { level: 2 }).map(h => h.textContent)

    expect(headings.slice(1, 4)).toEqual(['Where it starts', 'Before you go', 'Who this walk is for'])
    expect(within(sheet).getByRole('heading', { name: 'At a glance' })).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { name: 'Access and what to expect' })).toBeInTheDocument()
    expect(within(sheet).getByText(/Practical information checked on/)).toBeInTheDocument()
    await userEvent.click(within(sheet).getAllByRole('button', { name: en['detail.sheet.close'] }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(open).toHaveFocus())
  }, 40000)
})

describe('itinerary stepper', () => {
  it.each([
    ['en', ['Start', '+20 min', '+1 h', '+1 h 25 min']],
    ['de', ['Start', '+20 Min.', '+1 Std.', '+1 Std. 25 Min.']],
  ] as const)('[E3.1] lists the stops as an ordered list with the time from the start (%s)', async (language, times) => {
    await renderTour(language)
    const list = document.querySelector('section ol') as HTMLElement
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(6)
    expect(list.querySelectorAll('[aria-hidden]').length).toBeGreaterThanOrEqual(6)
    expect(items.slice(0, 4).map(item => item.querySelector('span.text-muted')?.textContent)).toEqual(times)
  })
})

describe('tour page without comments or stops', () => {
  const stats = () => Array.from((document.querySelector('dl') as HTMLElement).children, item => item.querySelector('dt')?.textContent)

  it('[E3.1] a tour with no stops has no stepper and no Stops stat', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, itinerary: [] }} />)

    expect(stats()).toEqual(['Duration', 'Comments'])
    expect(screen.queryByRole('button', { name: 'Open the itinerary map' })).toBeNull()
  })

  it('[E3.1] a tour with no comments has no Comments section and no Comments stat', async () => {
    await renderTour('en', () => <TourDetail preview tour={{ ...thingsThatRemain, id: 'new-tour' }} />)

    expect(stats()).toEqual(['Stops', 'Duration'])
    expect(screen.queryByRole('heading', { name: 'Comments', level: 2 })).toBeNull()
  })

  it('[E3.1] with no comments in the page language, the other language shows with a note', async () => {
    const original = tourCommentSeed.filter(c => c.articleId === 'things-that-remain-de')

    try {
      tourCommentSeed.splice(0, tourCommentSeed.length, ...tourCommentSeed.filter(c => c.articleId !== 'things-that-remain-de'))
      await renderTour('de')

      expect(await screen.findByText('Diese Kommentare gibt es nur auf Englisch.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Kommentare', level: 2 })).toBeInTheDocument()
      expect(document.querySelector('#tour-comments article p[lang="en"]')).not.toBeNull()
    }
    finally {
      tourCommentSeed.push(...original)
    }
  })
})
