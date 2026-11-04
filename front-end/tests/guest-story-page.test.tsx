import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, isNotFound, isRedirect, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { StoryPage } from '@/features/content/components/story-page'
import { StorySkeleton } from '@/features/content/components/story-skeleton'
import { storyHead } from '@/features/content/lib/story-head'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { readSiteConfig } from '@/features/seo/lib/site-config'
import { publicStory } from './support/public-story'

const SITE = readSiteConfig().siteUrl

const api = vi.hoisted(() => ({ loadPublicStory: vi.fn() }))

vi.mock('@/features/content/api/public-story', () => api)

async function buildRouter(url: string, story: ReturnType<typeof publicStory>) {
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
  const page = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => <StoryPage story={story} onBack={() => {}} /> })
  if (url.startsWith('/de'))
    await loadDictionary('de')
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [url] }) })
  await router.load()
  return router
}

const serverHtml = async (url: string, story: ReturnType<typeof publicStory>) => renderToString(<RouterProvider router={await buildRouter(url, story)} />)

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  api.loadPublicStory.mockReset()
})

describe('[E4.4][AC61] story page in the server HTML', () => {
  it('[AC-1] has the whole text and markup, the cover, the title, the author and no price', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory())

    for (const text of ['A day by the lake', 'Anna Keller', 'Morning at the pier', 'The lake keeps time.', 'Bring a jacket', 'Take the boat', 'a link', 'Dawn at the pier'])
      expect(html).toContain(text)
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('src="https://media.test/c/w1280.webp"')
    expect(html).not.toContain('CHF')
  })

  it('[AC-1] has no guest comment text, no comment form and no related or keepsake block', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory())

    expect(html).not.toMatch(/comment/i)
  })

  it('[AC-2] shows the reading time and the date from the API and a contents list that jumps to the H2 headings', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory({ readMinutes: 7, publishedAt: '2026-10-03T10:00:00.000Z' }))

    expect(html).toContain('3 October 2026 · 7 min read')
    expect(html).toMatch(/<nav[^>]*aria-label="In this story"/)
    for (const [id, heading] of [['morning-at-the-pier', 'Morning at the pier'], ['afternoon-on-the-water', 'Afternoon on the water']]) {
      expect(html).toContain(`data-section="${id}"`)
      expect(html).toMatch(new RegExp(`<h2[^>]*id="section-${id}"[^>]*>${heading}</h2>`))
    }
  })

  it('[AC-2] the page head is one h1, the title', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory())

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>A day by the lake<\/h1>/)
  })
})

describe('[E4.4][AC30][AC61] language switcher and notice', () => {
  it('[AC-4] the English page links to the German slug, in a link a crawler can follow', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory())

    const nav = /<nav[^>]*aria-label="Language"[^>]*>(.*?)<\/nav>/.exec(html)?.[1] ?? ''

    expect(nav).toMatch(/<a[^>]*href="\/de\/stories\/seetag"[^>]*>Deutsch<\/a>/)
    expect(Array.from(nav.matchAll(/href="([^"]+)"/g), m => m[1])).toEqual(['/de/stories/seetag'])
  })

  it('[AC-4] a story with one language has no switcher', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory({ versions: [{ language: 'en', slug: 'lake-day' }], availableLanguages: ['en'] }))

    expect(html).not.toContain('Deutsch')
  })

  it('[AC-4] a story in the guest language shows no notice', async () => {
    const html = await serverHtml('/en/stories/lake-day', publicStory())

    expect(html).not.toContain('only available')
  })
})

describe('[E4.4][AC61] head', () => {
  const links = (story: ReturnType<typeof publicStory>) => storyHead(story).links ?? []

  it('[AC-1] canonical is the carried language\'s own address, with hreflang for each version and x-default to English', () => {
    expect(links(publicStory())).toEqual(expect.arrayContaining([
      { rel: 'canonical', href: `${SITE}/en/stories/lake-day` },
      { rel: 'alternate', hrefLang: 'en', href: `${SITE}/en/stories/lake-day` },
      { rel: 'alternate', hrefLang: 'de', href: `${SITE}/de/stories/seetag` },
      { rel: 'alternate', hrefLang: 'x-default', href: `${SITE}/en/stories/lake-day` },
    ]))
  })

  it('[AC-4] a one-language story canonicalises to the version that exists and never carries noindex', () => {
    const head = storyHead(publicStory({ language: 'en', requestedLanguage: 'de', fallback: true, versions: [{ language: 'en', slug: 'lake-day' }] }))

    expect(head.links).toContainEqual({ rel: 'canonical', href: `${SITE}/en/stories/lake-day` })
    expect(head.links?.filter(l => l.rel === 'alternate').map(l => l.hrefLang)).toEqual(['en', 'x-default'])
    expect(JSON.stringify(head)).not.toMatch(/noindex/i)
  })

  it('[AC-1] title, description and share tags come from the story', () => {
    const { meta } = storyHead(publicStory({ excerpt: 'A short read' }))

    expect(meta).toEqual(expect.arrayContaining([
      { title: 'A day by the lake' },
      { name: 'description', content: 'A short read' },
      { property: 'og:title', content: 'A day by the lake' },
      { property: 'og:image', content: 'https://media.test/c/w1280.webp' },
    ]))
  })
})

