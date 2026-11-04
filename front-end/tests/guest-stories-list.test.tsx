import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { StoriesPage } from '@/features/content/components/stories-page'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { en } from '@/i18n/en'
import { storyCard } from './support/story-cards'

const answers = vi.hoisted(() => ({ value: { stay: null, interests: [] } as { stay: 'short_stay' | 'multi_day' | null, interests: string[] } }))

vi.mock('@/features/content/hooks/use-onboarding-answers', () => ({ useOnboardingAnswers: () => answers.value }))

type Props = Parameters<typeof StoriesPage>[0]

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

describe('[E4.4] guest stories list', () => {
  it('[E4.4][AC61] the server HTML lists every story newest first, whatever the answers are', async () => {
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }
    const router = await buildRouter('/en/stories', { stories: [newest, middle, oldest], onRetry: () => {} })

    const html = renderToString(<RouterProvider router={router} />)

    for (const title of ['Newest story', 'Middle story', 'Oldest story'])
      expect(html).toContain(title)
    expect(html.indexOf('Newest story')).toBeLessThan(html.indexOf('Middle story'))
    expect(html.indexOf('Middle story')).toBeLessThan(html.indexOf('Oldest story'))
  })

  it('[E4.4][AC38] the server HTML shows the newest-first line, so the first browser render matches it', async () => {
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }
    const router = await buildRouter('/en/stories', { stories: [newest], onRetry: () => {}, onChangeAnswers: () => {} })

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('Newest first')
    expect(html).not.toContain('Sorted for')
  })

  it('[E4.4][AC38] answers put the matching stories first in the browser and hide none', async () => {
    const food = storyCard({ title: 'Food walk', stayTag: 'short_stay', interests: ['food-drink'], publishedAt: '2026-09-01T00:00:00.000Z' })
    const hike = storyCard({ title: 'Long hike', stayTag: 'multi_day', interests: ['lake-mountains'], publishedAt: '2026-09-02T00:00:00.000Z' })
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }

    await renderPage({ stories: [hike, newest, food], onRetry: () => {} })

    await waitFor(() => expect(titles()[0]).toBe('Food walk'))
    expect(titles()).toHaveLength(3)
    expect(titles()).toEqual(expect.arrayContaining(['Food walk', 'Long hike', 'Newest story']))
  })

  it('[E4.4][AC38] no answers keep the server order and the line reads "Newest first · Sort for my trip"', async () => {
    const onChangeAnswers = vi.fn()
    await renderPage({ stories: [newest, middle, oldest], onRetry: () => {}, onChangeAnswers })

    expect(titles()).toEqual(['Newest story', 'Middle story', 'Oldest story'])
    expect(screen.getByText(/Newest first/).parentElement).toHaveTextContent('Newest first · Sort for my trip')
    await userEvent.click(screen.getByRole('button', { name: 'Sort for my trip' }))
    expect(onChangeAnswers).toHaveBeenCalledTimes(1)
  })

  it('[E4.4][AC38] with answers the line names them and Change opens the answers again', async () => {
    const onChangeAnswers = vi.fn()
    answers.value = { stay: 'short_stay', interests: ['food-drink'] }
    await renderPage({ stories: [newest], onRetry: () => {}, onChangeAnswers })

    expect(screen.getByText(/Sorted for/).parentElement).toHaveTextContent('Sorted for: Just today, Food and drink · Change')
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(onChangeAnswers).toHaveBeenCalledTimes(1)
  })

  it('[E4.4][AC38] the line shows nothing until the answers opener exists', async () => {
    await renderPage({ stories: [newest], onRetry: () => {} })

    expect(screen.queryByText(/Newest first/)).toBeNull()
    expect(screen.queryByText(/Sorted for/)).toBeNull()
  })

  it('[E4.4][AC64] a story that fell back to the other language shows its language tag, one in the guest language shows none', async () => {
    const fallback = storyCard({ title: 'Only in English', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
    const own = storyCard({ title: 'Ein Tag', language: 'de', requestedLanguage: 'de', availableLanguages: ['de'] })

    await renderPage({ stories: [fallback, own], onRetry: () => {} }, '/de/stories')

    expect(screen.getByText('Only in English')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Englisch')).toHaveLength(1)
    expect(screen.getByLabelText('Englisch')).toHaveTextContent('EN')
    expect(screen.queryByLabelText('Deutsch')).toBeNull()
  })

  it('[E4.4][AC61] a card shows the cover, title, excerpt and reading time', async () => {
    const cover = { url: 'https://media.test/k/orig.jpg', variants: [{ width: 320, url: 'https://media.test/k/w320.webp' }, { width: 640, url: 'https://media.test/k/w640.webp' }] }
    await renderPage({ stories: [storyCard({ title: 'With cover', excerpt: 'A short read', readMinutes: 6, cover })], onRetry: () => {} })

    expect(screen.getByText('A short read')).toBeInTheDocument()
    expect(screen.getByText(/6 min read/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 }).closest('a')?.querySelector('img')).toHaveAttribute('src', 'https://media.test/k/w640.webp')
  })

  it('[E4.4][AC54] no published story shows the shared empty state', async () => {
    await renderPage({ stories: [], onRetry: () => {} })

    expect(screen.getByText(en['stories.empty'])).toBeInTheDocument()
  })

  it('[E4.4][AC54] a failed read shows an error with retry and no story', async () => {
    const onRetry = vi.fn()
    await renderPage({ stories: null, onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent(en['stories.error'])
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: en['stories.retry'] }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
