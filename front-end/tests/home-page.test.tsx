import type { PublicCategory, PublicKeepsakeCard, PublicMapItem, PublicStoryCard, PublicTourCard } from '@sk/api-contract'

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { loadHomeRead } from '@/features/home/api/home-reads'
import { HomePage } from '@/features/home/components/home-page'
import { homeHead } from '@/features/home/lib/home-head'
import { serviceTiles } from '@/features/home/lib/service-tiles'
import { fetchMapCategories, fetchMapPins } from '@/features/map/api/map-client'
import { resetAnswersStoreForTests } from '@/features/onboarding/lib/answers-store'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { Route as HomeRoute } from '@/routes/_guest/$lang/index'

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/home/api/home-reads', () => ({ loadHomeRead: vi.fn() }))
vi.mock('@/features/catalog/api/keepsakes', () => ({ fetchKeepsakeList: vi.fn() }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn(), fetchMapCategories: vi.fn(), fetchMapPin: vi.fn() }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const water: PublicCategory = { id: id(1), slug: 'drinking-water', name: { en: 'Drinking water', de: 'Trinkwasser' }, parentId: null, icon: 'water', showOnHome: true, position: 1 }
const pin: PublicMapItem = {
  id: id(100),
  slug: 'fountain',
  latitude: 47.05,
  longitude: 8.3,
  title: 'Fountain',
  language: 'en',
  categoryIds: [water.id],
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

const mustVisit: PublicMapItem = { ...pin, id: id(101), slug: 'chapel-bridge', title: 'Chapel Bridge', mustVisit: true, tip: 'Go at dawn.' }
const tour = (n: number, title: string, stayTag: PublicTourCard['stayTag']): PublicTourCard => ({ id: id(300 + n), slug: `tour-${n}`, title, stayTag, interests: [], durationMinutes: 390, coverKey: null, cover: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] })
const tours = [tour(1, 'Pilatus above the city', 'multi_day'), tour(2, 'Old town in an hour', 'short_stay')]

const photo = { url: 'https://cdn.test/swan.jpg', variants: [{ width: 320, url: 'https://cdn.test/swan-320.webp' }, { width: 800, url: 'https://cdn.test/swan-800.webp' }] }
const swan: PublicKeepsakeCard = { id: id(200), slug: 'victorinox-swan', name: 'Victorinox Swan', cover: photo, soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en', 'de'] }
const bridge: PublicKeepsakeCard = { id: id(201), slug: 'victorinox-kapellbruecke', name: 'Victorinox Kapellbrücke', cover: null, soldOut: true, language: 'de', requestedLanguage: 'en', fallback: true, availableLanguages: ['de'] }
const champ: PublicKeepsakeCard = { id: id(203), slug: 'swisschamp', name: 'Swisschamp', cover: photo, soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }
const lion: PublicKeepsakeCard = { id: id(202), slug: 'victorinox-lion', name: 'Victorinox Löwe', cover: null, soldOut: false, language: 'de', requestedLanguage: 'en', fallback: true, availableLanguages: ['de'] }

type DataClient = ReturnType<typeof startSeedDemo>['dataClient']

/** The page in a router at `/$lang`, as the guest layout gives it: the data client, the query cache, the language and the demo cart store. */
async function buildRouter(url: string, dataClient?: DataClient) {
  const demo = startSeedDemo()
  const queryClient = dataClient ? new QueryClient({ defaultOptions: { queries: { retry: false } } }) : demo.queryClient
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <DataClientProvider client={dataClient ?? demo.dataClient}>
          <LocaleProvider>
            <DemoProvider store={demo.store}>
              <Outlet />
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
  // The route's own loader reads the blocks (the real one is `loadHomeRead`, mocked here), so the server HTML carries them.
  const home = createRoute({
    getParentRoute: () => root,
    path: '/$lang',
    loader: async ({ params }) => {
      if (params.lang === 'de')
        await loadDictionary('de')

      return loadHomeRead(params.lang === 'de' ? 'de' : 'en')
    },
    component: Page,
  })
  function Page() {
    return <HomePage read={home.useLoaderData()} />
  }
  const others = ['map', 'search', 'plan', 'gifts', 'stories', 'stories/$slug', 'tours/$slug'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: [url] }) })
  await router.load()

  return router
}

