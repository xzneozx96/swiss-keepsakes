import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider, useCommand } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useKeepsake, useKeepsakes } from '@/features/keepsakes/api/queries'
import { list, listItem, problem, product, productId, setUpHarness, state, storeId, variantId } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const base = `/api/store/${storeId}/products`

describe('[E6.1][list] the keepsake queries', () => {
  it('[E6.1][list] reads the list and one keepsake of the store from the API', async () => {
    state.answer = call => call.path === base ? Response.json(list([listItem()])) : call.path === `${base}/${productId}` ? Response.json(product()) : undefined
    const { result } = renderHook(() => ({ all: useKeepsakes(storeId), one: useKeepsake(storeId, productId) }), { wrapper })

    await waitFor(() => expect(result.current.all.data?.items).toHaveLength(1))
    await waitFor(() => expect(result.current.one.data?.rowVersion).toBe(1))
    expect(state.calls.filter(call => call.method === 'GET' && call.path.startsWith(base)).map(call => call.path).sort()).toEqual([base, `${base}/${productId}`])
  })

  it('[E6.1][list] does not retry a refusal and reads it as an ApiProblem', async () => {
    state.answer = call => call.path === base ? problem(403, 'forbidden') : undefined
    const { result } = renderHook(() => useKeepsakes(storeId), { wrapper })

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiProblem))
    expect(state.calls.filter(call => call.path === base)).toHaveLength(1)
    expect((result.current.error as ApiProblem).type).toBe('forbidden')
  })
})

describe('[E6.1][412] the keepsake commands', () => {
  it('create, save, publish, unpublish and saveVariant each send one keyed request, and a save carries If-Match', async () => {
    state.answer = call => call.method === 'GET' ? undefined : Response.json(product({ rowVersion: 2 }))
    const { result } = renderHook(() => ({
      create: useCommand('keepsakes', 'create'),
      save: useCommand('keepsakes', 'save'),
      publish: useCommand('keepsakes', 'publish'),
      unpublish: useCommand('keepsakes', 'unpublish'),
      saveVariant: useCommand('keepsakes', 'saveVariant'),
    }), { wrapper })

    await act(async () => {
      await result.current.create.mutateAsync({ storeId, name: { en: 'Knife' }, variants: [{ skuCode: 'VX-1', priceRappen: 3900 }], idempotencyKey: 'k1' })
      await result.current.save.mutateAsync({ storeId, id: productId, ifMatch: 1, name: { en: 'Knife' }, photoIds: [], commissionRate: 0.2, idempotencyKey: 'k2' })
      await result.current.publish.mutateAsync({ storeId, id: productId, ifMatch: 2, idempotencyKey: 'k3' })
      await result.current.unpublish.mutateAsync({ storeId, id: productId, ifMatch: 3, idempotencyKey: 'k4' })
      await result.current.saveVariant.mutateAsync({ storeId, id: productId, variantId, priceRappen: 4500, status: 'draft', idempotencyKey: 'k5' })
    })

    expect(state.calls.filter(call => call.method !== 'GET')).toEqual([
      { method: 'POST', path: base, key: 'k1', ifMatch: null, body: { name: { en: 'Knife' }, variants: [{ skuCode: 'VX-1', priceRappen: 3900 }] } },
      { method: 'PATCH', path: `${base}/${productId}`, key: 'k2', ifMatch: '1', body: { name: { en: 'Knife' }, photoIds: [], commissionRate: 0.2 } },
      { method: 'POST', path: `${base}/${productId}/publish`, key: 'k3', ifMatch: '2', body: undefined },
      { method: 'POST', path: `${base}/${productId}/unpublish`, key: 'k4', ifMatch: '3', body: undefined },
      { method: 'PATCH', path: `${base}/${productId}/variants/${variantId}`, key: 'k5', ifMatch: null, body: { priceRappen: 4500, status: 'draft' } },
    ])
  })

  it('[E6.1][412] a stale save throws an ApiProblem with the precondition-failed type', async () => {
    state.answer = call => call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined
    const { result } = renderHook(() => useCommand('keepsakes', 'save'), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, id: productId, ifMatch: 1, photoIds: [], idempotencyKey: 'k' })).rejects.toMatchObject({ status: 412, type: 'precondition-failed' })
    })
  })

  it('[E6.1][list] create, publish, unpublish and a variant change refresh the list on screen, and the autosave does not', async () => {
    let lists = 0

    state.answer = (call) => {
      if (call.path === base && call.method === 'GET') {
        lists++

        return Response.json(list([listItem()]))
      }

      return call.method === 'GET' ? undefined : Response.json(product({ rowVersion: 2 }))
    }
    const { result } = renderHook(() => ({
      all: useKeepsakes(storeId),
      save: useCommand('keepsakes', 'save'),
      publish: useCommand('keepsakes', 'publish'),
    }), { wrapper })

    await waitFor(() => expect(result.current.all.data).toBeDefined())
    await act(async () => {
      await result.current.save.mutateAsync({ storeId, id: productId, ifMatch: 1, photoIds: [], idempotencyKey: 'a' })
    })
    expect(lists).toBe(1)
    await act(async () => {
      await result.current.publish.mutateAsync({ storeId, id: productId, ifMatch: 2, idempotencyKey: 'b' })
    })
    await waitFor(() => expect(lists).toBe(2))
  })
})