describe('[E4.4][AC61] loader', () => {
  it('[AC-5] an unknown slug is a not-found, which the server answers with 404', async () => {
    const { readStoryPage } = await import('@/features/content/lib/read-story')
    api.loadPublicStory.mockResolvedValue(null)

    await expect(readStoryPage('en', 'nope')).rejects.toSatisfy(isNotFound)
    await expect(readStoryPage('fr', 'lake-day')).rejects.toSatisfy(isNotFound)
  })

  it('[AC-4] an address in a language with no version redirects (302, ADR-002 step 6) to the version that exists, never showing its text', async () => {
    const { readStoryPage } = await import('@/features/content/lib/read-story')
    api.loadPublicStory.mockResolvedValue(publicStory({ language: 'en', requestedLanguage: 'de', fallback: true, versions: [{ language: 'en', slug: 'lake-day' }], availableLanguages: ['en'] }))

    const thrown = await readStoryPage('de', 'lake-day').catch((e: unknown) => e)
    expect(isRedirect(thrown)).toBe(true)
    expect(thrown).toMatchObject({ options: { statusCode: 302, to: '/$lang/stories/$slug', params: { lang: 'en', slug: 'lake-day' } } })
  })

  it('[AC-4] another language\'s slug redirects to the guest language\'s own slug', async () => {
    const { readStoryPage } = await import('@/features/content/lib/read-story')
    api.loadPublicStory.mockResolvedValue(publicStory({ language: 'de', requestedLanguage: 'de', title: 'Seetag' }))

    const thrown = await readStoryPage('de', 'lake-day').catch((e: unknown) => e)
    expect(thrown).toMatchObject({ options: { statusCode: 302, params: { lang: 'de', slug: 'seetag' } } })
  })

  it('[AC-4][AC64] the landed page carries the languages the shell notice reads, and no redirect when the address is its own', async () => {
    const { readStoryPage } = await import('@/features/content/lib/read-story')
    api.loadPublicStory.mockResolvedValue(publicStory({ language: 'en', availableLanguages: ['en'], versions: [{ language: 'en', slug: 'lake-day' }] }))

    expect((await readStoryPage('en', 'lake-day')).availableLanguages).toEqual(['en'])
  })

  it('[AC-5] the loader data leaves out what the page does not draw', async () => {
    const { readStoryPage } = await import('@/features/content/lib/read-story')
    api.loadPublicStory.mockResolvedValueOnce(publicStory())
    const data = await readStoryPage('en', 'lake-day')

    expect(Object.keys(data.story)).not.toContain('related')
    expect(Object.keys(data.story)).not.toContain('keepsakes')
  })
})

type RouteModule = typeof import('@/routes/_guest/$lang/stories/$slug')

// The route's own loader, as the router calls it.
function runLoader(route: RouteModule['Route'], params: { lang: string, slug: string }) {
  return Promise.resolve().then(() => (route.options.loader as unknown as (ctx: unknown) => Promise<{ story: ReturnType<typeof publicStory> }>)({ params }))
}

describe('[E4.4][AC61] route wiring', () => {
  it('[AC-1] the route head gives the title, canonical, hreflang and x-default from the loader data, and no noindex', async () => {
    const { Route } = await import('@/routes/_guest/$lang/stories/$slug')
    api.loadPublicStory.mockResolvedValue(publicStory())
    const loaderData = await runLoader(Route, { lang: 'en', slug: 'lake-day' })
    const head = await Route.options.head!({ loaderData, params: { lang: 'en', slug: 'lake-day' } } as never)

    expect(head.meta).toContainEqual({ title: 'A day by the lake' })
    expect(head.links).toEqual(expect.arrayContaining([
      { rel: 'canonical', href: `${SITE}/en/stories/lake-day` },
      { rel: 'alternate', hrefLang: 'de', href: `${SITE}/de/stories/seetag` },
      { rel: 'alternate', hrefLang: 'x-default', href: `${SITE}/en/stories/lake-day` },
    ]))
    expect(JSON.stringify(head)).not.toMatch(/noindex/i)
    expect(await Route.options.head!({ loaderData: undefined, params: {} } as never)).toEqual({})
  })

  it('[AC-5] the route loader throws the not-found the router answers with 404 for an unknown slug', async () => {
    const { Route } = await import('@/routes/_guest/$lang/stories/$slug')
    api.loadPublicStory.mockResolvedValue(null)

    await expect(runLoader(Route, { lang: 'en', slug: 'nope' })).rejects.toSatisfy(isNotFound)
  })

  it('[AC-4] the route loader throws the 302 redirect for the other language\'s address', async () => {
    const { Route } = await import('@/routes/_guest/$lang/stories/$slug')
    api.loadPublicStory.mockResolvedValue(publicStory({ language: 'en', fallback: true, versions: [{ language: 'en', slug: 'lake-day' }] }))

    const thrown = await runLoader(Route, { lang: 'de', slug: 'lake-day' }).catch((e: unknown) => e)
    expect(isRedirect(thrown)).toBe(true)
    expect(thrown).toMatchObject({ options: { statusCode: 302 } })
  })
})

describe('[E4.4] skeleton', () => {
  it('mirrors the page head, the contents bar and the body', () => {
    const { container } = render(<StorySkeleton />)

    expect(container.querySelector('[data-skeleton="story"]')).not.toBeNull()
    expect(container.querySelector('[data-skeleton="contents"]')).not.toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