/** The words of the page as a reader gets them: tags and attributes dropped. */
function textOf(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, '\'').replace(/\s+/g, ' ')
}

beforeEach(() => {
  localStorage.clear()
  resetAnswersStoreForTests()
  vi.mocked(fetchKeepsakeList).mockReset().mockResolvedValue({ items: [swan, bridge, lion, champ] })
  vi.mocked(loadHomeRead).mockReset().mockImplementation(async lang => ({ pins: [pin, mustVisit], categories: [water], tiles: serviceTiles([water], [pin, mustVisit], lang), tours, stories: [] }))
  vi.mocked(fetchMapPins).mockReset().mockResolvedValue([pin])
  vi.mocked(fetchMapCategories).mockReset().mockResolvedValue([water])
})

describe('[E4.13][AC61] the page tags of /$lang', () => {
  it('sets the title, the description, its own canonical and an alternate for each language and x-default (AC-5)', () => {
    const head = homeHead('en')

    expect(head.meta).toEqual(expect.arrayContaining([{ title: en['home.title'] }, { name: 'description', content: en['homePage.meta.description'] }]))
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'http://localhost:3002/en' },
      { rel: 'alternate', hrefLang: 'en', href: 'http://localhost:3002/en' },
      { rel: 'alternate', hrefLang: 'de', href: 'http://localhost:3002/de' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'http://localhost:3002/en' },
    ])
  })

  it('the German head names the German address as canonical and the English one in x-default, in German words', () => {
    const head = homeHead('de')

    expect(head.meta).toEqual(expect.arrayContaining([{ title: de['home.title'] }, { name: 'description', content: de['homePage.meta.description'] }]))
    expect(head.links?.[0]).toEqual({ rel: 'canonical', href: 'http://localhost:3002/de' })
    expect(head.links?.at(-1)).toEqual({ rel: 'alternate', hrefLang: 'x-default', href: 'http://localhost:3002/en' })
  })

  it('the real route renders on the server and builds that head from its language', () => {
    const options = HomeRoute.options as { ssr?: boolean, head?: (context: { params: { lang: string } }) => unknown }

    expect(options.ssr).toBe(true)
    expect(options.head?.({ params: { lang: 'en' } })).toEqual(homeHead('en'))
    expect(options.head?.({ params: { lang: 'xx' } })).toEqual({})
  })
})

describe('[E4.13][AC24][AC54] the server HTML of the home', () => {
  it('has the blocks in the fixed order, with no CHF, no count under five and no guest review text (AC-4)', async () => {
    const html = renderToString(<RouterProvider router={await buildRouter('/en')} />)
    const text = textOf(html)
    const order = [en['home.heroTitle'], en['homePage.map.title'], en['homePage.services.title'], en['homePage.must.title'], en['homePage.routes.title'], en['home.victorinox.title'], en['homePage.ending.line'], en['home.advice.title']]
    const at = order.map(words => text.indexOf(words))

    expect(at.every(index => index >= 0)).toBe(true)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(html).not.toContain('CHF')
    expect(text).not.toMatch(/\b[0-4]\b/)
    expect(text).not.toMatch(/review|comment/i)
  })

  it('draws the service tiles in the server HTML, from the route loader, so view-source shows them (AC61, follow-up B)', async () => {
    const html = renderToString(<RouterProvider router={await buildRouter('/en')} />)

    expect(textOf(html)).toContain('Drinking water')
    expect(html).toContain('href="/en/map?category=drinking-water"')
    expect(html).not.toContain('data-skeleton="service-tiles"')
    expect(loadHomeRead).toHaveBeenCalledWith('en')
  })

  it('is whole when the loader read nothing: each block holds its error, never a blank page', async () => {
    vi.mocked(loadHomeRead).mockResolvedValue({ pins: null, categories: null, tiles: null, tours: null, stories: null })
    const html = renderToString(<RouterProvider router={await buildRouter('/en')} />)

    expect(textOf(html)).toContain(en['homePage.services.failed'])
    expect(html).toContain(en['homePage.map.title'])
  })

  it('shows the German words at /de', async () => {
    const html = renderToString(<RouterProvider router={await buildRouter('/de')} />)

    expect(textOf(html)).toContain(de['homePage.map.title'])
    expect(textOf(html)).toContain(de['homePage.services.title'])
  })
})

