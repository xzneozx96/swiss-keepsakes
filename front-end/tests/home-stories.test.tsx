import type { PublicStoryCard } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { StoriesSection } from '@/features/home/components/stories-section'
import { en } from '@/i18n/en'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function story(n: number, publishedAt: string, over: Partial<PublicStoryCard> = {}): PublicStoryCard {
  return { id: id(n), slug: `story-${n}`, title: `Story ${n}`, excerpt: `Excerpt ${n}`, readMinutes: 4, coverKey: null, cover: null, stayTag: 'both', interests: [], categories: [], publishedAt, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'], ...over }
}

const FIVE = [
  story(1, '2026-09-01T10:00:00.000Z'),
  story(2, '2026-11-01T10:00:00.000Z'),
  story(3, '2026-10-01T10:00:00.000Z'),
  story(4, '2026-10-20T10:00:00.000Z'),
  story(5, '2026-08-01T10:00:00.000Z'),
]

async function routerOf(section: React.ReactNode, lang: 'en' | 'de' = 'en') {
  const root = createRootRoute({ component: () => (
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>{section}</LocaleProvider>
    </QueryClientProvider>
  ) })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', loader: ({ params }) => params.lang === 'de' ? loadDictionary('de') : undefined })
  const others = ['stories', 'stories/$slug'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: [`/${lang}`] }) })
  await router.load()

  return router
}

describe('the home stories section', () => {
  it('draws the three newest stories, newest first, each linking to its story page', async () => {
    const html = renderToString(<RouterProvider router={await routerOf(<StoriesSection stories={FIVE} onRetry={() => {}} />)} />)
    const at = ['Story 2', 'Story 4', 'Story 3'].map(name => html.indexOf(name))

    expect(at.every(index => index >= 0)).toBe(true)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(html).not.toContain('Story 1')
    expect(html).not.toContain('Story 5')
    expect(html).toContain('href="/en/stories/story-2"')
  })

  it('has a "Show all stories" link to the stories list in the page language', async () => {
    const en_ = renderToString(<RouterProvider router={await routerOf(<StoriesSection stories={FIVE} onRetry={() => {}} />)} />)
    const de = renderToString(<RouterProvider router={await routerOf(<StoriesSection stories={FIVE} onRetry={() => {}} />, 'de')} />)

    expect(en_).toMatch(new RegExp(`<a[^>]*href="/en/stories"[^>]*>${en['homePage.stories.seeAll']}</a>`))
    expect(de).toMatch(/<a[^>]*href="\/de\/stories"/)
  })

  it('is not drawn with no story', async () => {
    const html = renderToString(<RouterProvider router={await routerOf(<StoriesSection stories={[]} onRetry={() => {}} />)} />)

    expect(html).not.toContain(en['homePage.stories.title'])
    expect(html).not.toContain('/en/stories')
  })

  it('shows boxes shaped like the cards while the read runs', async () => {
    const html = renderToString(<RouterProvider router={await routerOf(<StoriesSection stories={undefined} onRetry={() => {}} />)} />)

    expect(html).toContain(en['homePage.stories.title'])
    expect(html.match(/<li/g)).toHaveLength(3)
    expect(html).toContain('data-skeleton="stories"')
  })

  it('shows an error with retry when the read failed', async () => {
    const retry = vi.fn()
    render(<RouterProvider router={await routerOf(<StoriesSection stories={null} onRetry={retry} />)} />)

    const alert = (await screen.findByText(en['homePage.stories.failed'])).closest('[role="alert"]') as HTMLElement
    await userEvent.click(within(alert).getByRole('button', { name: en['errorNotice.retry'] }))

    expect(retry).toHaveBeenCalledTimes(1)
  })
})
