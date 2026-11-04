import type { PublicStory } from '@sk/api-contract'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { StoryPage } from '@/features/content/components/story-page'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { publicStory } from './support/public-story'
import { storyCard } from './support/story-cards'

const api = vi.hoisted(() => ({ loadPublicStory: vi.fn() }))

vi.mock('@/features/content/api/public-story', () => api)

type Keepsake = PublicStory['keepsakes'][number]

function keepsake(over: Partial<Keepsake> & { name: string, slug: string }): Keepsake {
  return {
    id: `0190a000-0000-7000-8000-${String(over.slug.length).padStart(4, '0')}${over.slug.charCodeAt(0).toString().padStart(8, '0')}`,
    cover: null,
    soldOut: false,
    ...over,
  }
}

async function html(url: string, story: PublicStory) {
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
  return renderToString(<RouterProvider router={router} />)
}

describe('[E4.4][AC31][AC54] keepsake cards', () => {
  it('[AC-1] shows a published and a sold-out keepsake with no price, each linking to its page; the unpublished one is absent from the read', async () => {
    const out = await html('/en/stories/lake-day', publicStory({
      keepsakes: [
        keepsake({ slug: 'cowbell', name: 'Cowbell', cover: { url: 'https://media.test/k/o.jpg', variants: [{ width: 800, url: 'https://media.test/k/w800.webp' }] } }),
        keepsake({ slug: 'fondue-set', name: 'Fondue set', soldOut: true }),
      ],
    }))

    expect(out).toContain('Bring a piece of it home')
    expect(out).toMatch(/<a[^>]*href="\/en\/gifts\/cowbell"/)
    expect(out).toMatch(/<a[^>]*href="\/en\/gifts\/fondue-set"/)
    expect(out).toContain('Cowbell')
    expect(out).toContain('src="https://media.test/k/w800.webp"')
    expect(out.match(/Sold out/g)).toHaveLength(1)
    expect(out).not.toContain('CHF')
  })

  it('[AC-1] links the keepsake in the story\'s language', async () => {
    const out = await html('/de/stories/seetag', publicStory({ language: 'de', requestedLanguage: 'de', keepsakes: [keepsake({ slug: 'kuhglocke', name: 'Kuhglocke' })] }))

    expect(out).toMatch(/<a[^>]*href="\/de\/gifts\/kuhglocke"/)
    expect(out).toContain('Ein Stück davon mitnehmen')
  })

  it('[AC-1] shows at most 6 cards', async () => {
    const keepsakes = Array.from({ length: 8 }, (_, i) => keepsake({ slug: `k${i}x`, name: `Keepsake number ${i}` }))
    const out = await html('/en/stories/lake-day', publicStory({ keepsakes }))

    expect(out.match(/href="\/en\/gifts\//g)).toHaveLength(6)
  })

  it('[AC-2] a story without keepsakes draws no keepsake heading', async () => {
    const out = await html('/en/stories/lake-day', publicStory({ keepsakes: [] }))

    expect(out).not.toContain('Bring a piece of it home')
    expect(out).not.toContain('href="/en/gifts/')
  })
})

describe('[E4.4][AC33] related stories', () => {
  it('[AC-3] shows three related stories, each opening its own story in the card\'s language', async () => {
    const related = [
      storyCard({ title: 'Lake walk', slug: 'lake-walk' }),
      storyCard({ title: 'Pier food', slug: 'pier-food' }),
      storyCard({ title: 'Seebummel', slug: 'seebummel', language: 'de', fallback: true }),
    ]
    const out = await html('/en/stories/lake-day', publicStory({ related }))

    expect(out).toContain('More to discover')
    expect(out).toMatch(/href="\/en\/stories\/lake-walk"/)
    expect(out).toMatch(/href="\/en\/stories\/pier-food"/)
    expect(out).toMatch(/href="\/de\/stories\/seebummel"/)
    expect(out).toContain('Lake walk')
  })

  it('[AC-3] no related stories draws no heading', async () => {
    const out = await html('/en/stories/lake-day', publicStory({ related: [] }))

    expect(out).not.toContain('More to discover')
  })
})

describe('[E4.4][AC90] place tags', () => {
  it('[AC-4] a tagged place links to the map with its card; a place without a slug is a plain tag', async () => {
    const out = await html('/en/stories/lake-day', publicStory({ places: [
      { id: '0190a000-0000-7000-8000-00000000aaaa', slug: 'chapel-bridge', name: 'Chapel Bridge' },
      { id: '0190a000-0000-7000-8000-00000000bbbb', slug: null, name: 'Hidden Cove' },
    ] }))

    expect(out).toMatch(/<a[^>]*href="\/en\/map\?place=chapel-bridge"[^>]*>[^<]*Chapel Bridge/)
    expect(out).toContain('Hidden Cove')
    expect(out).not.toMatch(/<a[^>]*>[^<]*Hidden Cove/)
  })

  it('[AC-4] no places draws no heading', async () => {
    const out = await html('/en/stories/lake-day', publicStory({ places: [] }))

    expect(out).not.toContain('Places in this story')
  })
})

describe('[E4.4] blocks are independent', () => {
  it('[AC-5] the body still shows when keepsakes and related are empty', async () => {
    const out = await html('/en/stories/lake-day', publicStory({ keepsakes: [], related: [], places: [] }))

    expect(out).toContain('Morning at the pier')
    expect(out).not.toMatch(/Something went wrong|error/i)
  })
})

const src = join(__dirname, '..', 'src')

describe('[E4.4] the guest story page and route have no demo data', () => {
  it('[AC-5] the deleted guest story page demo files are gone', () => {
    for (const file of [
      'features/content/components/article-page.tsx',
      'features/content/components/article-comments.tsx',
      'features/content/hooks/use-article.ts',
      'features/content/lib/story-versions.ts',
      'features/content/fixtures/en-only-story.ts',
    ])
      expect(existsSync(join(src, file)), file).toBe(false)
  })

  it('[AC-5] the guest story route and page files import no demo module', () => {
    for (const file of [
      'routes/_guest/$lang/stories/$slug.tsx',
      'features/content/components/story-page.tsx',
      'features/content/components/story-places.tsx',
      'features/content/components/story-keepsakes.tsx',
      'features/content/components/story-related.tsx',
      'features/content/lib/read-story.ts',
    ]) {
      const text = readFileSync(join(src, file), 'utf8')
      expect(text, file).not.toMatch(/features\/demo|content\/seed|\.\.\/seed|useArticles|demo-client|story-versions/)
    }
  })
})
