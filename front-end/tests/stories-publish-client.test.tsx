import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataClientProvider, useCommand } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { PublishIncomplete } from '@/features/stories/api/publish-incomplete'
import { problem, setUpHarness, state, storeId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const groupId = '0198a000-0000-7000-8000-0000000000c1'
const base = `/api/store/${storeId}/story-groups/${groupId}/versions`
const version = { groupId, storeId, language: 'en', status: 'published', slug: 'a', draft: null, published: null, publishedAt: null, rowVersion: 5, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z' }

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const command = (name: 'publishVersion' | 'unpublishVersion') => renderHook(() => useCommand('stories', name, { meta: { silent: true } }), { wrapper })

describe('[E4.3][AC30][AC45] publish calls', () => {
  it('[E4.3][AC30] publishVersion POSTs .../versions/en/publish with If-Match 4 and an Idempotency-Key and returns the version', async () => {
    state.answer = call => (call.method === 'POST' ? Response.json(version) : undefined)
    const { result } = command('publishVersion')
    let answer: unknown

    await act(async () => {
      answer = await result.current.mutateAsync({ storeId, groupId, language: 'en', ifMatch: 4, idempotencyKey: 'k-pub' })
    })
    expect(state.calls.filter(call => call.method === 'POST')).toEqual([expect.objectContaining({ path: `${base}/en/publish`, key: 'k-pub', ifMatch: '4' })])
    expect(answer).toMatchObject({ rowVersion: 5 })
  })

  it('[E4.3][AC45] unpublishVersion POSTs .../versions/de/unpublish with its own If-Match', async () => {
    state.answer = call => (call.method === 'POST' ? Response.json({ ...version, status: 'draft' }) : undefined)
    const { result } = command('unpublishVersion')

    await act(async () => {
      await result.current.mutateAsync({ storeId, groupId, language: 'de', ifMatch: 9, idempotencyKey: 'k-un' })
    })
    expect(state.calls.find(call => call.method === 'POST')).toMatchObject({ path: `${base}/de/unpublish`, key: 'k-un', ifMatch: '9' })
  })

  it('[E4.3][AC30] AC-4 a 422 publish-incomplete throws PublishIncomplete with the gaps in errors[].path', async () => {
    state.answer = call => call.method === 'POST'
      ? Response.json({ type: 'publish-incomplete', status: 422, title: 'x', instance: '/x', requestId: 'req-1', errors: [{ in: 'body', path: 'coverMediaId', message: 'x' }, { in: 'body', path: 'nonsense', message: 'y' }, { in: 'body', path: 'coverMediaId', message: 'z' }] }, { status: 422 })
      : undefined
    const { result } = command('publishVersion')
    let caught: unknown

    await act(async () => {
      caught = await result.current.mutateAsync({ storeId, groupId, language: 'en', ifMatch: 4, idempotencyKey: 'k' }).catch((error: unknown) => error)
    })
    expect(caught).toBeInstanceOf(PublishIncomplete)
    expect(caught).toMatchObject({ gaps: ['coverMediaId'], status: 422, type: 'publish-incomplete', requestId: 'req-1' })
  })

  it('[E4.3][AC45] a 412 stays a plain ApiProblem of type precondition-failed', async () => {
    state.answer = call => (call.method === 'POST' ? problem(412, 'precondition-failed') : undefined)
    const { result } = command('publishVersion')
    let caught: unknown

    await act(async () => {
      caught = await result.current.mutateAsync({ storeId, groupId, language: 'en', ifMatch: 4, idempotencyKey: 'k' }).catch((error: unknown) => error)
    })
    expect(caught).not.toBeInstanceOf(PublishIncomplete)
    expect(caught).toMatchObject({ type: 'precondition-failed', status: 412 })
  })

  it('[E4.3][AC45] a successful publish refreshes the list query and leaves the group query to the editor', () => {
    expect(commandAffects.stories.publishVersion).toEqual([['stories', 'list']])
    expect(commandAffects.stories.unpublishVersion).toEqual([['stories', 'list']])
  })
})
