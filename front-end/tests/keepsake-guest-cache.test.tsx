import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client/query-keys'
import { useVictorinoxItems } from '@/features/home/hooks/use-victorinox-items'
import { useSearchSources } from '@/features/search/api/search-reads'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'

const m = vi.hoisted(() => ({ keepsakes: vi.fn() }))

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/catalog/api/keepsakes', () => ({ fetchKeepsakeList: m.keepsakes }))
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
  m.keepsakes.mockResolvedValue({ items: [item] })
})

describe('[E6.4] the guest keepsake list is one cache entry', () => {
  it('the home showcase, the tour block and the search share one read', async () => {
    const { wrapper } = setup()
    const home = renderHook(() => useVictorinoxItems(), { wrapper })
    render(<TourKeepsakes />, { wrapper })
    const search = renderHook(() => useSearchSources('en'), { wrapper })

    await waitFor(() => expect(home.result.current.isPending).toBe(false))
    await waitFor(() => expect(search.result.current.isLoading).toBe(false))
    await screen.findByText('Keepsake A')
    expect(m.keepsakes).toHaveBeenCalledTimes(1)
  })

  it('a merchant invalidation of the keepsake list does not refetch the guest list', async () => {
    const { client, wrapper } = setup()
    render(<TourKeepsakes />, { wrapper })
    await screen.findByText('Keepsake A')

    await client.invalidateQueries({ queryKey: queryKeys.keepsakes.list })
    expect(m.keepsakes).toHaveBeenCalledTimes(1)
  })
})
