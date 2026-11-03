import type { StoryGroupDetail } from '@sk/api-contract'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider } from '@/features/data-client'
import { storiesQueries } from '@/features/stories/api/queries'
import { useStoryGroupEditor } from '@/features/stories/hooks/use-story-group-editor'
import { groupPatches, problem, serveDetails, setUpHarness, state, storeId, storyGroupDetail, storyVersion } from './stories-details-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const WAIT = { timeout: 4000 }
const detail = () => storyGroupDetail({ en: storyVersion('en'), de: storyVersion('de') }, { categoryIds: ['c1'] }) as unknown as StoryGroupDetail

/** The hook over a group seeded into the query, as the editor screen has it. */
function mount(group = detail()) {
  const key = storiesQueries.group(state.demo.dataClient, storeId, group.id).queryKey

  state.demo.queryClient.setQueryData(key, group)

  return renderHook(() => useStoryGroupEditor({ storeId, group: state.demo.queryClient.getQueryData<StoryGroupDetail>(key)! }), { wrapper })
}

describe('[E4.3][AC87] the group editor', () => {
  it('[E4.3][AC87] Review Focus 1: two changes in a row send two PATCHes with If-Match 1 then 2', async () => {
    serveDetails(detail())
    const { result } = mount()

    act(() => result.current.change({ stayTag: 'multi_day' }))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), WAIT)
    await waitFor(() => expect(result.current.state).toBe('saved'), WAIT)
    act(() => result.current.change({ interests: ['food-drink'] }))
    await waitFor(() => expect(groupPatches()).toHaveLength(2), WAIT)
    expect(groupPatches().map(call => call.ifMatch)).toEqual(['1', '2'])
    expect(groupPatches().map(call => call.body)).toEqual([{ stayTag: 'multi_day' }, { interests: ['food-drink'] }])
  })

  it('[E4.3][AC87] a change made while a save runs goes after it with the version it returned', async () => {
    let release!: () => void
    const server = serveDetails(detail())

    server.groupGate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { result } = mount()

    act(() => result.current.change({ stayTag: 'multi_day' }))
    await waitFor(() => expect(result.current.state).toBe('saving'), WAIT)
    act(() => result.current.change({ interests: ['food-drink'] }))
    release()
    await waitFor(() => expect(groupPatches()).toHaveLength(2), WAIT)
    expect(groupPatches().map(call => call.ifMatch)).toEqual(['1', '2'])
  })

  it('[E4.3][AC87] the typed value shows at once in group, and the answer keeps both versions in the query', async () => {
    serveDetails(detail())
    const { result } = mount()

    act(() => result.current.change(current => ({ categoryIds: [...current.categoryIds, 'c2'] })))
    expect(result.current.group.categoryIds).toEqual(['c1', 'c2'])
    expect(result.current.isUnsaved).toBe(true)
    await waitFor(() => expect(result.current.isUnsaved).toBe(false), WAIT)
    const cached = state.demo.queryClient.getQueryData<StoryGroupDetail>(storiesQueries.group(state.demo.dataClient, storeId, result.current.group.id).queryKey)!

    expect(cached.categoryIds).toEqual(['c1', 'c2'])
    expect(cached.rowVersion).toBe(2)
    expect(cached.versions.en).not.toBeNull()
    expect(cached.versions.de).not.toBeNull()
  })

  it('[E4.3][AC87] Review Focus 4: a 412 sets state stale and problem precondition-failed, keeps the typed value and sends no more', async () => {
    serveDetails(detail(), call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined))
    const { result } = mount()

    act(() => result.current.change({ stayTag: 'short_stay' }))
    await waitFor(() => expect(result.current.state).toBe('stale'), WAIT)
    expect(result.current.problem).toBe('precondition-failed')
    expect(result.current.group.stayTag).toBe('short_stay')
    expect(result.current.isUnsaved).toBe(true)
    act(() => result.current.change({ interests: ['food-drink'] }))
    await act(async () => {
      expect(await result.current.flush()).toBe(false)
    })
    expect(groupPatches()).toHaveLength(1)
  })

  it('[E4.3][AC87] a change put back before the wait ends sends nothing', async () => {
    serveDetails(detail())
    const { result } = mount()

    act(() => result.current.change({ stayTag: 'multi_day' }))
    act(() => result.current.change({ stayTag: 'both' }))
    await waitFor(() => expect(result.current.state).toBe('saved'), WAIT)
    expect(groupPatches()).toHaveLength(0)
  })

  it('[E4.3][AC30] kind and subject place are not part of a group save (D1): a review switch alone sends nothing', async () => {
    serveDetails(detail())
    const { result } = mount()

    act(() => result.current.change({ kind: 'editorial_review' } as never))
    await waitFor(() => expect(result.current.state).toBe('saved'), WAIT)
    expect(groupPatches()).toHaveLength(0)
  })

  it('[E4.3][AC87] flush saves a pending change now and discard drops it', async () => {
    serveDetails(detail())
    const { result } = mount()

    act(() => result.current.change({ stayTag: 'multi_day' }))
    await act(async () => {
      expect(await result.current.flush()).toBe(true)
    })
    expect(groupPatches()).toHaveLength(1)
    act(() => result.current.change({ stayTag: 'short_stay' }))
    act(() => result.current.discard())
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(groupPatches()).toHaveLength(1)
  })
})
