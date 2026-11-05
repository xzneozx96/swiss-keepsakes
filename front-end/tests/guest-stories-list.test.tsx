import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { StoriesPage } from '@/features/content/components/stories-page'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { en } from '@/i18n/en'
import { blogCategory, ref } from './support/blog-categories'
import { storyCard } from './support/story-cards'

const answers = vi.hoisted(() => ({ value: { stay: null, interests: [] } as { stay: 'short_stay' | 'multi_day' | null, interests: string[] } }))

vi.mock('@/features/onboarding/hooks/use-onboarding-answers', () => ({ useOnboardingAnswers: () => answers.value }))

type Props = Parameters<typeof StoriesPage>[0]

/** A page as the API sends it, for the stories that are in it. */
const pageOf = (items: ReturnType<typeof storyCard>[], over: { total?: number, nextCursor?: string | null } = {}) => ({ items, total: over.total ?? items.length, nextCursor: over.nextCursor ?? null })

async function buildRouter(url: string, props: Props) {
  // The cart button in the page bar reads the demo cart; the stories themselves come in through props.
  const demo = startSeedDemo()
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
          <LocaleProvider>
            <DemoProvider store={demo.store}>
              <Outlet />
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
  const page = createRoute({ getParentRoute: () => root, path: '/$lang/stories', component: () => <StoriesPage {...props} /> })
  // The German dictionary is a lazy chunk; the route waits for it as the real guest layout does.
  const withDictionary = url.startsWith('/de') ? loadDictionary('de') : Promise.resolve()
  await withDictionary
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [url] }) })
  await router.load()
  return router
}

async function renderPage(props: Props, url = '/en/stories') {
  const router = await buildRouter(url, props)
  render(<RouterProvider router={router} />)
}

const titles = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)

const newest = storyCard({ title: 'Newest story', publishedAt: '2026-10-03T00:00:00.000Z' })
const middle = storyCard({ title: 'Middle story', publishedAt: '2026-10-02T00:00:00.000Z' })
const oldest = storyCard({ title: 'Oldest story', publishedAt: '2026-10-01T00:00:00.000Z' })

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  answers.value = { stay: null, interests: [] }
})

afterEach(() => vi.unstubAllGlobals())

