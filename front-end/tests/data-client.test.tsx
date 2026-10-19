import type { DemoStore } from '@/features/demo/store'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useMerchantComments } from '@/features/content/merchant/hooks/use-merchant-comments'
import { DataClientProvider, queryKeys } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { createDemoDataClient, startDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { createDemoStore, updateCollection } from '@/features/demo/store'

beforeEach(() => {
  window.localStorage.clear()
})

describe('demo data client', () => {
  it('[E1.11] reads every collection into the cache before the first render, as the store holds it', async () => {
    const demo = startDemo()

    await demo.ready

    const { data } = demo.store.getState()

    expect(demo.queryClient.getQueryData(queryKeys.content.articles)).toBe(
      data.articles,
    )
    expect(demo.queryClient.getQueryData(queryKeys.content.comments)).toBe(
      data.comments,
    )
  })

  it('[E1.11] a command changes the store, and only the changed collection is read again', async () => {
    const demo = startDemo()

    await demo.ready

    const cache = demo.queryClient.getQueryCache()
    const articlesRead = cache.find({ queryKey: queryKeys.content.articles })!
      .state
      .dataUpdatedAt
    const comment = demo.store.getState().data.comments.find(c => !c.hidden)!

    await demo.dataClient.content.setCommentHidden({
      id: comment.id,
      hidden: true,
    })

    expect(
      demo.store.getState().data.comments.find(c => c.id === comment.id)?.hidden,
    ).toBe(true)
    await waitFor(() =>
      expect(
        demo.queryClient.getQueryData(queryKeys.content.comments),
      ).toBe(demo.store.getState().data.comments),
    )
    expect(
      cache.find({ queryKey: queryKeys.content.articles })!.state.dataUpdatedAt,
    ).toBe(articlesRead)
  })

  it('[E1.11] store writes outside the data client (a demo control, the prototype bar\'s reset) reach the cache', async () => {
    const demo = startDemo()
    const cached = () =>
      demo.queryClient.getQueryData<unknown[]>(queryKeys.content.comments)

    await demo.ready
    updateCollection(demo.store, 'comments', () => [])

    await waitFor(() => expect(cached()).toEqual([]))

    demo.store.reset()

    await waitFor(() =>
      expect(cached()).toBe(demo.store.getState().data.comments),
    )
    expect(cached()).toHaveLength(createSeedState().data.comments.length)
  })
})

/**
 * No store bridge here, so the screen sees a change only if its own mutation invalidates the query
 * it reads, which is what the API needs.
 */
function renderWithoutBridge<T>(hook: () => T, store: DemoStore) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const client = createDemoDataClient(store)

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <DataClientProvider client={client}>
          <LocaleProvider>
            <DemoProvider store={store}>
              <Suspense fallback={null}>{children}</Suspense>
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
}

describe('mutation then invalidate', () => {
  it('[E1.11] hiding a comment on M18 invalidates the comments query, so the row shows it hidden', async () => {
    const store = createDemoStore({ ...createSeedState(), role: 'owner' })
    const { result } = renderWithoutBridge(() => useMerchantComments([]), store)

    await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(0))
    const row = result.current.rows.find(r => !r.hidden)!

    act(() => result.current.setHidden(row.id, true))

    await waitFor(() =>
      expect(result.current.rows.find(r => r.id === row.id)?.hidden).toBe(
        true,
      ),
    )
  })
})
