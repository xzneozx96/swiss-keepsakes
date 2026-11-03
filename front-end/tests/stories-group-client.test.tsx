import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider, queryKeys, useCommand } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { ApiProblem } from '@/features/data-client/errors'
import { groupId, groupPatches, serveDetails, setUpHarness, state, storeId, storyGroupDetail, storyVersion } from './stories-details-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const save = () => renderHook(() => useCommand('stories', 'saveGroup', { meta: { silent: true } }), { wrapper })

describe('[E4.3][AC87] the group save call', () => {
  it('[E4.3][AC87] saveGroup PATCHes the group with If-Match, an Idempotency-Key and only the changed fields', async () => {
    serveDetails(storyGroupDetail({ en: storyVersion('en') }))
    const { result } = save()

    await act(async () => {
      await result.current.mutateAsync({ storeId, groupId, ifMatch: 1, idempotencyKey: 'k', stayTag: 'multi_day' })
    })
    expect(groupPatches()).toEqual([expect.objectContaining({ ifMatch: '1', key: 'k', body: { stayTag: 'multi_day' } })])
  })

  it('[E4.3][AC87] a stale If-Match is an ApiProblem precondition-failed', async () => {
    serveDetails(storyGroupDetail({ en: storyVersion('en') }))
    const { result } = save()
    let failure: unknown

    await act(async () => {
      failure = await result.current.mutateAsync({ storeId, groupId, ifMatch: 7, idempotencyKey: 'k', interests: [] }).catch((error: unknown) => error)
    })
    expect(failure).toBeInstanceOf(ApiProblem)
    expect(failure).toMatchObject({ type: 'precondition-failed' })
  })

  it('[E4.3][AC87] a save refreshes the story list, which carries the kind', () => {
    expect(commandAffects.stories.saveGroup).toEqual([queryKeys.stories.list])
  })
})
