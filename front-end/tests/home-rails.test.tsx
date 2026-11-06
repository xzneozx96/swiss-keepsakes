import type { PublicMapItem, PublicTourCard } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    address: null,
    weeklyHours: [],
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
  return { id: id(n), slug: `tour-${n}`, title: `Tour ${n}`, stayTag, interests: [], durationMinutes: 180, stopCount: 4, coverKey: null, cover: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'], ...over }
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
    // The two tours are laid out five times for the loop (ten slides), only the first has a photo.
    expect(html.match(/<img/g)).toHaveLength(5)
  })

  it('draws the first card readable and reachable in the server HTML, before Swiper starts', async () => {
    const html = renderToString(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { title: 'Rigi: From Lake to Sky' }), tour(2, 'both')]} onRetry={() => {}} />)} />)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const live = [...doc.querySelectorAll('a[href^="/en/tours/"]')].filter(link => !link.hasAttribute('inert'))

    expect(live).toHaveLength(1)
    expect(live[0]?.querySelector('h3')?.textContent).toBe('Rigi')
    expect(live[0]?.innerHTML).not.toContain('opacity-0')
    expect(live[0]?.innerHTML).toContain('opacity-100')
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
    // One card with two tilted boxes behind it, and the two round buttons and the counter line.
    expect(html.match(/class="skeleton /g)?.length).toBeGreaterThanOrEqual(6)
  })
})

