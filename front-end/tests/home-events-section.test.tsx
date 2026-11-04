import type { NextDate, PublicMapItem } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { EventsSection } from '@/features/home/components/events-section'
import { fetchMapCategories, fetchMapPins } from '@/features/map/api/map-client'
import { en } from '@/i18n/en'

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

let n = 0

function event(title: string, next: Partial<NextDate> & { firstDay: string }, extra: Partial<PublicMapItem> = {}): PublicMapItem {
  n += 1

  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    slug: `ev-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    title,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: { lastDay: next.firstDay, startTime: null, endTime: null, ...next },
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
    ...extra,
  }
}

function renderAt(url: string) {
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
    <>
      <EventsSection />
      <p>after</p>
    </>
  ) })
  const map = createRoute({ getParentRoute: () => root, path: '/$lang/map', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([home, map]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)

  return router
}

const title = en['homePage.events.title']

beforeEach(() => {
  n = 0
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-04T09:00:00Z') })
  vi.mocked(fetchMapPins).mockReset()
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('[E4.13][AC54][AC95] the events section', () => {
  it('splits This week and Coming up by the 7 days (AC-1)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([
      event('Soon', { firstDay: '2026-11-08' }),
      event('Running', { firstDay: '2026-11-01', lastDay: '2026-11-06' }),
      event('Later', { firstDay: '2026-11-20' }),
    ])
    renderAt('/en')

    const week = await screen.findByRole('region', { name: en['homePage.events.thisWeek'] })
    const coming = screen.getByRole('region', { name: en['homePage.events.comingUp'] })

    expect(within(week).getAllByRole('link').map(link => link.textContent)).toEqual([expect.stringContaining('Running'), expect.stringContaining('Soon')])
    expect(within(coming).getAllByRole('link').map(link => link.textContent)).toEqual([expect.stringContaining('Later')])
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('shows three later events with no See all link (AC-2)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue(['A', 'B', 'C'].map((name, i) => event(name, { firstDay: `2026-12-0${i + 1}` })))
    renderAt('/en')

    const coming = await screen.findByRole('region', { name: en['homePage.events.comingUp'] })

    expect(within(coming).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('link', { name: en['homePage.events.seeAll'] })).toBeNull()
  })

  it('links See all on the map to ?dated=1 only when more than three are later (AC-2, AC-6)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue(['A', 'B', 'C', 'D'].map((name, i) => event(name, { firstDay: `2026-12-0${i + 1}` })))
    renderAt('/en')

    const coming = await screen.findByRole('region', { name: en['homePage.events.comingUp'] })

    expect(within(coming).getAllByRole('listitem')).toHaveLength(3)
    expect(within(coming).getByRole('link', { name: en['homePage.events.seeAll'] })).toHaveAttribute('href', '/en/map?dated=1')
    expect(within(coming).getByText('December')).toBeInTheDocument()
  })

  it('draws neither the heading nor a box with no dated pin (AC-3)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([{ ...event('x', { firstDay: '2026-11-05' }), nextDate: null }])
    renderAt('/en')

    await screen.findByText('after')
    await waitFor(() => expect(screen.queryByRole('heading', { name: title })).toBeNull())
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('never shows an event whose last day was yesterday (AC-4)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([event('Gone', { firstDay: '2026-11-02', lastDay: '2026-11-03' }), event('Here', { firstDay: '2026-11-05' })])
    renderAt('/en')

    await screen.findByRole('link', { name: /Here/ })
    expect(screen.queryByText('Gone')).toBeNull()
  })

  it('gives one event this week the full width, and several a carousel (AC-5)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([event('Solo', { firstDay: '2026-11-05' })])
    renderAt('/en')
    const solo = await screen.findByRole('link', { name: /Solo/ })

    expect(solo.className).toContain('w-full')
    expect(solo.closest('li')).toBeNull()
  })

  it('makes a carousel of snap cards for three events this week (AC-5)', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue(['A', 'B', 'C'].map((name, i) => event(name, { firstDay: `2026-11-0${5 + i}` })))
    renderAt('/en')

    const week = await screen.findByRole('region', { name: en['homePage.events.thisWeek'] })
    const cards = within(week).getAllByRole('link')

    expect(cards).toHaveLength(3)
    expect(cards.every(card => card.closest('li')?.className.includes('snap-start') && !card.className.includes('w-full'))).toBe(true)
    expect(week.querySelector('ul')?.className).toContain('snap-x')
  })

  it('opens the map with that place, shows a category icon without a photo, and no price (AC-6)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const withPhoto = event('Photo', { firstDay: '2026-11-05' }, { photoUrl: 'https://img.test/p.jpg' })
    const noPhoto = event('Plain', { firstDay: '2026-11-06' })

    vi.mocked(fetchMapPins).mockResolvedValue([withPhoto, noPhoto])
    const router = renderAt('/en')
    const card = await screen.findByRole('link', { name: /Plain/ })

    expect(card.querySelector('[data-pin-icon]')).not.toBeNull()
    expect(screen.getByRole('link', { name: /Photo/ }).querySelector('img')).toHaveAttribute('src', 'https://img.test/p.jpg')
    expect(card).toHaveAttribute('href', `/en/map?place=${noPhoto.slug}`)
    expect(document.body.textContent).not.toMatch(/CHF/)
    await user.click(card)
    await waitFor(() => expect(router.state.location.pathname).toBe('/en/map'))
    expect(router.state.location.search).toEqual({ place: noPhoto.slug })
  })

  it('shows a skeleton that mirrors the section while the read loads', async () => {
    vi.mocked(fetchMapPins).mockReturnValue(new Promise(() => {}))
    renderAt('/en')

    await screen.findByRole('heading', { name: title })
    const skeleton = document.querySelector('[data-skeleton="events"]')

    expect(skeleton).not.toBeNull()
    expect(skeleton?.querySelectorAll('.skeleton').length).toBeGreaterThan(5)
  })

  it('shows an error with Try again when the read fails, then the events', async () => {
    vi.mocked(fetchMapPins).mockRejectedValueOnce(new Error('down')).mockResolvedValue([event('Back', { firstDay: '2026-11-05' })])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    renderAt('/en')
    await screen.findByText(en['homePage.events.failed'])
    await user.click(screen.getByRole('button', { name: en['errorNotice.retry'] }))
    await screen.findByRole('link', { name: /Back/ })
  })

  it('prints no CHF in the server HTML of the loading state or of the events', async () => {
    vi.mocked(fetchMapPins).mockResolvedValue([event('Soon', { firstDay: '2026-11-05' }), event('Later', { firstDay: '2026-12-01' })])
    const server = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <LocaleProvider>
          <EventsSection />
        </LocaleProvider>
      </QueryClientProvider>,
    )

    expect(server).not.toContain('CHF')
    renderAt('/en')
    await screen.findByRole('link', { name: /Soon/ })
    expect(document.body.innerHTML).not.toContain('CHF')
  })
})
