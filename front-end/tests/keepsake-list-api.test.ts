import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadAllKeepsakes, loadKeepsakesPage } from '@/features/catalog/api/keepsakes'

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

describe('[E6.4][AC61][ADR-033] loadKeepsakesPage reads one page of the public list', () => {
  it('asks /api/public/keepsakes in the language with the limit, the cursor and the category, and returns the parsed page', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json({ items: [item], total: 7, nextCursor: 'abc' })
    })

    const page = await loadKeepsakesPage('de', { limit: 10, cursor: 'c1', category: 'knives' })

    expect(page).toEqual({ items: [item], total: 7, nextCursor: 'abc' })
    const url = new URL(urls[0]!)
    expect(url.pathname).toBe('/api/public/keepsakes')
    expect(Object.fromEntries(url.searchParams)).toEqual({ lang: 'de', limit: '10', cursor: 'c1', category: 'knives' })
  })

  it('sends no cursor and no category on the first unfiltered page', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json({ items: [], total: 0, nextCursor: null })
    })

    await loadKeepsakesPage('en', { limit: 3 })

    expect(Object.fromEntries(new URL(urls[0]!).searchParams)).toEqual({ lang: 'en', limit: '3' })
  })

  it('throws when the API does not answer 200', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'down' }, { status: 503 }))

    await expect(loadKeepsakesPage('en', { limit: 10 })).rejects.toThrow()
  })

  it('throws when the body is not a keepsake page', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ items: [{ slug: 1 }] }))

    await expect(loadKeepsakesPage('en', { limit: 10 })).rejects.toThrow()
    // The old whole-list shape has no total and no nextCursor.
    vi.stubGlobal('fetch', async () => Response.json({ items: [item] }))
    await expect(loadKeepsakesPage('en', { limit: 10 })).rejects.toThrow()
  })
})

describe('[ADR-033] loadAllKeepsakes loops the pages for the search', () => {
  it('reads 20 a page until nextCursor is null, and joins the items', async () => {
    const asked: URL[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      const url = new URL(input.url)
      asked.push(url)
      const page = Number(url.searchParams.get('cursor') ?? 0)
      return Response.json({ items: [{ ...item, id: crypto.randomUUID(), slug: `k-${page}` }], total: 2, nextCursor: page === 0 ? '1' : null })
    })

    const all = await loadAllKeepsakes('en')

    expect(all.map(i => i.slug)).toEqual(['k-0', 'k-1'])
    expect(asked.map(u => u.searchParams.get('limit'))).toEqual(['20', '20'])
  })
})
