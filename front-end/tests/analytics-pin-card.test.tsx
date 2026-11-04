import type { PublicMapItem } from '@sk/api-contract'
import type { PlaceDetail } from '@/features/map/lib/place-detail'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useSearch } from '@tanstack/react-router'
import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { AnalyticsRoot } from '@/features/analytics/components/analytics-root'
import { fetchMapCategories, fetchMapPin, fetchMapPins } from '@/features/map/api/map-client'
import { MapScreen } from '@/features/map/components/map-screen'
import { PlaceSheet } from '@/features/map/components/place-sheet'
import { en } from '@/i18n/en'
import { isTrackAllowed, setTrackAllowed } from '@/lib/analytics/track'
import { installFakeAnalytics } from './support/fake-analytics'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

configure({ asyncUtilTimeout: 5000 })
vi.setConfig({ testTimeout: 20_000 })

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))
vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
const gate = vi.hoisted(() => ({
  sessionUser: (): Promise<unknown> => Promise.resolve(null),
  stores: [] as unknown[],
  meAsked: false,
}))

vi.mock('@/lib/analytics/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics/config')>()

  return { ...actual, analyticsEnabled: () => true }
})
vi.mock('@/features/stores/api/queries', () => ({
  sessionUserQuery: { queryKey: ['test', 'session-user'], queryFn: () => gate.sessionUser() },
  useMe: (enabled: boolean) => {
    if (enabled)
      gate.meAsked = true

    return { isPending: false, isError: false, data: { stores: gate.stores } }
  },
}))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function pin(n: number, title: string, extra: Partial<PublicMapItem> = {}): PublicMapItem {
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
    ...extra,
  }
}

const bridge = pin(1, 'Chapel Bridge', { hasMainStory: true, mainStorySlug: 'chapel-bridge-story' })
const hotel = pin(2, 'Hotel am See')
const market = pin(3, 'Wine Market')
const pins = [bridge, hotel, market]

function detailOf(item: PublicMapItem): PlaceDetail {
  const base: PlaceDetail = { id: item.id, title: item.title, language: 'en', tip: '', latitude: item.latitude, longitude: item.longitude, address: null, mapsLink: null, hours: [], nextDate: null, link: null, photos: [], mainStory: null, otherStories: [] }

  if (item.id === bridge.id)
    return { ...base, link: 'https://www.luzern.com/en/chapel-bridge?utm=x', mainStory: { slug: 'chapel-bridge-story', title: 'The oldest wooden bridge', readMinutes: 6 }, otherStories: [{ slug: 'lucerne-in-a-day', title: 'Lucerne in one day', readMinutes: 4 }] }

  return base
}

function MapAtRoute() {
  const { place } = useSearch({ strict: false }) as { place?: string }

  return <MapScreen place={place} />
}

/** `withRoot` mounts the real AnalyticsRoot and its gate; without it the tests open the gate by hand, as AnalyticsRoot does for a guest. */
async function loaded(url = '/en/map', withRoot = false) {
  if (!withRoot)
    setTrackAllowed(true)
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider>
          {withRoot ? <AnalyticsRoot /> : null}
          <Outlet />
        </LocaleProvider>
      </QueryClientProvider>
    ),
  })
  const map = createRoute({
    getParentRoute: () => root,
    path: '/$lang/map',
    validateSearch: (search: Record<string, unknown>): { place?: string } => (typeof search.place === 'string' && search.place !== '' ? { place: search.place } : {}),
    component: MapAtRoute,
  })
  const story = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([map, story]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  act(() => FakeMap.instances[0]!.emit('load'))
  act(() => FakeMap.instances[0]!.emit('idle'))
  await screen.findByRole('button', { name: en['map.categories'] })
}

const pinButton = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })
const cardOf = (title: string) => screen.getByRole('heading', { level: 2, name: title }).closest('article')!
const fake = installFakeAnalytics()
const opens = () => fake.events.filter(event => event.name === 'pin_open')

async function openSheetOf(title: string) {
  await userEvent.click(pinButton(title))
  await screen.findByRole('heading', { level: 2, name: title })
  await userEvent.click(within(cardOf(title)).getByRole('button', { name: en['map.card.more'] }))

  return within(await screen.findByRole('dialog'))
}