describe('[E4.13][AC95] the order follows the guest\'s interests below the tiles', () => {
  const answerWith = (interests: string[]) => localStorage.setItem('sk.onboarding', JSON.stringify({ v: 1, segment: 'multi_day', interests, answeredAt: '2026-11-04T10:00:00.000Z', dismissedAt: null }))
  const headings = async () => {
    const { unmount } = render(<RouterProvider router={await buildRouter('/en')} />)
    await screen.findByRole('link', { name: 'Drinking water' })
    await screen.findByText(en['home.victorinox.title'])
    const names = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)
    // The hero, the invitation and the tiles come before the first section; the answers never touch them.
    const links = screen.getAllByRole('link').map(link => link.getAttribute('href'))
    const aboveSections = links.slice(0, links.indexOf('/en/map?category=drinking-water') + 1)
    const thread = document.querySelector('span.h-8.w-px')?.className ?? ''
    unmount()

    return { names, aboveSections, thread }
  }
  const title = (key: 'must' | 'routes' | 'food' | 'events') => en[`homePage.${key}.title`]
  const head = [en['homePage.map.title'], en['homePage.services.title']]
  // Every movable section needs data to draw: a food category with a place, a dated place and a story.
  const food: PublicCategory = { ...water, id: id(2), slug: 'food-and-drink', name: { en: 'Food and drink', de: 'Essen und Trinken' }, icon: 'restaurant', showOnHome: false, position: 2 }
  const eventPin: PublicMapItem = { ...pin, id: id(102), slug: 'organ-concert', title: 'Organ Concert', nextDate: { firstDay: '2090-11-07', lastDay: '2090-11-07', startTime: null, endTime: null } }
  const foodPin: PublicMapItem = { ...pin, id: id(103), slug: 'cafe-heini', title: 'Café Heini', categoryIds: [food.id] }
  const story: PublicStoryCard = { id: id(400), slug: 'story-1', title: 'Story 1', excerpt: 'Excerpt', readMinutes: 4, coverKey: null, cover: null, stayTag: 'both', interests: [], categories: [], publishedAt: '2026-11-01T10:00:00.000Z', language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

  beforeEach(() => {
    const pins = [pin, mustVisit, eventPin, foodPin]
    const categories = [water, food]
    vi.mocked(loadHomeRead).mockReset().mockImplementation(async lang => ({ pins, categories, tiles: serviceTiles(categories, pins, lang), tours, stories: [story] }))
  })

  it('draws the default order with no answers (AC-1)', async () => {
    const { names, thread } = await headings()

    expect(names).toEqual([...head, title('must'), title('routes'), en['homePage.stories.title'], title('food'), title('events'), en['home.victorinox.title'], en['home.advice.title']])
    expect(thread).toContain('#173f52')
  })

  it('puts the food map first after the tiles for food-drink only (AC-2)', async () => {
    const without = await headings()
    resetAnswersStoreForTests()
    answerWith(['food-drink'])
    const { names, aboveSections } = await headings()

    expect(names).toEqual([...head, title('food'), title('must'), title('routes'), en['homePage.stories.title'], title('events'), en['home.victorinox.title'], en['home.advice.title']])
    expect(aboveSections).toEqual(without.aboveSections)
  })

  it('puts the postcards and the events first for history-culture and local-activities (AC-3)', async () => {
    answerWith(['local-activities', 'history-culture'])
    const { names } = await headings()

    expect(names).toEqual([...head, title('must'), title('events'), title('routes'), en['homePage.stories.title'], title('food'), en['home.victorinox.title'], en['home.advice.title']])
  })

  it('puts the Victorinox showcase first for shopping-keepsakes, and the thread no longer starts from lake blue (AC-4)', async () => {
    answerWith(['shopping-keepsakes'])
    const { names, thread } = await headings()

    expect(names).toEqual([...head, en['home.victorinox.title'], title('must'), title('routes'), en['homePage.stories.title'], title('food'), title('events'), en['home.advice.title']])
    expect(thread).not.toContain('#173f52')
  })

  it('always sends the default order in the server HTML (AC-5)', async () => {
    answerWith(['shopping-keepsakes', 'food-drink'])
    const html = renderToString(<RouterProvider router={await buildRouter('/en')} />)
    const at = (text: string) => textOf(html).indexOf(text)

    expect(at(title('must'))).toBeGreaterThan(at(en['homePage.services.title']))
    expect(at(title('must'))).toBeLessThan(at(title('routes')))
    expect(at(title('routes'))).toBeLessThan(at(en['homePage.stories.title']))
    expect(at(en['homePage.stories.title'])).toBeLessThan(at(title('food')))
    expect(at(title('food'))).toBeLessThan(at(title('events')))
  })
})

