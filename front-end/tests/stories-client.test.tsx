import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataClientProvider, useCommand } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { useStories, useStoryGroup, useStoryLinks } from '@/features/stories/api/queries'
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

  it('[E4.3][AC30] AC-7 removeStory sends one DELETE of the group with an Idempotency-Key and no If-Match, answers the unlink counts, and fails on a refusal', async () => {
    const remove = renderHook(() => useCommand('stories', 'removeStory'), { wrapper })
    let result: unknown

    state.answer = call => call.method === 'DELETE' ? Response.json({ pinsUnlinked: 2, storiesUnlinked: 3 }) : undefined
    await act(async () => {
      result = await remove.result.current.mutateAsync({ storeId, groupId, idempotencyKey: 'k-delete' })
    })

    expect(result).toEqual({ pinsUnlinked: 2, storiesUnlinked: 3 })
    expect(state.calls.filter(call => call.method === 'DELETE')).toEqual([expect.objectContaining({ path: `${base}/${groupId}`, key: 'k-delete', ifMatch: null })])

    state.answer = call => call.method === 'DELETE' ? problem(404, 'not-found') : undefined
    await act(async () => {
      await expect(remove.result.current.mutateAsync({ storeId, groupId, idempotencyKey: 'k-again' })).rejects.toMatchObject({ type: 'not-found', status: 404 })
    })
  })

  it('[E4.3][AC30] AC-5 reads the link counts from GET story-groups/{groupId}/links, and waits for a store id', async () => {
    state.answer = call => (call.method === 'GET' && call.path === `${base}/${groupId}/links` ? Response.json({ pins: 1, stories: 2 }) : undefined)
    const waiting = renderHook(() => useStoryLinks(undefined, groupId), { wrapper })

    expect(waiting.result.current.fetchStatus).toBe('idle')
    const read = renderHook(() => useStoryLinks(storeId, groupId), { wrapper })

    await waitFor(() => expect(read.result.current.data).toEqual({ pins: 1, stories: 2 }))
  })

  it('[E4.3][AC30] commandAffects lists the stories list for every command', () => {
    for (const command of ['createStory', 'createVersion'] as const)
      expect(commandAffects.stories[command]).toEqual([['stories', 'list'], ['stories', 'group']])
    // The groups are not read again (a deleted one would answer 404 while the editor is still on screen); the screen drops them.
    // The pins that named the story moved their row version, so the pin reads are refreshed.
    expect(commandAffects.stories.removeStory).toEqual([['stories', 'list'], ['places', 'list'], ['places', 'pin'], ['places', 'storyOptions']])
  })

  it('[E4.3][AC45] reads the group with both versions from GET story-groups/{groupId}', async () => {
    const detail = { ...group, versions: { en: version, de: null } }

    state.answer = call => (call.method === 'GET' && call.path === `${base}/${groupId}` ? Response.json(detail) : undefined)
    const waiting = renderHook(() => useStoryGroup(undefined, groupId), { wrapper })

    expect(waiting.result.current.fetchStatus).toBe('idle')
    const read = renderHook(() => useStoryGroup(storeId, groupId), { wrapper })

    await waitFor(() => expect(read.result.current.data).toEqual(detail))
    expect(state.calls.filter(call => call.path === `${base}/${groupId}`)).toHaveLength(1)
  })

  it('[E4.3][AC45] AC-1 saveVersion PATCHes the version with If-Match, an Idempotency-Key and the full draft', async () => {
    const draft = { title: 'A title', excerpt: '', authorName: 'Anna Keller', coverMediaId: null, body: { type: 'doc' as const, content: [{ type: 'paragraph' as const }] } }

    state.answer = call => (call.method === 'PATCH' ? Response.json({ ...version, draft, rowVersion: 4 }) : undefined)
    const save = renderHook(() => useCommand('stories', 'saveVersion'), { wrapper })
    let saved: unknown

    await act(async () => {
      saved = await save.result.current.mutateAsync({ storeId, groupId, language: 'de', ifMatch: 3, idempotencyKey: 'key-save', draft })
    })
    const patch = state.calls.find(call => call.method === 'PATCH')

    expect(patch).toMatchObject({ path: `${base}/${groupId}/versions/de`, key: 'key-save', ifMatch: '3', body: { draft } })
    expect(patch?.body).not.toHaveProperty('slug')
    expect(saved).toMatchObject({ rowVersion: 4 })
  })

  it('[E4.3][AC45] AC-2 a 412 is an ApiProblem of type precondition-failed', async () => {
    state.answer = call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined)
    const save = renderHook(() => useCommand('stories', 'saveVersion', { meta: { silent: true } }), { wrapper })

    await act(async () => {
      const saving = save.result.current.mutateAsync({ storeId, groupId, language: 'en', ifMatch: 1, idempotencyKey: 'k', draft: { title: '', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } } })

      await expect(saving).rejects.toMatchObject({ type: 'precondition-failed', status: 412 })
    })
  })

  it('[E4.3][AC45] commandAffects.stories.saveVersion is empty', () => {
    expect(commandAffects.stories.saveVersion).toEqual([])
  })
})