describe('[E6.2][AC52] the options and variant commands', () => {
  it('[E6.2][AC52] saveOptions is a keyed PUT with If-Match, createVariant a keyed POST with no version', async () => {
    state.answer = call => call.method === 'GET' ? undefined : Response.json(product({ rowVersion: 2 }))
    const { result } = renderHook(() => ({
      saveOptions: useCommand('keepsakes', 'saveOptions'),
      createVariant: useCommand('keepsakes', 'createVariant'),
    }), { wrapper })
    const options = [{ ref: variantId, name: { en: 'Size' }, values: [{ ref: 'new-1', label: { en: 'Small' }, swatch: null }] }]

    await act(async () => {
      await result.current.saveOptions.mutateAsync({ storeId, id: productId, ifMatch: 4, options, variantValues: [{ variantId, values: { [variantId]: 'new-1' } }], idempotencyKey: 'k6' })
      await result.current.createVariant.mutateAsync({ storeId, id: productId, skuCode: 'VX-2', priceRappen: 100, status: 'draft', values: {}, idempotencyKey: 'k7' })
    })

    expect(state.calls.filter(call => call.method !== 'GET')).toEqual([
      { method: 'PUT', path: `${base}/${productId}/options`, key: 'k6', ifMatch: '4', body: { options, variantValues: [{ variantId, values: { [variantId]: 'new-1' } }] } },
      { method: 'POST', path: `${base}/${productId}/variants`, key: 'k7', ifMatch: null, body: { skuCode: 'VX-2', priceRappen: 100, status: 'draft', values: {} } },
    ])
  })

  it('[E6.2][AC52] a 422 refusal carries the refusals the API named, at the option, value or variant', async () => {
    state.answer = call => (call.method === 'PUT'
      ? Response.json({ type: 'validation-failed', status: 422, title: 'x', instance: '/x', requestId: 'r', errors: [{ in: 'body', path: 'options.o1.values.v1', message: 'x', code: 'value-in-use', params: { value: 'Lion', count: 2, codes: 'A, B', more: 0 } }] }, { status: 422 })
      : undefined)
    const { result } = renderHook(() => useCommand('keepsakes', 'saveOptions'), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, id: productId, ifMatch: 1, options: [], idempotencyKey: 'k' })).rejects.toMatchObject({
        status: 422,
        type: 'validation-failed',
        refusals: [{ at: 'v1', code: 'value-in-use', params: { value: 'Lion', count: 2, codes: 'A, B', more: 0 } }],
      })
    })
  })

  it('[E6.2][AC52] an options save and a variant create refresh the list', async () => {
    let lists = 0

    state.answer = (call) => {
      if (call.path === base && call.method === 'GET') {
        lists++

        return Response.json(list([listItem()]))
      }

      return call.method === 'GET' ? undefined : Response.json(product({ rowVersion: 2 }))
    }
    const { result } = renderHook(() => ({ all: useKeepsakes(storeId), saveOptions: useCommand('keepsakes', 'saveOptions'), createVariant: useCommand('keepsakes', 'createVariant') }), { wrapper })

    await waitFor(() => expect(lists).toBe(1))
    await act(async () => {
      await result.current.saveOptions.mutateAsync({ storeId, id: productId, ifMatch: 1, options: [], idempotencyKey: 'k8' })
    })
    await waitFor(() => expect(lists).toBe(2))
    await act(async () => {
      await result.current.createVariant.mutateAsync({ storeId, id: productId, skuCode: 'VX-3', priceRappen: 100, idempotencyKey: 'k9' })
    })
    await waitFor(() => expect(lists).toBe(3))
  })
})