describe('[E4.13][AC95] the head stays put', () => {
  it('opens the map from the invitation and a tile, and search from the pill, without a question first', async () => {
    render(<RouterProvider router={await buildRouter('/en')} />)

    expect(await screen.findByRole('link', { name: en['homePage.map.action'] })).toHaveAttribute('href', '/en/map')
    expect(await screen.findByRole('link', { name: 'Drinking water' })).toHaveAttribute('href', '/en/map?category=drinking-water')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/en/search')).toBe(true)
  })
})

describe('[E4.13][AC95] one read of the map list', () => {
  it('draws the map blocks from the loader read and does not fetch the map list again in the browser', async () => {
    render(<RouterProvider router={await buildRouter('/en')} />)
    await screen.findByRole('link', { name: 'Drinking water' })
    await screen.findByText(en['home.victorinox.title'])

    expect(fetchMapPins).not.toHaveBeenCalled()
    expect(fetchMapCategories).not.toHaveBeenCalled()
  })
})

describe('[E4.13][AC95] a failed read takes down its own block only', () => {
  it('shows an error with retry in the tiles block while the hero, the invitation and the ending render, and retry runs the loader again (AC-6)', async () => {
    vi.mocked(loadHomeRead).mockResolvedValueOnce({ pins: [pin], categories: [water], tiles: null, tours: [], stories: [] })
    render(<RouterProvider router={await buildRouter('/en')} />)

    const alert = (await screen.findByText(en['homePage.services.failed'])).closest('[role="alert"]') as HTMLElement

    expect(screen.getByText(en['home.heroTitle'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['homePage.map.action'] })).toBeInTheDocument()
    expect(screen.getByText(en['home.victorinox.title'])).toBeInTheDocument()
    expect(screen.getByText(en['home.advice.title'])).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(await screen.findByRole('link', { name: 'Drinking water' })).toBeInTheDocument()
    expect(loadHomeRead).toHaveBeenCalledTimes(2)
  })

  it('shows an error with retry in the showcase block when the keepsake read fails, and the thread and the banner still render (AC-6)', async () => {
    vi.mocked(fetchKeepsakeList).mockRejectedValueOnce(new Error('down'))
    render(<RouterProvider router={await buildRouter('/en')} />)

    const alert = await screen.findByText(en['homePage.ending.failed'])

    expect(screen.getByText(en['homePage.ending.line'])).toBeInTheDocument()
    expect(screen.getByText(en['home.advice.title'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['homePage.map.action'] })).toBeInTheDocument()

    await userEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: en['errorNotice.retry'] }))

    await waitFor(() => expect(screen.getByText(en['home.victorinox.title'])).toBeInTheDocument())
    expect(screen.queryByText(en['homePage.ending.failed'])).toBeNull()
  })
})

