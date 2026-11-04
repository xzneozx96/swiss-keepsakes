import { pickupPlaceListSchema, pickupPlaceSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider, useCommand } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { startDemo } from '@/features/demo/data-client'
import { usePickupPlaces } from '@/features/pickup/api/queries'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, ifMatch: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const placeId = '0198a000-0000-7000-8000-0000000000d1'

let calls: Call[]
let answer: (call: Call) => Response
let demo: ReturnType<typeof startDemo>

function place(over: Record<string, unknown> = {}) {
  return pickupPlaceSchema.parse({
    id: placeId,
    storeId,
    name: { en: 'Shop' },
    address: { en: 'Hertensteinstrasse 1' },
    instructions: null,
    position: 1,
    archived: false,
    hours: [{ weekday: 1, opens: '10:00', closes: '18:00' }],
    rowVersion: 3,
    mapsLink: 'https://maps.app.goo.gl/abc',
    latitude: 47.05165,
    longitude: 8.30754,
    ...over,
  })
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  answer = () => Response.json({})
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = {
      method: request.method,
      path: url.pathname + url.search,
      key: request.headers.get('idempotency-key'),
      ifMatch: request.headers.get('if-match'),
      body: text ? JSON.parse(text) : undefined,
    }

    calls.push(call)

    return answer(call)
  })
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

describe('[E6.6][AC26] the pickup point query', () => {
  it.each([[false, ''], [true, '?archived=true']])('reads the list with archived=%s from the API', async (archived, query) => {
    answer = () => Response.json(pickupPlaceListSchema.parse({ items: [place()] }))
    const { result } = renderHook(() => usePickupPlaces(storeId, { archived }), { wrapper })

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1))
    expect(calls).toEqual([{ method: 'GET', path: `/api/store/${storeId}/pickup-places${query}`, key: null, ifMatch: null, body: undefined }])
  })

  it('reads the active and the archived list apart', async () => {
    answer = () => Response.json({ items: [] })
    renderHook(() => ({ a: usePickupPlaces(storeId, { archived: false }), b: usePickupPlaces(storeId, { archived: true }) }), { wrapper })

    await waitFor(() => expect(calls).toHaveLength(2))
  })

  it('reads a refusal as an ApiProblem and does not retry', async () => {
    answer = () => Response.json(problemSchema.parse({ type: 'forbidden', status: 403, title: 'x', instance: '/x', requestId: 'r' }), { status: 403 })
    const { result } = renderHook(() => usePickupPlaces(storeId, { archived: false }), { wrapper })

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiProblem))
    expect(calls).toHaveLength(1)
  })
})

describe('[E6.6][AC26] the pickup point commands', () => {
  it('create, save, archive and restore each send one keyed request, with If-Match where the API wants a row version', async () => {
    answer = () => Response.json(place())
    const { result } = renderHook(() => ({
      create: useCommand('pickup', 'create'),
      save: useCommand('pickup', 'save'),
      archive: useCommand('pickup', 'archive'),
      restore: useCommand('pickup', 'restore'),
    }), { wrapper })
    const hours = [{ weekday: 1, opens: '22:00', closes: '02:00' }]

    await act(async () => {
      await result.current.create.mutateAsync({ storeId, name: { de: 'Laden' }, address: { de: 'Weg 1' }, mapsLink: 'https://maps.app.goo.gl/abc', hours, idempotencyKey: 'k1' })
      await result.current.save.mutateAsync({ storeId, id: placeId, ifMatch: 3, hours: [], idempotencyKey: 'k2' })
      await result.current.archive.mutateAsync({ storeId, id: placeId, ifMatch: 4, idempotencyKey: 'k3' })
      await result.current.restore.mutateAsync({ storeId, id: placeId, ifMatch: 5, idempotencyKey: 'k4' })
    })

    const base = `/api/store/${storeId}/pickup-places`

    expect(calls.filter(c => c.method !== 'GET')).toEqual([
      { method: 'POST', path: base, key: 'k1', ifMatch: null, body: { name: { de: 'Laden' }, address: { de: 'Weg 1' }, mapsLink: 'https://maps.app.goo.gl/abc', hours } },
      { method: 'PATCH', path: `${base}/${placeId}`, key: 'k2', ifMatch: '3', body: { hours: [] } },
      { method: 'POST', path: `${base}/${placeId}/archive`, key: 'k3', ifMatch: '4', body: undefined },
      { method: 'POST', path: `${base}/${placeId}/restore`, key: 'k4', ifMatch: '5', body: undefined },
    ])
  })

  it('delete sends one keyed DELETE with the row version, and a refused delete throws an ApiProblem pickup-in-use', async () => {
    answer = () => Response.json({ id: placeId })
    const { result } = renderHook(() => useCommand('pickup', 'remove'), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, id: placeId, ifMatch: 4, idempotencyKey: 'k5' })).resolves.toEqual({ id: placeId })
    })
    expect(calls.filter(c => c.method !== 'GET')).toEqual([{ method: 'DELETE', path: `/api/store/${storeId}/pickup-places/${placeId}`, key: 'k5', ifMatch: '4', body: undefined }])

    answer = () => Response.json(problemSchema.parse({ type: 'pickup-in-use', status: 409, title: 'x', instance: '/x', requestId: 'r' }), { status: 409 })
    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, id: placeId, ifMatch: 4, idempotencyKey: 'k6' })).rejects.toMatchObject({ status: 409, type: 'pickup-in-use' })
    })
  })

  it('a stale save throws an ApiProblem with the problem type precondition-failed', async () => {
    answer = () => Response.json(problemSchema.parse({ type: 'precondition-failed', status: 412, title: 'x', instance: '/x', requestId: 'r' }), { status: 412 })
    const { result } = renderHook(() => useCommand('pickup', 'save'), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, id: placeId, ifMatch: 1, name: { en: 'A' }, idempotencyKey: 'k' })).rejects.toMatchObject({ status: 412, type: 'precondition-failed' })
    })
  })

  it('a write refreshes the lists on screen', async () => {
    answer = call => call.method === 'GET' ? Response.json({ items: [] }) : Response.json(place())
    const { result } = renderHook(() => ({
      active: usePickupPlaces(storeId, { archived: false }),
      archived: usePickupPlaces(storeId, { archived: true }),
      archive: useCommand('pickup', 'archive'),
    }), { wrapper })

    await waitFor(() => expect(calls.filter(c => c.method === 'GET')).toHaveLength(2))
    calls = []
    await act(async () => {
      await result.current.archive.mutateAsync({ storeId, id: placeId, ifMatch: 3, idempotencyKey: 'k' })
    })

    expect(calls.filter(c => c.method === 'GET').map(c => c.path).sort()).toEqual([
      `/api/store/${storeId}/pickup-places`,
      `/api/store/${storeId}/pickup-places?archived=true`,
    ])
  })
})
