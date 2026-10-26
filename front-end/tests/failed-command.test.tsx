import type { ReactNode } from 'react'
import type { DataClient } from '@/features/data-client'
import type { DemoState } from '@/features/demo/types'

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
import { startOnlinePaymentBlock } from '@/features/orders/lib/transitions'
import { usePayment } from '@/features/payment/hooks/use-payment'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}))

beforeEach(() => {
  window.localStorage.clear()
  navigate.mockClear()
})

/**
 * The demo client with one command that fails once `fail` is called, as an API call that is
 * refused after a while.
 */
function failingSetup(
  state: DemoState,
  failing: (demo: DataClient, held: Promise<never>) => DataClient,
) {
  const store = createDemoStore(state)
  let fail = () => {}
  const held = new Promise<never>((_, reject) => {
    fail = () => reject(new Error('The API is down'))
  })

  // Settles nothing until the test calls `fail`; the catch only keeps Vitest from reporting it.
  held.catch(() => {})
  const client = failing(createDemoDataClient(store), held)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DataClientProvider client={client}>
        <LocaleProvider>
          <DemoProvider store={store}>
            <Suspense fallback={null}>{children}</Suspense>
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>
  )

  return { store, fail, wrapper }
}

describe('a command that fails frees its button', () => {
  it('[E1.11] C12: an order payment that could not be sent frees Pay', async () => {
    const state = createSeedState()
    const order = state.data.orders.find(o => !startOnlinePaymentBlock(o))!
    const { fail, wrapper } = failingSetup(state, (demo, held) => ({
      ...demo,
      orders: { ...demo.orders, payOnline: () => held },
    }))
    const { result } = renderHook(() => usePayment(order), { wrapper })

    await waitFor(() => expect(result.current).not.toBeNull())
    act(() => result.current.choose('succeeded'))
    expect(result.current.isPending).toBe(true)
    fail()

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(navigate).not.toHaveBeenCalled()
  })
})
