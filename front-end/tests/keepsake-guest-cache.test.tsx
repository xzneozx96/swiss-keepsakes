import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client/query-keys'
import { useVictorinoxItems } from '@/features/home/hooks/use-victorinox-items'
import { useSearchSources } from '@/features/search/api/search-reads'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'

const m = vi.hoisted(() => ({ keepsakes: vi.fn(), all: vi.fn() }))

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/catalog/api/keepsakes', async importOriginal => ({ ...await importOriginal<typeof import('@/features/catalog/api/keepsakes')>(), loadKeepsakesPage: m.keepsakes, loadAllKeepsakes: m.all }))
vi.mock('@/features/content/api/public-stories', () => ({ loadPublicStories: vi.fn().mockResolvedValue([]) }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: vi.fn().mockResolvedValue([]), fetchMapPin: vi.fn(), fetchMapCategories: vi.fn() }))
vi.mock('@sk/api-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sk/api-contract')>()

  return { ...actual, createApiClient: () => ({ GET: async () => ({ data: { items: [] }, response: new Response() }) }) }
})
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return { ...actual, Link: ({ children }: { children: React.ReactNode }) => <a href="/x">{children}</a> }
})

const item = { id: crypto.randomUUID(), slug: 'a', name: 'Keepsake A', cover: null, soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

function setup() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>
  )

  return { client, wrapper }
}

beforeEach(() => {
  localStorage.setItem('sk.language', JSON.stringify('en'))
  m.keepsakes.mockReset()
  // More follow, yet the blocks never ask for the next page (ADR-033).
  m.keepsakes.mockResolvedValue({ items: [item], total: 40, nextCursor: 'more' })
  m.all.mockReset()
  m.all.mockResolvedValue([item])
})

describe('[E6.4] the guest keepsake blocks read the first page only', () => {
  it('the home showcase asks for 20 and the tour block for 10, each once and never a second page; the search reads the whole list on its own', async () => {
    const { wrapper } = setup()
    const home = renderHook(() => useVictorinoxItems(), { wrapper })
    render(<TourKeepsakes />, { wrapper })
    const search = renderHook(() => useSearchSources('en'), { wrapper })

    await waitFor(() => expect(home.result.current.isPending).toBe(false))
    await waitFor(() => expect(search.result.current.isLoading).toBe(false))
    await screen.findByText('Keepsake A')
    expect(m.keepsakes).toHaveBeenCalledTimes(2)
    expect(m.keepsakes.mock.calls).toEqual(expect.arrayContaining([['en', { limit: 20 }], ['en', { limit: 10 }]]))
    expect(m.all).toHaveBeenCalledTimes(1)
  })

  it('a merchant invalidation of the keepsake list does not refetch the guest list', async () => {
    const { client, wrapper } = setup()
    render(<TourKeepsakes />, { wrapper })
    await screen.findByText('Keepsake A')

    await client.invalidateQueries({ queryKey: queryKeys.keepsakes.list })
    expect(m.keepsakes).toHaveBeenCalledTimes(1)
  })
})