describe('[E4.13][AC95] the postcards in the browser', () => {
  it('moves the pin that matches the answered interest to the front and still shows all four (AC-1)', async () => {
    answer(null, ['food-drink'])
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={FOUR} onRetry={() => {}} />)} />)

    const names = (await screen.findAllByRole('heading', { level: 3 })).map(heading => heading.textContent)

    expect(names).toEqual(['Pin 3', 'Pin 1', 'Pin 2', 'Pin 4'])
  })

  it('opens the map card of a place from the card, and the story from “Read the story” with Google Maps beside it (AC-5)', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1, { hasMainStory: true, mainStorySlug: 'the-bridge' }), pin(2, { slug: null })]} onRetry={() => {}} />)} />)

    expect(await screen.findByRole('link', { name: 'Pin 1' })).toHaveAttribute('href', '/en/map?place=pin-1')
    expect(screen.getByRole('link', { name: 'Pin 2' })).toHaveAttribute('href', '/en/map')
    const card = screen.getByRole('heading', { level: 3, name: 'Pin 1' }).closest('article')!

    expect(within(card).getByRole('link', { name: 'Read the story' })).toHaveAttribute('href', '/en/stories/the-bridge')
    expect(within(card).getByRole('link', { name: en['map.directions'] })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=47.05,8.3')
    // No tip and no kind-of-place line on the card (owner, 05.11.2026).
    expect(screen.queryByText('Tip 1')).toBeNull()
    expect(screen.getAllByRole('link', { name: en['homePage.must.story'] })).toHaveLength(1)
  })

  it('without a story, the pill is “Directions” to Google Maps and there is no round button', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1)]} onRetry={() => {}} />)} />)

    const card = (await screen.findByRole('heading', { level: 3, name: 'Pin 1' })).closest('article')!
    const links = within(card).getAllByRole('link')

    expect(links.map(link => link.textContent?.trim() || link.getAttribute('aria-label'))).toEqual(['Pin 1', en['homePage.must.directions']])
    expect(links[1]).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=47.05,8.3')
    expect(within(card).queryByRole('link', { name: en['map.directions'] })).toBeNull()
  })

  it('shows the street before the postcode, and today’s hours only after hydration', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-05T11:00:00Z')) // Thursday noon in Lucerne
    const church = pin(1, { title: 'Jesuit Church', address: 'Bahnhofstrasse 11a, 6003 Luzern', weeklyHours: [{ day: 4, opens: '06:30', closes: '18:30' }] })
    const html = renderToString(<RouterProvider router={await routerOf(<MustVisitsSection pins={[church]} onRetry={() => {}} />)} />)

    expect(textOf(html)).toContain('Bahnhofstrasse 11a')
    expect(textOf(html)).not.toContain('6003')
    expect(textOf(html)).not.toContain('18:30')
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[church]} onRetry={() => {}} />)} />)

    expect(await screen.findByText('Open until 18:30')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('draws no street or hours line for a place without them', async () => {
    render(<RouterProvider router={await routerOf(<MustVisitsSection pins={[pin(1)]} onRetry={() => {}} />)} />)

    const card = (await screen.findByRole('heading', { level: 3, name: 'Pin 1' })).closest('article')!

    expect(card.querySelectorAll('p')).toHaveLength(0)
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

  it('opens the onboarding flow in change mode, and reads "Sorted for your trip" once answers are saved (AC-4)', async () => {
    answer('short_stay', ['food-drink'])
    render(<RouterProvider router={await routerOf(<SortNotice />)} />)

    const pill = await screen.findByRole('button', { name: /Sorted for/ })

    // The notice no longer lists the answers (owner, 06.11.2026).
    expect(pill).toHaveAccessibleName(`${en['homePage.sort.for']}, ${en['homePage.sort.change']}`)
    expect(pill).toHaveTextContent(en['homePage.sort.change'])
    await userEvent.click(pill)
    expect(screen.getByTestId('request')).toHaveTextContent('change')

    act(() => saveAnswers({ stay: 'multi_day', interests: [] }))

    expect(screen.getByRole('button', { name: /Sorted for/ })).toHaveAccessibleName(`${en['homePage.sort.for']}, ${en['homePage.sort.change']}`)
    expect(screen.queryByText(new RegExp(en['stories.sort.stay.multi_day']))).toBeNull()
  })
})

describe('[E4.13][AC95] the routes in the browser', () => {
  const original = window.matchMedia

  /** jsdom never ends a Swiper transition; with reduced motion the speed is 0 and a change ends at once. */
  const reduceMotion = () => {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
  }

  afterEach(() => {
    window.matchMedia = original
  })

  it('shows multi-day tours first after a multi-day answer and drops none (AC-2)', async () => {
    answer('multi_day', [])
    render(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />)} />)

    const counter = await screen.findByText('1 of 2')

    // Multi-day first: the front card is Tour 1, and nothing is dropped.
    expect(counter.parentElement).toHaveTextContent('Tour 1')
    expect(document.querySelectorAll('.swiper-slide a:not([inert])')[0]).toHaveAttribute('href', '/en/tours/tour-1')
  })

  it('draws the deck with the place as masthead and the sub-title, stops and hours at the foot (AC-5)', async () => {
    const tours = [tour(1, 'both', { title: 'Rigi: From Lake to Sky', durationMinutes: 390, stopCount: 4 })]
    render(<RouterProvider router={await routerOf(<RoutesSection tours={tours} onRetry={() => {}} />)} />)

    const front = (await screen.findAllByRole('link', { name: /Rigi/ })).find(link => !link.hasAttribute('inert')) as HTMLElement

    expect(front).toHaveAttribute('href', '/en/tours/tour-1')
    expect(within(front).getByText('Rigi')).toBeInTheDocument()
    expect(within(front).getByText('From Lake to Sky')).toBeInTheDocument()
    expect(within(front).getByText('4 stops')).toBeInTheDocument()
    expect(within(front).getByText('6.5 hours')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('CHF')
  })

  it('has no sub-title line for a title without a colon, and no hours without a duration', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { title: 'Lucerne', durationMinutes: null })]} onRetry={() => {}} />)} />)

    const front = (await screen.findAllByRole('link', { name: /Lucerne/ })).find(link => !link.hasAttribute('inert')) as HTMLElement

    expect(front.textContent).toBe('Lucerne4 stops')
  })

  it('draws one route as a single card, with no deck, arrows or counter', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { title: 'Rigi: From Lake to Sky' })]} onRetry={() => {}} />)} />)

    expect(await screen.findByRole('link', { name: /Rigi/ })).toHaveAttribute('href', '/en/tours/tour-1')
    expect(screen.getAllByRole('link', { name: /Rigi/ })).toHaveLength(1)
    expect(document.querySelector('.swiper')).toBeNull()
    expect(screen.queryByRole('button', { name: /route/i })).toBeNull()
    expect(document.body.textContent).not.toContain('1 of 1')
  })

  it('makes only the front card focusable and opens the tour in its own language', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { language: 'de', fallback: true }), tour(2, 'both')]} onRetry={() => {}} />)} />)

    await screen.findAllByRole('link', { name: /Tour/ })
    const live = document.querySelectorAll('.swiper-slide a:not([inert])')

    expect(live).toHaveLength(1)
    expect(live[0]).toHaveAttribute('href', '/de/tours/tour-1')
  })

  it('counts the routes and wraps after the last one, on the buttons (reduced motion, so a change ends at once in jsdom)', async () => {
    reduceMotion()
    render(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />)} />)

    const counter = await screen.findByText('1 of 2')
    const next = screen.getByRole('button', { name: en['homePage.routes.next'] })

    expect(counter.parentElement).toHaveAttribute('aria-live', 'polite')
    expect(counter.parentElement).toHaveTextContent('1 of 2: Tour 2 · swipe the cards')
    await userEvent.click(next)
    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
    expect(screen.getByText('2 of 2').parentElement).toHaveTextContent('Tour 1')
    await userEvent.click(next)
    expect(await screen.findByText('1 of 2')).toBeInTheDocument()
  })

  it('lays four routes out as twelve slides and counts them out of four', async () => {
    reduceMotion()
    const four = [1, 2, 3, 4].map(n => tour(n, 'both'))
    render(<RouterProvider router={await routerOf(<RoutesSection tours={four} onRetry={() => {}} />)} />)

    expect(await screen.findByText('1 of 4')).toBeInTheDocument()
    expect(document.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)')).toHaveLength(12)
    await userEvent.click(screen.getByRole('button', { name: en['homePage.routes.next'] }))
    expect(await screen.findByText('2 of 4')).toBeInTheDocument()
  })

  it('tags a route that is not in the guest language, as the map card does (AC64)', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={[tour(1, 'both', { language: 'de', fallback: true })]} onRetry={() => {}} />)} />)

    expect((await screen.findAllByText(en['map.card.onlyIn.de'])).length).toBeGreaterThan(0)
  })

  it('speaks German on the German page', async () => {
    render(<RouterProvider router={await routerOf(<RoutesSection tours={TOURS} onRetry={() => {}} />, 'de')} />)

    expect(await screen.findByRole('button', { name: de['homePage.routes.next'] })).toBeInTheDocument()
    expect(screen.getByText('1 von 2')).toBeInTheDocument()
    expect(screen.getAllByText('4 Stopps').length).toBeGreaterThan(0)
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
