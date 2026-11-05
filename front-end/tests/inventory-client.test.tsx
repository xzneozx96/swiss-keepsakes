import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider, useCommand } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useInventory } from '@/features/inventory/api/queries'
import { InventoryProblem } from '@/features/inventory/lib/problems'
import { base, setUpHarness, skuOf, state, stockList, stockProblem, stockRow, storeId } from './inventory-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

const query = { page: 1, pageSize: 10 }

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

describe('[E6.3][AC05][AC53] the inventory queries and the set command', () => {
  it('[E6.3][AC05][AC53] AC-1 reads the stock of the store from the API', async () => {
    state.answer = call => call.method === 'GET' && call.path.split('?')[0] === base ? Response.json(stockList([{}])) : undefined
    const { result } = renderHook(() => useInventory(storeId, query), { wrapper })

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1))
    expect(result.current.data?.counts).toEqual({ all: 1, inStock: 1, soldOut: 0 })
  })

  it('[E6.3][AC05][AC53] AC-2 set sends one keyed PUT with the figure, and reads the list again', async () => {
    state.answer = (call) => {
      if (call.method === 'PUT')
        return Response.json(stockRow({ onHand: 7, available: 5 }))
      return call.path.split('?')[0] === base ? Response.json(stockList([{}])) : undefined
    }
    const { result } = renderHook(() => ({ list: useInventory(storeId, query), set: useCommand('inventory', 'set') }), { wrapper })

    await waitFor(() => expect(result.current.list.data).toBeDefined())
    await act(async () => {
      await result.current.set.mutateAsync({ storeId, skuId: skuOf(1), onHand: 7, idempotencyKey: 'k1' })
    })
    const put = state.calls.find(call => call.method === 'PUT')

    expect(put).toMatchObject({ path: `${base}/${skuOf(1)}`, key: 'k1', body: { onHand: 7 } })
    await waitFor(() => expect(state.calls.filter(call => call.method === 'GET' && call.path.split('?')[0] === base).length).toBeGreaterThan(1))
  })

  it('[E6.3][AC05][AC53] AC-2 a refusal below the reserved units is an InventoryProblem that carries the reserved figure', async () => {
    state.answer = call => call.method === 'PUT' ? stockProblem(2) : undefined
    const { result } = renderHook(() => useCommand('inventory', 'set'), { wrapper })
    let error: unknown

    await act(async () => {
      error = await result.current.mutateAsync({ storeId, skuId: skuOf(1), onHand: 1, idempotencyKey: 'k2' }).catch((caught: unknown) => caught)
    })
    expect(error).toBeInstanceOf(InventoryProblem)
    expect(error).toBeInstanceOf(ApiProblem)
    expect(error).toMatchObject({ status: 422, type: 'stock-below-reserved', reserved: 2 })
  })
})
