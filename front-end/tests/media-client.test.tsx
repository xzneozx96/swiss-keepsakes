import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataClientProvider, useCommand } from '@/features/data-client'
import { uploadTimeoutMs } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { createMediaClient } from '@/features/media/api/api-client'
import { useMediaList, useMediaUses } from '@/features/media/api/queries'
import { item, other, page, photoId, problem, setUpHarness, state, storeId, uses } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpHarness)

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>{children}</DataClientProvider>
    </QueryClientProvider>
  )
}

const base = `/api/store/${storeId}/media`

describe('[E4.11][AC51] the media queries', () => {
  it('[E4.11][AC51] reads one page with its filters and the pages that use a file', async () => {
    state.answer = call => call.path.startsWith(`${base}?`) ? Response.json(page([item()])) : call.path === `${base}/${photoId}/uses` ? Response.json(uses()) : undefined
    const { result } = renderHook(() => ({ list: useMediaList(storeId, { kind: 'image', q: 'sun', use: 'unused', status: 'ready', page: 2, pageSize: 24 }), found: useMediaUses(storeId, photoId) }), { wrapper })

    await waitFor(() => expect(result.current.list.data?.items).toHaveLength(1))
    await waitFor(() => expect(result.current.found.data?.drafts).toHaveLength(1))
    const read = state.calls.find(call => call.path.startsWith(`${base}?`))!

    expect(new URL(read.path, 'http://x').searchParams.toString()).toBe('kind=image&q=sun&use=unused&status=ready&page=2&pageSize=24')
  })

  it('[E4.11][AC51] reads a refusal as an ApiProblem and does not retry it', async () => {
    state.answer = call => call.path.startsWith(`${base}?`) ? problem(403, 'forbidden') : undefined
    const { result } = renderHook(() => useMediaList(storeId, { kind: 'image', page: 1, pageSize: 24 }), { wrapper })

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiProblem))
    expect(state.calls.filter(call => call.path.startsWith(`${base}?`))).toHaveLength(1)
  })

  it('[E4.11][AC51] reads the list again while a file is processing, and stops once it is ready', async () => {
    let reads = 0
    state.answer = (call) => {
      if (!call.path.startsWith(`${base}?`))
        return undefined
      reads++

      return Response.json(page([item({ status: reads < 3 ? 'processing' : 'ready' })]))
    }
    const { result } = renderHook(() => useMediaList(storeId, { kind: 'image', page: 1, pageSize: 24 }), { wrapper })

    await waitFor(() => expect(result.current.data?.items[0]?.status).toBe('ready'), { timeout: 8000 })
    const settled = reads

    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(reads).toBe(settled)
  }, 20_000)
})

describe('[E4.11][AC51] the media commands', () => {
  it('describe and retire each send one keyed request', async () => {
    state.answer = call => call.method === 'GET' ? undefined : Response.json(item({ name: 'New' }))
    const { result } = renderHook(() => ({ describe: useCommand('media', 'describe'), retire: useCommand('media', 'retire') }), { wrapper })

    await act(async () => {
      await result.current.describe.mutateAsync({ storeId, id: photoId, idempotencyKey: 'k1', name: 'New', alt: { en: 'x' } })
      await result.current.retire.mutateAsync({ storeId, id: other, idempotencyKey: 'k2' })
    })

    const writes = state.calls.filter(call => call.method !== 'GET')

    expect(writes).toMatchObject([
      { method: 'PATCH', path: `${base}/${photoId}`, key: 'k1', body: { name: 'New', alt: { en: 'x' } } },
      { method: 'POST', path: `${base}/${other}/retire`, key: 'k2' },
    ])
  })

  it('a refused retire arrives as an ApiProblem with the type of the API', async () => {
    state.answer = call => call.method === 'GET' ? undefined : problem(409, 'media-in-use')
    const { result } = renderHook(() => useCommand('media', 'retire'), { wrapper })
    let error: unknown

    await act(async () => {
      await result.current.mutateAsync({ storeId, id: photoId, idempotencyKey: 'k' }).catch((caught: unknown) => (error = caught))
    })

    expect(error).toBeInstanceOf(ApiProblem)
    expect(error).toMatchObject({ status: 409, type: 'media-in-use' })
  })
})

describe('[E4.11][AC51] sending a large file', () => {
  const grant = { uploadKey: `${storeId}/k.pdf`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: {}, expiresAt: '2026-10-30T10:15:00.000Z', kind: 'pdf' }
  const mb = 1024 * 1024

  function fileOf(size: number) {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })

    Object.defineProperty(file, 'size', { value: size })

    return file
  }

  /** The time each call was given, in the order the calls were made: the grant, the file PUT, the confirm or replace. */
  async function givenTimes(send: (client: ReturnType<typeof createMediaClient>) => Promise<unknown>) {
    state.answer = call => call.path === `${base}/uploads` ? Response.json(grant) : call.path.endsWith('/confirm') || call.path.endsWith('/replace') ? Response.json(item()) : new Response(null, { status: 200 })
    const spy = vi.spyOn(AbortSignal, 'timeout')

    await send(createMediaClient())
    const times = spy.mock.calls.map(([ms]) => ms)

    spy.mockRestore()

    return times
  }

  it('[E4.11][AC51] the file PUT of an upload is not cut at 15 s: it gets time by size, and the JSON calls keep their own', async () => {
    const [grantTime, putTime, confirmTime] = await givenTimes(client => client.upload({ storeId, file: fileOf(50 * mb), contentType: 'application/pdf' }))

    expect(grantTime).toBe(15_000)
    expect(putTime).toBe(uploadTimeoutMs(50 * mb))
    expect(putTime).toBeGreaterThanOrEqual(50 * 8 * 1000 / 2)
    expect(confirmTime).toBeGreaterThan(15_000)
  })

  it('[E4.11][AC51] the file PUT of a replacement gets time by size, and a bigger file gets more', async () => {
    const small = await givenTimes(client => client.replace({ storeId, id: photoId, file: fileOf(1 * mb), contentType: 'application/pdf' }))
    const large = await givenTimes(client => client.replace({ storeId, id: photoId, file: fileOf(30 * mb), contentType: 'application/pdf' }))

    expect(small[1]).toBeGreaterThan(15_000)
    expect(large[1]).toBeGreaterThan(small[1]!)
    expect(large[2]).toBeGreaterThan(15_000)
  })
})