describe('[E4.4] guest stories list', () => {
  it('[E4.4][AC61] the server HTML lists the first page newest first, whatever the answers are', async () => {
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }
    const router = await buildRouter('/en/stories', { first: pageOf([newest, middle, oldest]), lang: 'en', onRetry: () => {} })

    const html = renderToString(<RouterProvider router={router} />)

    for (const title of ['Newest story', 'Middle story', 'Oldest story'])
      expect(html).toContain(title)
    expect(html.indexOf('Newest story')).toBeLessThan(html.indexOf('Middle story'))
    expect(html.indexOf('Middle story')).toBeLessThan(html.indexOf('Oldest story'))
  })

  it('[E4.4][AC38] answers put the matching stories first in the browser and hide none', async () => {
    const food = storyCard({ title: 'Food walk', stayTag: 'short_stay', interests: ['food-drink'], publishedAt: '2026-09-01T00:00:00.000Z' })
    const hike = storyCard({ title: 'Long hike', stayTag: 'multi_day', interests: ['lake-mountains'], publishedAt: '2026-09-02T00:00:00.000Z' })
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }

    await renderPage({ first: pageOf([hike, newest, food]), lang: 'en', onRetry: () => {} })

    await waitFor(() => expect(titles()[0]).toBe('Food walk'))
    expect(titles()).toHaveLength(3)
    expect(titles()).toEqual(expect.arrayContaining(['Food walk', 'Long hike', 'Newest story']))
  })

  it('[E4.4][AC38] no answers keep the server order and the page draws no sort line', async () => {
    await renderPage({ first: pageOf([newest, middle, oldest]), lang: 'en', onRetry: () => {} })

    expect(titles()).toEqual(['Newest story', 'Middle story', 'Oldest story'])
    expect(screen.queryByText(/Newest first|Sorted for/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Sort for my trip|Change/ })).toBeNull()
  })

  it('[E4.4][AC64] a story that fell back to the other language shows its language tag, one in the guest language shows none', async () => {
    const fallback = storyCard({ title: 'Only in English', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
    const own = storyCard({ title: 'Ein Tag', language: 'de', requestedLanguage: 'de', availableLanguages: ['de'] })

    await renderPage({ first: pageOf([fallback, own]), lang: 'en', onRetry: () => {} }, '/de/stories')

    expect(screen.getByText('Only in English')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Englisch')).toHaveLength(1)
    expect(screen.getByLabelText('Englisch')).toHaveTextContent('EN')
    expect(screen.queryByLabelText('Deutsch')).toBeNull()
  })

  it('[E4.4][AC61] a card shows the cover, title, excerpt and reading time', async () => {
    const cover = { url: 'https://media.test/k/orig.jpg', variants: [{ width: 320, url: 'https://media.test/k/w320.webp' }, { width: 640, url: 'https://media.test/k/w640.webp' }] }
    await renderPage({ first: pageOf([storyCard({ title: 'With cover', excerpt: 'A short read', readMinutes: 6, cover })]), lang: 'en', onRetry: () => {} })

    expect(screen.getByText('A short read')).toBeInTheDocument()
    expect(screen.getByText(/6 min read/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 }).closest('a')?.querySelector('img')).toHaveAttribute('src', 'https://media.test/k/w640.webp')
  })

  it('[E4.4][AC54] no published story shows the shared empty state', async () => {
    await renderPage({ first: pageOf([]), lang: 'en', onRetry: () => {} })

    expect(screen.getByText(en['stories.empty'])).toBeInTheDocument()
  })

  it('[E4.4][AC54] a failed read shows an error with retry and no story', async () => {
    const onRetry = vi.fn()
    await renderPage({ first: null, lang: 'en', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent(en['stories.error'])
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: en['stories.retry'] }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

// The full route tree loads on the first test; guest-routes.test.tsx gives it the same time.
describe('[E4.4][AC30] blog category filter', { timeout: 60_000 }, () => {
  // Load the full route tree once, before any test's own clock starts.
  beforeAll(async () => {
    if (typeof CSS.supports !== 'function')
      CSS.supports = () => false
    await import('@/router')
  }, 120_000)

  const legends = blogCategory({ slug: 'legends', name: { en: 'Legends', de: 'Sagen' }, position: 2 })
  const tips = blogCategory({ slug: 'practical-tips', name: { en: 'Practical tips', de: null }, position: 3 })
  const history = blogCategory({ slug: 'swiss-history', name: { en: 'Swiss history', de: 'Schweizer Geschichte' }, position: 1 })
  const castles = blogCategory({ slug: 'castles', name: { en: 'Castles', de: 'Burgen' }, parentId: history.id, position: 1 })
  const categories = [history, legends, tips, castles]

  const castle = storyCard({ title: 'Castle story', categories: [ref(castles)] })
  const legend1 = storyCard({ title: 'Legend one', categories: [ref(legends)], publishedAt: '2026-09-03T00:00:00.000Z' })
  const legend2 = storyCard({ title: 'Legend two', categories: [ref(legends)], stayTag: 'short_stay', interests: ['food-drink'], publishedAt: '2026-09-02T00:00:00.000Z' })
  const legend3 = storyCard({ title: 'Legend three', categories: [ref(legends)], publishedAt: '2026-09-01T00:00:00.000Z' })
  const tip = storyCard({ title: 'Tip story', categories: [ref(tips)] })
  const stories = [castle, legend1, legend2, legend3, tip]

  const chips = () => screen.getByRole('group', { name: /Story categories|Kategorien der Geschichten/ })
  const chipNames = () => within(chips()).getAllByRole('button').map(r => r.textContent)

  const asked: URL[] = []

  /** The real API's `storyCount`: the stories with the category, a parent's including its sub-categories'. */
  const countFor = (all: typeof stories, category: (typeof categories)[number]) => {
    const ids = new Set([category.id, ...categories.filter(c => c.parentId === category.id).map(c => c.id)])
    return all.filter(story => story.categories.some(c => ids.has(c.id))).length
  }

  /** The stubbed API pages like the real one: a `category` filter (a parent includes its sub-categories), `limit`, and a cursor that is the offset. */
  function stubApi(all: typeof stories, categoryList: typeof categories | null, over: { failPageFrom?: number } = {}) {
    vi.stubGlobal('fetch', async (input: Request | string) => {
      const url = new URL(typeof input === 'string' ? input : input.url)
      if (url.pathname === '/api/public/blog-categories')
        return categoryList === null ? new Response('{}', { status: 500 }) : Response.json({ items: categoryList.map(c => ({ ...c, storyCount: countFor(all, c) })) })
      asked.push(url)
      const slug = url.searchParams.get('category')
      const chosen = (categoryList ?? categories).find(c => c.slug === slug)
      const ids = new Set(chosen ? [chosen.id, ...categories.filter(c => c.parentId === chosen.id).map(c => c.id)] : [])
      const matching = slug === null ? all : all.filter(story => story.categories.some(c => ids.has(c.id)))
      const start = Number(url.searchParams.get('cursor') ?? 0)
      if (over.failPageFrom !== undefined && start >= over.failPageFrom)
        return new Response('{}', { status: 500 })
      const limit = Number(url.searchParams.get('limit') ?? matching.length)
      const items = matching.slice(start, start + limit)
      return Response.json({ items, total: matching.length, nextCursor: start + limit < matching.length ? String(start + limit) : null })
    })
  }

  /** The real route: its loader reads the stubbed API, its component reads the address and navigates. */
  async function realRouter(url: string, over: { stories?: typeof stories, categories?: typeof categories | null, failPageFrom?: number } = {}) {
    asked.length = 0
    stubApi(over.stories ?? stories, over.categories === undefined ? categories : over.categories, over)
    if (typeof CSS.supports !== 'function')
      CSS.supports = () => false
    if (url.startsWith('/de'))
      await loadDictionary('de')
    const { getRouter } = await import('@/router')
    const router = getRouter()
    router.update({ history: createMemoryHistory({ initialEntries: [url] }) })
    await router.load()
    return router
  }

  async function renderFiltered(url: string, over: Parameters<typeof realRouter>[1] = {}) {
    const router = await realRouter(url, over)
    render(<RouterProvider router={router} />)
    return router
  }

  it('[E4.4][AC30] AC-1 the row shows All and only the categories with a story', async () => {
    await renderFiltered('/en/stories')

    expect(chipNames()).toEqual(['All', 'Swiss history', 'Castles', 'Legends', 'Practical tips'])
  })

  it('[E4.4][AC30] AC-1 a category with no story here is not offered', async () => {
    await renderFiltered('/en/stories', { stories: [legend1, tip] })

    expect(chipNames()).toEqual(['All', 'Legends', 'Practical tips'])
  })

  it('[E4.4][AC30] AC-2 a parent keeps its sub-category stories and the count follows the filter', async () => {
    await renderFiltered('/en/stories')

    await userEvent.click(within(chips()).getByRole('button', { name: 'Swiss history' }))

    await waitFor(() => expect(titles()).toEqual(['Castle story']))
    expect(screen.getByText('1 story')).toBeInTheDocument()
  })

  it('[E4.4][AC30] AC-2 a sub-category keeps only its own stories', async () => {
    await renderFiltered('/en/stories?category=castles')

    expect(titles()).toEqual(['Castle story'])
  })

  it('[E4.4][AC61] AC-3 a choice pushes ?category= and Back returns to All', async () => {
    const router = await renderFiltered('/en/stories')

    await userEvent.click(within(chips()).getByRole('button', { name: 'Legends' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ category: 'legends' }))
    expect(titles()).toHaveLength(3)

    act(() => router.history.back())
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    await waitFor(() => expect(titles()).toHaveLength(5))
    expect(within(chips()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('[E4.4][AC61] AC-3 choosing All removes the parameter', async () => {
    const router = await renderFiltered('/en/stories?category=legends')

    await userEvent.click(within(chips()).getByRole('button', { name: 'All' }))

    await waitFor(() => expect(router.state.location.search).toEqual({}))
  })

  it('[E4.4][AC61] AC-3 the server HTML of a shared link lists only that category', async () => {
    const html = renderToString(<RouterProvider router={await realRouter('/en/stories?category=legends')} />)

    expect(html).toContain('Legend one')
    expect(html).not.toContain('Castle story')
    expect(html).not.toContain('Tip story')
  })

  it('[E4.4][AC30] AC-4 an unknown slug shows every story with All selected and the address unchanged', async () => {
    const router = await renderFiltered('/en/stories?category=no-such-topic', { stories: [legend1, tip] })

    expect(titles()).toHaveLength(2)
    expect(within(chips()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toEqual({ category: 'no-such-topic' })
  })

  it('[E4.4][AC30] AC-4 a real category no story here uses shows every story with All selected (server HTML)', async () => {
    const router = await realRouter('/en/stories?category=swiss-history', { stories: [legend1, tip] })

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('Legend one')
    expect(html).toContain('Tip story')
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*All/s)
    expect(router.state.location.search).toEqual({ category: 'swiss-history' })
  })

  it('[ADR-033] the server HTML of a category link carries only that category\'s first page, and the filter is a server parameter', async () => {
    const router = await realRouter('/en/stories?category=swiss-history', { stories: [legend1, tip, castle] })

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('Castle story')
    expect(html).not.toContain('Legend one')
    expect(asked.map(u => u.searchParams.get('category'))).toContain('swiss-history')
    expect(asked.every(u => u.searchParams.get('limit') === '10')).toBe(true)
  })

  it('[E4.4][AC38] AC-5 the filter comes first, then the answers rank inside it', async () => {
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }
    await renderFiltered('/en/stories?category=legends')

    await waitFor(() => expect(titles()[0]).toBe('Legend two'))
    expect(titles()).toHaveLength(3)
    expect(titles()).not.toContain('Tip story')
  })

  it('[E4.4][AC54] AC-6 a category named only in English shows that name to a German guest, and All is Alle', async () => {
    await renderFiltered('/de/stories')

    expect(chipNames()).toEqual(['Alle', 'Schweizer Geschichte', 'Burgen', 'Sagen', 'Practical tips'])
    expect(screen.getByText('5 Geschichten')).toBeInTheDocument()
  })

  it('[E4.4][AC54] AC-6 no CHF on the page, filtered or not', async () => {
    expect(renderToString(<RouterProvider router={await realRouter('/en/stories?category=legends')} />)).not.toContain('CHF')
    expect(renderToString(<RouterProvider router={await realRouter('/en/stories')} />)).not.toContain('CHF')
  })

  it('[E4.4][AC30] AC-7 a failed category read shows the stories with no filter row and no alert', async () => {
    await renderFiltered('/en/stories?category=legends', { categories: null })

    // Without the category list the slug cannot be checked, so every story shows.
    expect(titles()).toHaveLength(5)
    expect(screen.queryByRole('group', { name: en['stories.filter'] })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('[E4.4][AC61] a selected chip is marked selected and draws no extra check (the app-wide tag style draws the one check)', async () => {
    await renderFiltered('/en/stories?category=legends')

    expect(within(chips()).getByRole('button', { name: 'Legends' })).toHaveAttribute('aria-pressed', 'true')
    expect(chips().querySelectorAll('svg')).toHaveLength(0)
  })

  describe('[ADR-033] paging', () => {
    const many = (count: number, over: Partial<Parameters<typeof storyCard>[0]> = {}) =>
      Array.from({ length: count }, (_, i) => storyCard({ title: `Story ${String(i + 1).padStart(2, '0')}`, ...over }))
    const loadMore = () => screen.getByRole('button', { name: 'Load more' })

    it('the server HTML holds the first ten cards in the order the API sends, and no eleventh', async () => {
      const router = await realRouter('/en/stories', { stories: many(25) })

      const html = renderToString(<RouterProvider router={router} />)

      expect(html).toContain('Story 01')
      expect(html).toContain('Story 10')
      expect(html).not.toContain('Story 11')
      expect(html.indexOf('Story 01')).toBeLessThan(html.indexOf('Story 02'))
      expect(html).toContain('25 stories')
    })

    it('load more adds the next ten, says so in a polite live region, and the end line shows when the list is complete', async () => {
      await renderFiltered('/en/stories', { stories: many(25) })
      expect(titles()).toHaveLength(10)

      await userEvent.click(loadMore())
      await waitFor(() => expect(titles()).toHaveLength(20))
      // The page has other status regions (the toast region), so the list's own is found by its text.
      expect(screen.getByText('10 more stories')).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByText('10 more stories')).toHaveAttribute('role', 'status')

      await userEvent.click(loadMore())
      await waitFor(() => expect(titles()).toHaveLength(25))
      expect(screen.getByText('5 more stories')).toHaveAttribute('role', 'status')
      expect(screen.getByText('That’s all 25 stories')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    })

    it('[ADR-033] a story that shows on two pages draws once', async () => {
      const base = many(11)
      await renderFiltered('/en/stories', { stories: [...base, base[0]!] })

      await userEvent.click(loadMore())

      await waitFor(() => expect(titles()).toHaveLength(11))
      expect(titles().filter(title => title === 'Story 01')).toHaveLength(1)
    })

    it('a failed page shows Try again in place of the button and does not retry by itself', async () => {
      await renderFiltered('/en/stories', { stories: many(25), failPageFrom: 10 })
      const before = asked.length

      await userEvent.click(loadMore())

      expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
      // The inline line is the only error: the app's error toast stays out of a failed page (a toast left in the document hung the next test's pointer events).
      expect(screen.getByRole('alert')).toHaveTextContent('The next page did not load.')
      expect(document.querySelector('.toast')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
      expect(titles()).toHaveLength(10)
      expect(asked.length).toBe(before + 1)
    })

    it('a filter change starts again at page 1 on the server', async () => {
      const legend = many(12, { categories: [ref(legends)] })
      const router = await renderFiltered('/en/stories', { stories: [...many(12), ...legend] })
      await userEvent.click(loadMore())
      await waitFor(() => expect(titles()).toHaveLength(20))

      await userEvent.click(within(chips()).getByRole('button', { name: 'Legends' }))

      await waitFor(() => expect(router.state.location.search).toEqual({ category: 'legends' }))
      await waitFor(() => expect(titles()).toHaveLength(10))
      const last = asked.at(-1)!
      expect(last.searchParams.get('category')).toBe('legends')
      expect(last.searchParams.get('cursor')).toBeNull()
      expect(screen.getByText('12 stories')).toBeInTheDocument()
    })

    it('the answers rank inside each page that arrives: rows on screen do not move when the next page loads', async () => {
      const first = many(10)
      const match = storyCard({ title: 'Fits the guest', stayTag: 'short_stay', interests: ['food-drink'] })
      const second = [...many(9).map((s, i) => ({ ...s, title: `Later ${i}` })), match]
      answers.value = { stay: 'short_stay', interests: ['food-drink'] }
      await renderFiltered('/en/stories', { stories: [...first, ...second] })
      await screen.findAllByRole('heading', { level: 3 })
      const onScreen = titles()

      await userEvent.click(loadMore())

      await waitFor(() => expect(titles()).toHaveLength(20))
      expect(titles().slice(0, 10)).toEqual(onScreen)
      expect(titles()[10]).toBe('Fits the guest')
    })
  })
})
