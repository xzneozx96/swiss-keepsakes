import type { PublicMapItem, PublicTourCard } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { MustVisitsSection } from '@/features/home/components/must-visits-section'
import { RoutesSection } from '@/features/home/components/routes-section'
import { SortNotice } from '@/features/home/components/sort-notice'
import { resetAnswersStoreForTests, saveAnswers } from '@/features/onboarding/lib/answers-store'
import { resetOpenerForTests, useOnboardingRequest } from '@/features/onboarding/lib/opener'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function pin(n: number, over: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    title: `Pin ${n}`,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: true,
    tip: `Tip ${n}`,
    ...over,
  }
}

function tour(n: number, stayTag: PublicTourCard['stayTag'], over: Partial<PublicTourCard> = {}): PublicTourCard {
  return { id: id(n), slug: `tour-${n}`, title: `Tour ${n}`, stayTag, interests: [], durationMinutes: 180, coverKey: null, cover: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'], ...over }
}

const FOUR = [pin(1), pin(2), pin(3, { interests: ['food-drink'] }), pin(4)]
const TOURS = [tour(1, 'multi_day'), tour(2, 'short_stay')]

function Probe() {
  const request = useOnboardingRequest()

  return <output data-testid="request">{request ? request.mode : 'closed'}</output>
}

async function routerOf(children: ReactNode, lang: 'en' | 'de' = 'en') {
  const root = createRootRoute({ component: () => (
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>
        {children}
        <Probe />
      </LocaleProvider>
    </QueryClientProvider>
  ) })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined })
  const others = ['map', 'stories/$slug', 'tours/$slug'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: [`/${lang}`] }) })
  await router.load()

  return router
}

const answer = (segment: 'short_stay' | 'multi_day' | null, interests: string[]) => localStorage.setItem('sk.onboarding', JSON.stringify({ v: 1, segment, interests, answeredAt: '2026-11-04T10:00:00.000Z', dismissedAt: null }))
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, '\'').replace(/\s+/g, ' ')

beforeEach(() => {
  localStorage.clear()
  resetAnswersStoreForTests()
  resetOpenerForTests()
})

describe('[E4.13][AC24][AC54][AC95] the server HTML of the rails', () => {
  it('draws the postcards in the curated order whatever the saved answers, with no CHF (AC-1, AC-5)', async () => {
    answer('multi_day', ['food-drink'])
    const html = renderToString(<RouterProvider router={await routerOf(<MustVisitsSection pins={FOUR} onRetry={() => {}} />)} />)
    const at = ['Pin 1', 'Pin 2', 'Pin 3', 'Pin 4'].map(name => html.indexOf(name))

    expect(at.every(index => index >= 0)).toBe(true)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(html).not.toContain('CHF')
  })

  it('draws the routes short stay first whatever the saved answers (AC-2)', async () => {
    answer('multi_day', [])
    const html = renderToString(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />)} />)

    expect(html.indexOf('Tour 2')).toBeGreaterThan(-1)
    expect(html.indexOf('Tour 2')).toBeLessThan(html.indexOf('Tour 1'))
    expect(html).not.toContain('CHF')
  })

  it('shows the cover photo on a route card when the tour has one, and none without', async () => {
    const cover = { url: 'https://media.test/k/original.jpg', variants: [{ width: 320, url: 'https://media.test/k/w320.webp' }, { width: 640, url: 'https://media.test/k/w640.webp' }] }
    const html = renderToString(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { cover }), tour(2, 'both')]} onRetry={() => {}} />)} />)

    expect(html).toContain('src="https://media.test/k/w640.webp"')
    expect(html.match(/<img/g)).toHaveLength(1)
  })

  it('links a route to the address of its own language (ADR-002)', async () => {
    const html = renderToString(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(7, 'both', { language: 'de', fallback: true })]} onRetry={() => {}} />)} />)

    expect(html).toContain('href="/de/tours/tour-7"')
    expect(html).not.toContain('href="/en/tours/tour-7"')
  })

  it('draws a skeleton while the reads are out, for both rails', async () => {
    const html = renderToString(
      <RouterProvider router={await routerOf(
        <>
          <MustVisitsSection pins={undefined} onRetry={() => {}} />
          <RoutesSection tours={undefined} onRetry={() => {}} />
        </>,
      )}
      />,
    )

    expect(html).toContain('data-skeleton="must-visits"')
    expect(html).toContain('data-skeleton="routes"')
  })
})

