import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPublicStory } from '@/features/content/api/public-story'

const id = '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11'
const story = {
  id,
  slug: 'lucerne-in-a-day',
  title: 'Lucerne in a day',
  excerpt: 'One day.',
  readMinutes: 3,
  coverKey: null,
  cover: null,
  stayTag: 'short_stay',
  interests: [],
  categories: [],
  publishedAt: '2026-11-01T08:00:00.000Z',
  language: 'en',
  requestedLanguage: 'en',
  fallback: false,
  availableLanguages: ['en'],
  authorName: 'Anna',
  body: { type: 'doc', content: [] },
  versions: [{ language: 'en', slug: 'lucerne-in-a-day' }],
  places: [],
  related: [],
  keepsakes: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('[E4.13] loadPublicStory reads the public story', () => {
  it('asks /api/public/stories/{slug} in the language and returns the parsed story', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json(story)
    })

    expect(await loadPublicStory('lucerne-in-a-day', 'de')).toEqual(story)
    expect(new URL(urls[0]!).pathname).toBe('/api/public/stories/lucerne-in-a-day')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('de')
  })

  it('returns null for a 404 (no published version has the slug)', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'Not found' }, { status: 404 }))

    expect(await loadPublicStory('nope', 'en')).toBeNull()
  })

  it('throws for a 503, so a failed read is never shown as a missing story', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'down' }, { status: 503 }))

    await expect(loadPublicStory('x', 'en')).rejects.toThrow()
  })

  it('throws for a body that is not a story', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ slug: 1 }))

    await expect(loadPublicStory('x', 'en')).rejects.toThrow()
  })
})
