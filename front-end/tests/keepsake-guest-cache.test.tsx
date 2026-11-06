import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client/query-keys'
import { useVictorinoxItems } from '@/features/home/hooks/use-victorinox-items'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'

const m = vi.hoisted(() => ({ keepsakes: vi.fn() }))

vi.mock('@/lib/api-mode', () => ({ apiEnabled: true }))
vi.mock('@/features/catalog/api/keepsakes', async importOriginal => ({ ...await importOriginal<typeof import('@/features/catalog/api/keepsakes')>(), loadKeepsakesPage: m.keepsakes }))
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return { ...actual, Link: ({ children }: { children: React.ReactNode }) => <a href="/x">{children}</a> }
})

const item = { id: crypto.randomUUID(), slug: 'a', name: 'Keepsake A', cover: null, photos: [], subtitle: null, storeName: 'Swiss Native', soldOut: false, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

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
})

describe('[E6.4] the guest keepsake blocks read the first page only', () => {
  it('the home showcase asks for 20 and the tour block for 10, each once and never a second page', async () => {
    const { wrapper } = setup()
    const home = renderHook(() => useVictorinoxItems(), { wrapper })
    render(<TourKeepsakes />, { wrapper })

    await waitFor(() => expect(home.result.current.isPending).toBe(false))
    await screen.findByText('Keepsake A')
    expect(m.keepsakes).toHaveBeenCalledTimes(2)
    expect(m.keepsakes.mock.calls).toEqual(expect.arrayContaining([['en', { limit: 20 }], ['en', { limit: 10 }]]))
  })

  it('a merchant invalidation of the keepsake list does not refetch the guest list', async () => {
    const { client, wrapper } = setup()
    render(<TourKeepsakes />, { wrapper })
    await screen.findByText('Keepsake A')

    await client.invalidateQueries({ queryKey: queryKeys.keepsakes.list })
    expect(m.keepsakes).toHaveBeenCalledTimes(1)
  })
})
