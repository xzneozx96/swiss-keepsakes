import type { DataClient } from '@/features/data-client'
import type { DemoStore } from '@/features/demo/store'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { createDemoDataClient } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { createDemoStore } from '@/features/demo/store'
import { usePrivateTour } from '@/features/requests/hooks/use-private-tour'

beforeEach(() => {
  window.localStorage.clear()
})

/** C22's hook over the demo client, with the send held until `release` is called (a slow network). */
function renderSlowSend() {
  const store: DemoStore = createDemoStore(createSeedState())
  const demo = createDemoDataClient(store)
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const client: DataClient = {
    ...demo,
    requests: {
      ...demo.requests,
      sendPrivateTourRequest: async (request) => {
        await held

        return demo.requests.sendPrivateTourRequest(request)
      },
    },
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const view = renderHook(() => usePrivateTour(), {
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
  const stored = () => store.getState().data.privateTourRequests.length

  return { ...view, release, stored }
}

const input = {
  groupSize: 2,
  dateFrom: '2026-10-20',
  dateTo: undefined,
  interests: '',
  email: 'guest@example.com',
}

describe('a submit that leaves the screen (useSubmit)', () => {
  it('[E1.11] C22: a second tap while the request is on its way sends nothing', async () => {
    const { result, release, stored } = renderSlowSend()

    await waitFor(() => expect(result.current).not.toBeNull())
    const before = stored()
    const onSent = vi.fn()

    act(() => {
      result.current.send(input, onSent)
      result.current.send(input, onSent)
    })
    await waitFor(() => expect(result.current.isSending).toBe(true))
    act(() => {
      result.current.send(input, onSent)
    })
    release()

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1))
    expect(stored()).toBe(before + 1)
    expect(result.current.isSending).toBe(false)
  })

  it('[E1.11] C22: leaving the screen while the request is on its way skips the navigation', async () => {
    const { result, release, stored, unmount } = renderSlowSend()

    await waitFor(() => expect(result.current).not.toBeNull())
    const before = stored()
    const onSent = vi.fn()

    act(() => {
      result.current.send(input, onSent)
    })
    unmount()
    release()

    await waitFor(() => expect(stored()).toBe(before + 1))
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(onSent).not.toHaveBeenCalled()
  })
})
