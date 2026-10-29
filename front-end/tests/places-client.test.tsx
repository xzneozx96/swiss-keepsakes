import type { FakeApi } from './places-support'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataClientProvider, useCommand } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { ApiProblem } from '@/features/data-client/errors'
import { startDemo } from '@/features/demo/data-client'
import { usePlace, usePlaces, useStoryOptions } from '@/features/places/api/queries'
import { problemMessageKey } from '@/features/places/lib/problems'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { installApi, listItem, pinOf, problem, storeId, uuid } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

let api: FakeApi
let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
  demo = startDemo()
  await demo.ready
})

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

describe('[E4.2][AC68] the places queries and commands', () => {
  it('[E4.2][AC68] reads the list, one pin and the story options of the store from the API', async () => {
    api.items = [listItem()]
    api.pin = pinOf()
    api.stories = [{ groupId: uuid(30), kind: 'story', title: { en: 'The bridge' }, publishedLanguages: ['en'] }]
    const list = renderHook(() => usePlaces(storeId), { wrapper })
    const one = renderHook(() => usePlace(storeId, uuid(10), true), { wrapper })
    const stories = renderHook(() => useStoryOptions(storeId), { wrapper })

    await waitFor(() => expect(list.result.current.data?.items).toHaveLength(1))
    await waitFor(() => expect(one.result.current.data).toMatchObject({ id: uuid(10), rowVersion: 1 }))
    await waitFor(() => expect(stories.result.current.data?.items[0]?.groupId).toBe(uuid(30)))
    expect(api.calls.map(call => call.path)).toEqual(expect.arrayContaining([`/api/store/${storeId}/pins`, `/api/store/${storeId}/pins/${uuid(10)}`, `/api/store/${storeId}/pins/story-options`]))
  })

  it('[E4.2][AC68] waits for a store id before it reads, and never reads a new pin', () => {
    renderHook(() => usePlaces(undefined), { wrapper })
    renderHook(() => usePlace(storeId, 'new', false), { wrapper })

    expect(api.calls).toHaveLength(0)
  })

  it('[E4.2][AC79] a write sends the Idempotency-Key and If-Match, and a refusal is an ApiProblem with its type', async () => {
    const hide = renderHook(() => useCommand('places', 'hide'), { wrapper })

    await act(async () => {
      await hide.result.current.mutateAsync({ storeId, id: uuid(10), ifMatch: 5, idempotencyKey: 'key-1' })
    })
    expect(api.calls.at(-1)).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/hide`, key: 'key-1', ifMatch: '5' })

    api.answer = () => problem(412, 'precondition-failed')
    await act(async () => {
      await expect(hide.result.current.mutateAsync({ storeId, id: uuid(10), ifMatch: 5, idempotencyKey: 'key-2' })).rejects.toMatchObject({ type: 'precondition-failed', status: 412 })
    })
    await act(async () => {
      await hide.result.current.mutateAsync({ storeId, id: uuid(10), ifMatch: 5, idempotencyKey: 'key-3' }).catch((error: unknown) => expect(error).toBeInstanceOf(ApiProblem))
    })
  })

  it('[E4.2][AC68] every command that writes a pin refreshes the list and the open pin, and an upload refreshes nothing', () => {
    for (const command of ['create', 'save', 'publish', 'hide', 'remove'] as const)
      expect(commandAffects.places[command]).toEqual([['places', 'list'], ['places', 'pin']])
    expect(commandAffects.places.requestUpload).toEqual([])
    expect(commandAffects.places.confirmUpload).toEqual([])
  })

  it('[E4.2][AC68] every problem type the screens meet has words in both languages, and an unknown one has the generic line', () => {
    for (const type of ['precondition-failed', 'forbidden', 'not-found', 'content-slug-taken', 'slug-conflict', 'publish-incomplete', 'media-invalid', 'media-retired', 'media-processing', 'reference-invalid', 'validation-failed', 'content-in-use', 'published-cannot-be-deleted', 'not-published']) {
      const key = problemMessageKey(type)

      expect(key).not.toBe('places.problem.generic')
      expect(en[key]).toBeTruthy()
      expect(de[key]).toBeTruthy()
    }
    expect(problemMessageKey('something-new')).toBe('places.problem.generic')
  })
})