describe('[E4.13][AC95] the postcards in the browser', () => {
  it('moves the pin that matches the answered interest to the front and still shows all four (AC-1)', async () => {
    answer(null, ['food-drink'])
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={FOUR} onRetry={() => {}} />)} />)

    const names = (await screen.findAllByRole('heading', { level: 3 })).map(heading => heading.textContent)

    expect(names).toEqual(['Pin 3', 'Pin 1', 'Pin 2', 'Pin 4'])
  })

  it('opens the map card of a place, the story of a pin, and shows the tip (AC-5)', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1, { hasMainStory: true, mainStorySlug: 'the-bridge' }), pin(2, { slug: null })]} onRetry={() => {}} />)} />)

    expect(await screen.findByRole('link', { name: /Pin 1/ })).toHaveAttribute('href', '/en/map?place=pin-1')
    expect(screen.getByRole('link', { name: en['homePage.must.story'] })).toHaveAttribute('href', '/en/stories/the-bridge')
    expect(screen.getByRole('link', { name: /Pin 2/ })).toHaveAttribute('href', '/en/map')
    expect(screen.getByText('Tip 1')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: en['homePage.must.story'] })).toHaveLength(1)
  })

  it('tags a pin that is not in the guest language (AC64)', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1, { language: 'de' })]} onRetry={() => {}} />)} />)

    expect(await screen.findByText(en['map.card.onlyIn.de'])).toBeInTheDocument()
  })

  it('is not drawn with no must-visit pin, and a single card still shows (AC-6)', async () => {
    const { unmount } = render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1, { mustVisit: false })]} onRetry={() => {}} />)} />)
    await screen.findByTestId('request')

    expect(screen.queryByText(en['homePage.must.title'])).toBeNull()
    unmount()
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1)]} onRetry={() => {}} />)} />)

    expect(await screen.findByRole('heading', { name: en['homePage.must.title'] })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Pin 1' })).toBeInTheDocument()
  })

  it('shows an error with retry when the read failed (AC-6)', async () => {
    const retry = vi.fn()
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={null} onRetry={retry} />)} />)

    const alert = (await screen.findByText(en['homePage.must.failed'])).closest('[role="alert"]') as HTMLElement
    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('speaks German at /de', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1)]} onRetry={() => {}} />, 'de')} />)

    expect(await screen.findByRole('heading', { name: de['homePage.must.title'] })).toBeInTheDocument()
  })
})

describe('[E4.13][AC36] the sort notice (in "First time in Lucerne?" since 05.11.2026)', () => {
  it('sends the offer in the server HTML whatever the saved answers (AC-4)', async () => {
    answer('multi_day', ['food-drink'])
    const html = renderToString(<RouterProvider router={await routerOf(<SortNotice />)} />)

    expect(textOf(html)).toContain(en['homePage.sort.personalise'])
  })

  it('reads "Sort for my trip" with no answers (AC-4)', async () => {
    render(<RouterProvider router={await routerOf(<SortNotice />)} />)

    expect(await screen.findByRole('button', { name: en['homePage.sort.personalise'] })).toBeInTheDocument()
  })

  it('opens the onboarding flow in change mode, and reads the answers once they are saved (AC-4)', async () => {
    answer('short_stay', ['food-drink'])
    render(<RouterProvider router={await routerOf(<SortNotice />)} />)

    const pill = await screen.findByRole('button', { name: /Sorted for/ })

    expect(pill).toHaveAccessibleName(`Sorted for ${en['stories.sort.stay.short_stay']}, ${en['places.interest.food-drink']}, ${en['homePage.sort.change']}`)
    expect(pill).toHaveTextContent(en['homePage.sort.change'])
    await userEvent.click(pill)
    expect(screen.getByTestId('request')).toHaveTextContent('change')

    act(() => saveAnswers({ stay: 'multi_day', interests: [] }))

    expect(screen.getByRole('button', { name: /Sorted for/ })).toHaveAccessibleName(`Sorted for ${en['stories.sort.stay.multi_day']}, ${en['homePage.sort.change']}`)
  })
})

describe('[E4.13][AC95] the routes in the browser', () => {
  it('shows multi-day tours first after a multi-day answer and drops none (AC-2)', async () => {
    answer('multi_day', [])
    render(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />)} />)

    const names = (await screen.findAllByRole('heading', { level: 3 })).map(heading => heading.textContent)

    expect(names).toEqual(['Tour 1', 'Tour 2'])
  })

  it('opens the existing tour page and prints a duration, no price (AC-5)', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />)} />)

    expect(await screen.findByRole('link', { name: /Tour 1/ })).toHaveAttribute('href', '/en/tours/tour-1')
    expect(screen.getAllByText(/start to finish/i).length).toBe(2)
    expect(document.body.textContent).not.toContain('CHF')
  })

  it('tags a tour that is not in the guest language (AC64)', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { language: 'de', fallback: true })]} onRetry={() => {}} />)} />)

    expect(await screen.findByText(en['map.card.onlyIn.de'])).toBeInTheDocument()
  })

  it('is not drawn with no tour, and shows an error with retry when the read failed (AC-6)', async () => {
    const { unmount } = render(<RouterProvider router={await routerOf(<RoutesSection tours={[]} onRetry={() => {}} />)} />)
    await screen.findByTestId('request')

    expect(screen.queryByText(en['homePage.routes.title'])).toBeNull()
    unmount()
    const retry = vi.fn()
    render(<RouterProvider router={await routerOf(<RoutesSection tours={null} onRetry={retry} />)} />)
    const alert = (await screen.findByText(en['homePage.routes.failed'])).closest('[role="alert"]') as HTMLElement
    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(retry).toHaveBeenCalledTimes(1)
  })
})
