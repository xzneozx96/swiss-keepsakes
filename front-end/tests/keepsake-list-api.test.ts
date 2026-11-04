import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'

const item = {
  id: '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11',
  slug: 'kapellbruecke-tasse',
  name: 'Kapellbrücke mug',
  cover: null,
  soldOut: false,
  language: 'en',
  requestedLanguage: 'en',
  availableLanguages: ['en', 'de'],
  fallback: false,
}

afterEach(() => vi.unstubAllGlobals())

describe('[E6.4][AC61] fetchKeepsakeList reads the public list', () => {
  it('asks /api/public/keepsakes in the language and returns the parsed list', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json({ items: [item] })
    })

    const list = await fetchKeepsakeList('de')

    expect(list.items).toEqual([item])
    expect(new URL(urls[0]!).pathname).toBe('/api/public/keepsakes')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('de')
  })

  it('throws when the API does not answer 200', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'down' }, { status: 503 }))

    await expect(fetchKeepsakeList('en')).rejects.toThrow()
  })

  it('throws when the body is not a keepsake list', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ items: [{ slug: 1 }] }))

    await expect(fetchKeepsakeList('en')).rejects.toThrow()
  })
})
