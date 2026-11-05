import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSearchPage, SEARCH_PAGE_SIZE, searchPagesQuery } from '@/features/search/api/search-reads'
import { storyCard } from './support/story-cards'

afterEach(() => vi.unstubAllGlobals())

const counts = { story: 1, place: 0, tour: 0, keepsake: 0 }

function stub(body: unknown = { items: [{ kind: 'story', card: storyCard({ title: 'Lion' }) }], total: 1, counts, nextCursor: 'abc' }, status = 200) {
  const urls: URL[] = []
  vi.stubGlobal('fetch', async (input: Request) => {
    urls.push(new URL(input.url))
    return Response.json(body, { status })
  })

  return urls
}

describe('[ADR-033][slice 6] the search read', () => {
  it('sends the language, the text, the kind and the cursor, ten a page, and nothing it was not given', async () => {
    const urls = stub()

    const page = await loadSearchPage('de', { q: 'Löwen', kind: 'tour' }, { cursor: 'xyz' })

    expect(Object.fromEntries(urls[0]!.searchParams)).toEqual({ lang: 'de', limit: String(SEARCH_PAGE_SIZE), q: 'Löwen', kind: 'tour', cursor: 'xyz' })
    expect(urls[0]!.pathname).toBe('/api/public/search')
    expect(page).toMatchObject({ total: 1, nextCursor: 'abc', counts })
  })

  it('a tapped tile sends interest and no q', async () => {
    const urls = stub()

    await loadSearchPage('en', { q: '', interest: 'food-drink' })

    expect(Object.fromEntries(urls[0]!.searchParams)).toEqual({ lang: 'en', limit: '10', interest: 'food-drink' })
  })

  it('a failed read and an answer that is not a search page both throw', async () => {
    stub({ title: 'down' }, 503)
    await expect(loadSearchPage('en', { q: 'a' })).rejects.toThrow()
    stub({ items: [] })
    await expect(loadSearchPage('en', { q: 'a' })).rejects.toThrow()
  })

  it('the query key holds the language, text, interest and kind, so each change is a new list from page 1', () => {
    const keys = [
      searchPagesQuery('en', { q: 'a' }).queryKey,
      searchPagesQuery('de', { q: 'a' }).queryKey,
      searchPagesQuery('en', { q: 'b' }).queryKey,
      searchPagesQuery('en', { q: 'a', kind: 'story' }).queryKey,
      searchPagesQuery('en', { q: '', interest: 'food-drink' }).queryKey,
    ]
    const client = new QueryClient()

    expect(new Set(keys.map(key => client.getQueryCache().build(client, { queryKey: key }).queryHash)).size).toBe(5)
  })
})