describe('[E4.13][AC54] the Victorinox showcase reads the public keepsake list', () => {
  it('shows the real keepsakes on the shipped tiles, each opening its own page by its own language, with no price and no sold-out keepsake (follow-up A)', async () => {
    render(<RouterProvider router={await buildRouter('/en')} />)

    const swanLink = await screen.findByRole('link', { name: /Swan/ })

    expect(fetchKeepsakeList).toHaveBeenCalledWith('en')
    expect(swanLink).toHaveAttribute('href', '/en/gifts/victorinox-swan')
    // The tile draws the shipped cut-out art, not the cover photo.
    expect(swanLink.querySelector('img')?.getAttribute('src')).not.toContain('cdn.test')
    // A slug with no art draws the cover photo in the same slot, named by the keepsake.
    expect(within(screen.getByRole('link', { name: /Swisschamp/ })).getByRole('img', { name: 'Swisschamp' })).toHaveAttribute('src', 'https://cdn.test/swan-800.webp')
    // A keepsake only in German links to its own German address (ADR-002).
    expect(screen.getByRole('link', { name: /Löwe/ })).toHaveAttribute('href', '/de/gifts/victorinox-lion')
    // The shipped showcase has no sold-out state, so a sold-out keepsake is left out.
    expect(screen.queryByRole('link', { name: /Kapellbr/ })).toBeNull()
    expect(screen.queryByText(en['gifts.soldOut'])).toBeNull()
    expect(document.body.textContent).not.toContain('CHF')
  })
})

describe('[E4.13][AC95] the demo layer is gone from the home', () => {
  const SRC = join(__dirname, '..', 'src')
  const read = (path: string) => readFileSync(join(SRC, path), 'utf8')
  const homeFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? homeFiles(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [])
  const DEMO = /seed|simulated-loading|useSimulatedLoading|use-discovery-view|useDiscoveryView|discovery-home|DiscoveryHome|snowfall|season/i

  it('the home route and the home feature name no demo seed, no simulated loading and no season preview (AC-6)', () => {
    const files = [join(SRC, 'routes/_guest/$lang/index.tsx'), ...homeFiles(join(SRC, 'features/home'))]

    expect(files.length).toBeGreaterThan(8)
    for (const file of files)
      expect({ file, hit: readFileSync(file, 'utf8').match(DEMO)?.[0] }).toEqual({ file, hit: undefined })
  })

  it('only the page order, the postcards, the routes and the sort notice read the onboarding answers; the hero, the invitation, the tiles and the food section (newest first) do not (AC-3)', () => {
    const readers = homeFiles(join(SRC, 'features/home/components')).filter(file => /onboarding/i.test(readFileSync(file, 'utf8'))).map(file => file.split('/').pop())

    expect(readers.sort()).toEqual(['home-page.tsx', 'must-visits-section.tsx', 'routes-section.tsx', 'sort-notice.tsx'])
    expect(read('routes/_guest/$lang/index.tsx')).not.toMatch(/onboarding/i)
  })

  it('the home reads no demo catalogue: the showcase takes the public keepsake list', () => {
    for (const file of homeFiles(join(SRC, 'features/home')))
      expect({ file, hit: readFileSync(file, 'utf8').match(/catalogQueries|useDataClient|useProducts|@sk\/domain\/catalog/)?.[0] }).toEqual({ file, hit: undefined })
  })

  it('the home hooks take their query keys from the shared key file, never inline', () => {
    expect(read('features/home/hooks/use-victorinox-items.ts')).not.toMatch(/queryKey: \[\s*'/)
    expect(read('features/home/hooks/use-victorinox-items.ts')).toContain('guestKeepsakeList')
  })

  it('the components that only the old home drew are deleted', () => {
    for (const file of ['discovery-home', 'journey-steps', 'moving-story-rail', 'story-categories', 'part-heading', 'snowfall'])
      expect(existsSync(join(SRC, `features/discovery/components/${file}.tsx`))).toBe(false)
  })
})