beforeEach(() => {
  fake.reset()
  setTrackAllowed(false)
  gate.sessionUser = () => Promise.resolve(null)
  gate.stores = []
  gate.meAsked = false
  resetFakeMaps()
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue(pins)
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue([])
  vi.mocked(fetchMapPin).mockReset().mockImplementation(async pinId => detailOf(pins.find(candidate => candidate.id === pinId)!))
})

describe('[E8.7][AC37][AC60][AC-8] the pin card reports pin_open, pin_to_story_click and outbound_click', () => {
  it('records pin_open, pin_to_story_click and outbound_click, each with the pin id and page type place, and no URL', async () => {
    await loaded()
    await userEvent.click(pinButton('Hotel am See'))
    await userEvent.click(pinButton('Chapel Bridge'))
    await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })
    await userEvent.click(within(cardOf('Chapel Bridge')).getByRole('button', { name: en['map.card.more'] }))
    const sheet = within(await screen.findByRole('dialog'))

    // The story link leaves the map, so the outbound link is followed first.
    await userEvent.click(await sheet.findByRole('link', { name: /luzern\.com/ }))
    await userEvent.click(await sheet.findByRole('link', { name: /The oldest wooden bridge/ }))

    expect(fake.events.map(event => [event.name, event.props.content_id])).toEqual([
      ['pin_open', id(102)],
      ['pin_open', id(101)],
      ['outbound_click', id(101)],
      ['pin_to_story_click', id(101)],
    ])
    expect(fake.events.every(event => event.props.page_type === 'place')).toBe(true)
    expect(JSON.stringify(fake.events)).not.toMatch(/https?:|\/en\//)
  })

  it('follows the story link and the outbound link of the open pin', async () => {
    await loaded()
    // The first automatic card is the bridge; open another pin and come back to it with a tap, so the bridge's card is the open one.
    await userEvent.click(pinButton('Hotel am See'))
    await userEvent.click(pinButton('Chapel Bridge'))
    await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })
    await userEvent.click(within(cardOf('Chapel Bridge')).getByRole('button', { name: en['map.card.more'] }))
    const sheet = within(await screen.findByRole('dialog'))

    fake.reset()
    await userEvent.click(await sheet.findByRole('link', { name: /luzern\.com/ }))
    await userEvent.click(await sheet.findByRole('link', { name: /Lucerne in one day/ }))

    expect(fake.events.map(event => event.name)).toEqual(['outbound_click', 'pin_to_story_click'])
    for (const event of fake.events) {
      expect(event.props).toMatchObject({ page_type: 'place', content_id: id(101), language: 'en' })
      expect(Object.keys(event.props).sort()).toEqual(['content_id', 'device_class', 'language', 'page_type', 'referrer_class'])
      expect(JSON.stringify(event.props)).not.toMatch(/https?:|\/en\//)
    }
  })

  it('records nothing for the automatic first card', async () => {
    await loaded()
    await screen.findByRole('heading', { level: 2, name: 'Chapel Bridge' })

    expect(fake.events).toEqual([])
  })

  it('records pin_open once for a tap, and not again for a tap on the pin that is already open', async () => {
    await loaded()
    await userEvent.click(pinButton('Hotel am See'))
    await screen.findByRole('heading', { level: 2, name: 'Hotel am See' })
    await userEvent.click(pinButton('Hotel am See'))

    expect(opens().map(event => event.props.content_id)).toEqual([id(102)])
  })

  it('records pin_open for a list row', async () => {
    await loaded()
    await userEvent.click(screen.getByRole('button', { name: en['map.view.list'] }))
    await userEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /Wine Market/ }))
    await screen.findByRole('heading', { level: 2, name: 'Wine Market' })

    expect(opens().map(event => event.props.content_id)).toEqual([id(103)])
  })

  it('records pin_open for the next place in the sheet', async () => {
    await loaded()
    const sheet = await openSheetOf('Chapel Bridge')

    expect(fake.events).toEqual([])
    await userEvent.click(sheet.getByRole('button', { name: en['map.sheet.next'] }))

    expect(opens().map(event => event.props.content_id)).toEqual([id(102)])
  })

  it('records pin_open once for a ?place= deep link', async () => {
    await loaded('/en/map?place=pin-3')
    await screen.findByRole('heading', { level: 2, name: 'Wine Market' })

    expect(opens().map(event => event.props.content_id)).toEqual([id(103)])
  })
})

