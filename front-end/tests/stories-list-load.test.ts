import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadBlogCategories, loadPublicStories } from '@/features/content/api/public-stories'
import { storiesHead } from '@/features/content/lib/stories-head'
import { contentEn } from '@/features/content/messages'
import { contentDe as de } from '@/features/content/messages.de'
import { Route } from '@/routes/_guest/$lang/stories/index'
import { blogCategory } from './support/blog-categories'
import { storyCard } from './support/story-cards'

afterEach(() => vi.unstubAllGlobals())

describe('[E4.4] public stories read', () => {
  it('[E4.4][AC61] reads the public list in the page language and keeps the server order', async () => {
    const urls: string[] = []
    const cards = [storyCard({ title: 'New' }), storyCard({ title: 'Old' })]
    vi.stubGlobal('fetch', async (input: Request | string) => {
      urls.push(typeof input === 'string' ? input : input.url)
      return Response.json({ items: cards })
    })

    const items = await loadPublicStories('de')

    expect(items.map(s => s.title)).toEqual(['New', 'Old'])
    expect(new URL(urls[0]!).pathname).toBe('/api/public/stories')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('de')
  })

  it('[E4.4][AC54] a failed read throws, so the page shows the error and never a demo story', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500 }))

    await expect(loadPublicStories('en')).rejects.toThrow()
  })
})

describe('[E4.4] head', () => {
  it('[E4.4][AC61] carries title, description, canonical and both language alternates as absolute URLs', () => {
    const head = storiesHead('de')

    expect(head.meta).toEqual(expect.arrayContaining([{ title: de['stories.title'] }, { name: 'description', content: de['stories.intro'] }]))
    const href = (rel: string, hrefLang?: string) => head.links.find(l => l.rel === rel && l.hrefLang === hrefLang)?.href
    expect(href('canonical')).toMatch(/^https?:\/\/.+\/de\/stories$/)
    expect(href('alternate', 'en')).toMatch(/^https?:\/\/.+\/en\/stories$/)
    expect(href('alternate', 'de')).toMatch(/^https?:\/\/.+\/de\/stories$/)
    expect(href('alternate', 'x-default')).toMatch(/^https?:\/\/.+\/en\/stories$/)
  })

  it('[E4.4][AC61] the head words match the screen words', () => {
    expect(storiesHead('en').meta).toEqual(expect.arrayContaining([{ title: contentEn['stories.title'] }, { name: 'description', content: contentEn['stories.intro'] }]))
  })
})

describe('[E4.4][AC30] blog categories read and route', () => {
  const stub = (categories: () => Response) => vi.stubGlobal('fetch', async (input: Request | string) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    return url.pathname === '/api/public/blog-categories' ? categories() : Response.json({ items: [storyCard({ title: 'S' })] })
  })
  const options = Route.options as unknown as {
    validateSearch: (s: Record<string, unknown>) => { category?: string }
    loader: (a: { params: { lang: string } }) => Promise<{ stories: unknown[] | null, categories: { slug: string }[] | null }>
  }

  it('[AC-1] reads the blog categories as the API sends them', async () => {
    stub(() => Response.json({ items: [blogCategory({ slug: 'legends' })] }))

    expect((await loadBlogCategories('en')).map(c => c.slug)).toEqual(['legends'])
  })

  it('[AC-3] the route keeps a category slug from the address and drops an empty or odd one', () => {
    expect(options.validateSearch({ category: 'legends' })).toEqual({ category: 'legends' })
    expect(options.validateSearch({ category: '' })).toEqual({})
    expect(options.validateSearch({ category: ['a'] })).toEqual({})
    expect(options.validateSearch({})).toEqual({})
  })

  it('[AC-3] the loader returns the stories and the categories', async () => {
    stub(() => Response.json({ items: [blogCategory({ slug: 'legends' })] }))

    const data = await options.loader({ params: { lang: 'en' } })

    expect(data.stories).toHaveLength(1)
    expect(data.categories?.map(c => c.slug)).toEqual(['legends'])
  })

  it('[AC-7] a failed category read gives null categories and keeps the stories', async () => {
    stub(() => new Response('{}', { status: 500 }))

    const data = await options.loader({ params: { lang: 'en' } })

    expect(data.categories).toBeNull()
    expect(data.stories).toHaveLength(1)
  })

  it('[AC-3] the filtered view keeps the plain canonical link', () => {
    expect(storiesHead('en').links.find(l => l.rel === 'canonical')?.href).toMatch(/\/en\/stories$/)
  })
})
