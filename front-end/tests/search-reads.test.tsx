import type { SearchKind } from '@/features/search/lib/search'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSearchSources } from '@/features/search/api/search-reads'

const m = vi.hoisted(() => ({
  api: { on: true },
  stories: vi.fn(),
  pins: vi.fn(),
  tours: vi.fn(),
  keepsakes: vi.fn(),
}))

vi.mock('@/lib/api-mode', () => ({ get apiEnabled() { return m.api.on } }))
vi.mock('@/features/content/api/public-stories', () => ({ loadPublicStories: m.stories }))
vi.mock('@/features/map/api/map-client', () => ({ fetchMapPins: m.pins, fetchMapPin: vi.fn(), fetchMapCategories: vi.fn() }))
vi.mock('@/features/catalog/api/keepsakes', () => ({ fetchKeepsakeList: m.keepsakes }))
vi.mock('@/features/data-client/api-transport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/data-client/api-transport')>()

  return { ...actual, loadClient: async () => ({ GET: m.tours }), answer: async (call: Promise<unknown>) => call }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient()

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  m.api.on = true
  m.stories.mockResolvedValue([])
  m.pins.mockResolvedValue([])
  m.tours.mockResolvedValue({ items: [] })
  m.keepsakes.mockResolvedValue({ items: [] })
})

describe('[E4.14][AC94] useSearchSources names the kind whose read failed', () => {
  const cases: [string, () => void, SearchKind][] = [
    ['stories', () => m.stories.mockRejectedValue(new Error('x')), 'story'],
    ['pins', () => m.pins.mockRejectedValue(new Error('x')), 'place'],
    ['tours', () => m.tours.mockRejectedValue(new Error('x')), 'tour'],
    ['keepsakes', () => m.keepsakes.mockRejectedValue(new Error('x')), 'keepsake'],
  ]

  it.each(cases)('a rejecting %s read fails only %s', async (_name, reject, kind) => {
    reject()
    const { result } = renderHook(() => useSearchSources('en'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.failed).toEqual([kind])
  })

  it('no failed read leaves failed empty', async () => {
    const { result } = renderHook(() => useSearchSources('en'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.failed).toEqual([])
  })

  it('a build without the API sends no request, so nothing fails and nothing loads', async () => {
    m.api.on = false
    const { result } = renderHook(() => useSearchSources('en'), { wrapper })

    await new Promise(resolve => setTimeout(resolve, 20))
    expect(result.current.failed).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect([m.stories, m.pins, m.tours, m.keepsakes].map(fn => fn.mock.calls.length)).toEqual([0, 0, 0, 0])
  })
})