describe('[E8.7][AC37][AC60][AC-5] the ?place= deep link goes through the guest gate', () => {
  it('a signed-in merchant opening /en/map?place= records nothing, not even the deep-linked pin', async () => {
    gate.sessionUser = () => Promise.resolve({ id: 'u1' })
    gate.stores = [{ id: 's1' }]
    await loaded('/en/map?place=pin-3', true)
    await screen.findByRole('heading', { level: 2, name: 'Wine Market' })
    await waitFor(() => expect(gate.meAsked).toBe(true))

    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])
  })

  it('a guest opening /en/map?place= records the deep-linked pin once, also when the session answers after the card is shown', async () => {
    let answer: (user: unknown) => void = () => {}

    gate.sessionUser = () => new Promise((done) => {
      answer = done
    })
    await loaded('/en/map?place=pin-3', true)
    await screen.findByRole('heading', { level: 2, name: 'Wine Market' })

    // The gate holds while the session is unresolved: the deep link is not sent, and not given up either.
    expect(isTrackAllowed()).toBe(false)
    expect(opens()).toEqual([])

    await act(async () => answer(null))
    await waitFor(() => expect(opens().map(event => event.props.content_id)).toEqual([id(103)]))
    await userEvent.click(pinButton('Wine Market'))

    expect(opens().map(event => event.props.content_id)).toEqual([id(103)])
  })
})

describe('[E8.7][AC37][AC60][AC-8] a sheet without callbacks (the place editor preview) sends nothing', () => {
  it('records nothing when the story button and the website link are used', async () => {
    const root = createRootRoute()
    const page = createRoute({
      getParentRoute: () => root,
      path: '/$lang/map',
      component: () => (
        <LocaleProvider>
          <PlaceSheet detail={detailOf(bridge)} isOpen item={bridge} position={{ index: 0, count: 1 }} onClose={() => {}} onReadStory={() => {}} onStep={() => {}} />
        </LocaleProvider>
      ),
    })
    const stories = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })

    render(<RouterProvider router={createRouter({ routeTree: root.addChildren([page, stories]), history: createMemoryHistory({ initialEntries: ['/en/map'] }) })} />)
    const sheet = within(await screen.findByRole('dialog'))

    fake.reset()
    await userEvent.click(sheet.getByRole('button', { name: /The oldest wooden bridge/ }))
    await userEvent.click(sheet.getByRole('link', { name: /luzern\.com/ }))

    expect(fake.events).toEqual([])
  })

  it('calls onStoryClick for the story button and onOutboundClick for the website link when given', async () => {
    const onStoryClick = vi.fn()
    const onOutboundClick = vi.fn()
    const root = createRootRoute()
    const page = createRoute({
      getParentRoute: () => root,
      path: '/$lang/map',
      component: () => (
        <LocaleProvider>
          <PlaceSheet detail={detailOf(bridge)} isOpen item={bridge} position={{ index: 0, count: 1 }} onClose={() => {}} onOutboundClick={onOutboundClick} onReadStory={() => {}} onStep={() => {}} onStoryClick={onStoryClick} />
        </LocaleProvider>
      ),
    })
    const stories = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })

    render(<RouterProvider router={createRouter({ routeTree: root.addChildren([page, stories]), history: createMemoryHistory({ initialEntries: ['/en/map'] }) })} />)
    const sheet = within(await screen.findByRole('dialog'))

    await userEvent.click(sheet.getByRole('button', { name: /The oldest wooden bridge/ }))
    expect(onStoryClick).toHaveBeenCalledTimes(1)
    expect(onOutboundClick).not.toHaveBeenCalled()
    await userEvent.click(sheet.getByRole('link', { name: /luzern\.com/ }))
    expect(onOutboundClick).toHaveBeenCalledTimes(1)
    await userEvent.click(sheet.getByRole('link', { name: /Lucerne in one day/ }))
    expect(onStoryClick).toHaveBeenCalledTimes(2)
  })
})
