import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { HomePage } from '@/features/home/components/home-page'
import { homeHead } from '@/features/home/lib/home-head'
import { fetchMapCategories, fetchMapPins } from '@/features/map/api/map-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { Route as HomeRoute } from '@/routes/_guest/$lang/index'

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
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
  const home = createRoute({
    getParentRoute: () => root,
    path: '/$lang',
    loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined,
    component: HomePage,
  })
  const others = ['map', 'search', 'plan', 'gifts', 'stories'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
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
    const order = [en['home.heroTitle'], en['homePage.map.title'], en['homePage.services.title'], en['home.victorinox.title'], en['homePage.ending.line'], en['home.advice.title']]
    const at = order.map(words => text.indexOf(words))

    expect(at.every(index => index >= 0)).toBe(true)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(html).not.toContain('CHF')
    expect(text).not.toMatch(/\b[0-4]\b/)
    expect(text).not.toMatch(/review|comment/i)
  })

  it('is whole when the map reads have not come back: the tiles block holds its skeleton, never a blank page', async () => {
    const html = renderToString(<RouterProvider router={await buildRouter('/en')} />)

    expect(html).toContain('data-skeleton="service-tiles"')
    expect(html).toContain(en['homePage.map.title'])
  })

  it('shows the German words at /de', async () => {
    const html = renderToString(<RouterProvider router={await buildRouter('/de')} />)

    expect(textOf(html)).toContain(de['homePage.map.title'])
    expect(textOf(html)).toContain(de['homePage.services.title'])
  })
})

describe('[E4.13][AC95] the order is the same for every visitor', () => {
  it('draws the same headings in the same order with onboarding answers saved and without (AC-4)', async () => {
    const headings = async () => {
      const { unmount } = render(<RouterProvider router={await buildRouter('/en')} />)
      await screen.findByRole('link', { name: 'Drinking water' })
      const names = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)
      const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href'))
      unmount()

      return { names, hrefs }
    }
    const without = await headings()
    localStorage.setItem('onboarding-answers', JSON.stringify({ stay: 'multi_day', interests: ['food-drink'] }))
    const withAnswers = await headings()

    expect(without.names.slice(0, 2)).toEqual([en['homePage.map.title'], en['homePage.services.title']])
    expect(withAnswers.names).toEqual(without.names)
    expect(withAnswers.hrefs).toEqual(without.hrefs)
  })

  it('opens the map from the invitation and a tile, and search from the pill, without a question first', async () => {
    render(<RouterProvider router={await buildRouter('/en')} />)

    expect(await screen.findByRole('link', { name: en['homePage.map.action'] })).toHaveAttribute('href', '/en/map')
    expect(await screen.findByRole('link', { name: 'Drinking water' })).toHaveAttribute('href', '/en/map?category=drinking-water')
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/en/search')).toBe(true)
  })
})

describe('[E4.13][AC95] a failed read takes down its own block only', () => {
  it('shows an error with retry in the tiles block while the hero, the invitation and the ending render (AC-6)', async () => {
    vi.mocked(fetchMapCategories).mockRejectedValueOnce(new Error('down'))
    render(<RouterProvider router={await buildRouter('/en')} />)

    // The food map reads the same list, so it shows its own notice beside the tiles'.
    const alert = (await screen.findByText(en['homePage.services.failed'])).closest('[role="alert"]') as HTMLElement

    expect(screen.getByText(en['homePage.food.failed'])).toBeInTheDocument()
    expect(screen.getByText(en['home.heroTitle'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['homePage.map.action'] })).toBeInTheDocument()
    expect(screen.getByText(en['home.victorinox.title'])).toBeInTheDocument()
    expect(screen.getByText(en['home.advice.title'])).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(await screen.findByRole('link', { name: 'Drinking water' })).toBeInTheDocument()
  })

  it('shows an error with retry in the showcase block when the keepsake read fails, and the thread and the banner still render (AC-6)', async () => {
    const demo = startSeedDemo()
    const products = vi.fn().mockRejectedValueOnce(new Error('down')).mockImplementation(demo.dataClient.catalog.products)
    const dataClient = { ...demo.dataClient, catalog: { ...demo.dataClient.catalog, products } } as DataClient
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<RouterProvider router={await buildRouter('/en', dataClient)} />)

    const alert = await screen.findByText(en['homePage.ending.failed'])

    expect(screen.getByText(en['homePage.ending.line'])).toBeInTheDocument()
    expect(screen.getByText(en['home.advice.title'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['homePage.map.action'] })).toBeInTheDocument()

    await userEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: en['errorNotice.retry'] }))

    await waitFor(() => expect(screen.getByText(en['home.victorinox.title'])).toBeInTheDocument())
    expect(screen.queryByText(en['homePage.ending.failed'])).toBeNull()
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

  it('the home reads no onboarding answer', () => {
    for (const file of homeFiles(join(SRC, 'features/home')))
      expect(readFileSync(file, 'utf8')).not.toMatch(/onboarding/i)
    expect(read('routes/_guest/$lang/index.tsx')).not.toMatch(/onboarding/i)
  })

  it('the components that only the old home drew are deleted', () => {
    for (const file of ['discovery-home', 'journey-steps', 'moving-story-rail', 'story-categories', 'part-heading', 'snowfall'])
      expect(existsSync(join(SRC, `features/discovery/components/${file}.tsx`))).toBe(false)
  })
})
