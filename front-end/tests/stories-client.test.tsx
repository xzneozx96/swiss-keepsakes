import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataClientProvider, useCommand } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { useStories } from '@/features/stories/api/queries'
import { problem, setUpHarness, state, storeId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const base = `/api/store/${storeId}/story-groups`
const groupId = '0198a000-0000-7000-8000-0000000000c1'
const group = { id: groupId, storeId, kind: 'story', subjectPlaceId: null, stayTag: 'both', interests: [], categoryIds: [], placeIds: [], keepsakeProductIds: [], relatedGroupIds: [], rowVersion: 1, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z' }
const version = { groupId, storeId, language: 'en', status: 'draft', slug: null, draft: null, published: null, publishedAt: null, rowVersion: 1, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z' }

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const stories = () => renderHook(() => useCommand('stories', 'createStory'), { wrapper })
const input = { storeId, authorName: 'Anna Keller', idempotencyKey: 'key-group', versionIdempotencyKey: 'key-version' }

describe('[E4.3][AC30] the stories queries and commands', () => {
  it('[E4.3][AC30] reads the list of the store from GET story-groups, and waits for a store id before it reads', async () => {
    state.answer = call => (call.method === 'GET' && call.path === base ? Response.json({ items: [] }) : undefined)
    const waiting = renderHook(() => useStories(undefined), { wrapper })

    expect(state.calls.filter(call => call.path === base)).toHaveLength(0)
    expect(waiting.result.current.fetchStatus).toBe('idle')
    const list = renderHook(() => useStories(storeId), { wrapper })

    await waitFor(() => expect(list.result.current.data).toEqual({ items: [] }))
    expect(state.calls.filter(call => call.path === base)).toHaveLength(1)
  })

  it('[E4.3][AC30] AC-3 createStory posts the group, then the English draft with the empty body and the account name', async () => {
    state.answer = call => call.method === 'POST' && call.path === base
      ? Response.json(group, { status: 201 })
      : call.method === 'POST' && call.path === `${base}/${groupId}/versions` ? Response.json(version, { status: 201 }) : undefined
    const { result } = stories()
    let created: unknown

    await act(async () => {
      created = await result.current.mutateAsync(input)
    })
    const posts = state.calls.filter(call => call.method === 'POST' && call.path.startsWith(base))

    expect(posts.map(call => call.path)).toEqual([base, `${base}/${groupId}/versions`])
    expect(posts[0]).toMatchObject({ key: 'key-group', body: { kind: 'story' } })
    expect(posts[1]).toMatchObject({
      key: 'key-version',
      body: { language: 'en', draft: { title: '', excerpt: '', authorName: 'Anna Keller', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } } },
    })
    expect(created).toMatchObject({ group: { id: groupId }, version: { language: 'en' } })
  })

  it('[E4.3][AC30] AC-3 a failed group post is rethrown as story-not-created and posts no version', async () => {
    state.answer = call => call.method === 'POST' && call.path === base ? problem(500, 'internal-error') : undefined
    const { result } = stories()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ type: 'story-not-created', status: 500, requestId: 'req-1' })
    })
    expect(state.calls.filter(call => call.path.endsWith('/versions'))).toHaveLength(0)
  })

  it('[E4.3][AC30] AC-3 a failed version post is rethrown as story-not-created', async () => {
    state.answer = call => call.method === 'POST' && call.path === base
      ? Response.json(group, { status: 201 })
      : call.path === `${base}/${groupId}/versions` ? problem(422, 'validation-failed') : undefined
    const { result } = stories()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ type: 'story-not-created', status: 422 })
    })
  })

  it('[E4.3][AC30] AC-4 removeStory sends one DELETE per version in parallel, each with its own If-Match and Idempotency-Key, and fails when one DELETE fails', async () => {
    const remove = renderHook(() => useCommand('stories', 'removeStory'), { wrapper })
    const versions = [{ language: 'en' as const, ifMatch: 3, idempotencyKey: 'k-en' }, { language: 'de' as const, ifMatch: 7, idempotencyKey: 'k-de' }]

    state.answer = call => call.method === 'DELETE' ? new Response(null, { status: 204 }) : undefined
    await act(async () => {
      await remove.result.current.mutateAsync({ storeId, groupId, versions })
    })
    const deletes = state.calls.filter(call => call.method === 'DELETE')

    expect(deletes).toEqual([
      expect.objectContaining({ path: `${base}/${groupId}/versions/en`, key: 'k-en', ifMatch: '3' }),
      expect.objectContaining({ path: `${base}/${groupId}/versions/de`, key: 'k-de', ifMatch: '7' }),
    ])

    state.answer = call => call.method === 'DELETE' && call.path.endsWith('/de') ? problem(412, 'precondition-failed') : call.method === 'DELETE' ? new Response(null, { status: 204 }) : undefined
    await act(async () => {
      await expect(remove.result.current.mutateAsync({ storeId, groupId, versions })).rejects.toMatchObject({ type: 'precondition-failed', status: 412 })
    })
  })

  it('[E4.3][AC30] commandAffects lists the stories list for every command', () => {
    for (const command of ['createStory', 'createVersion', 'removeStory'] as const)
      expect(commandAffects.stories[command]).toEqual([['stories', 'list'], ['stories', 'group']])
  })
})
