import { merchantCategoryListSchema, merchantCategorySchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCategories } from '@/features/categories/api/queries'
import { useIdempotencyKey } from '@/features/categories/hooks/use-idempotency-key'
import { problemTypeToMessageKey } from '@/features/categories/lib/category-problems'
import { DataClientProvider, useCommand } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { startDemo } from '@/features/demo/data-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const parentId = '0198a000-0000-7000-8000-0000000000c1'
const childId = '0198a000-0000-7000-8000-0000000000c2'

let calls: Call[]
let answer: (call: Call) => Response
let demo: ReturnType<typeof startDemo>

function category(id: string, over: Record<string, unknown> = {}) {
  return merchantCategorySchema.parse({ id, slug: 'walks', name: { en: 'Walks', de: null }, parentId: null, position: 1, childCount: 0, useCount: 0, ...over })
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
    const call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), body: text ? JSON.parse(text) : undefined }

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

describe('[E4.18][AC87] the category query', () => {
  it.each(['map', 'blog'] as const)('reads the %s list of the store from the API', async (kind) => {
    answer = () => Response.json(merchantCategoryListSchema.parse({ items: [category(parentId)] }))
    const { result } = renderHook(() => useCategories(storeId, kind), { wrapper })

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1))
    expect(calls).toEqual([{ method: 'GET', path: `/api/store/${storeId}/categories/${kind}`, key: null, body: undefined }])
  })

  it('does not retry a refusal and reads it as an ApiProblem', async () => {
    answer = () => Response.json(problemSchema.parse({ type: 'forbidden', status: 403, title: 'x', instance: '/x', requestId: 'r' }), { status: 403 })
    const { result } = renderHook(() => useCategories(storeId, 'map'), { wrapper })

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiProblem))
    expect(calls).toHaveLength(1)
    expect((result.current.error as ApiProblem).type).toBe('forbidden')
  })
})

describe('[E4.18][AC87] the category commands', () => {
  it('create, save, reorder and remove each send one keyed request', async () => {
    answer = call => call.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(call.path.endsWith('/order') ? { items: [] } : category(childId))
    const { result } = renderHook(() => ({
      key: useIdempotencyKey('x'),
      create: useCommand('categories', 'create'),
      save: useCommand('categories', 'save'),
      reorder: useCommand('categories', 'reorder'),
      remove: useCommand('categories', 'remove'),
    }), { wrapper })
    const idempotencyKey = result.current.key.next()

    await act(async () => {
      await result.current.create.mutateAsync({ storeId, kind: 'map', name: { en: 'Walks', de: '' }, parentId, idempotencyKey })
      await result.current.save.mutateAsync({ storeId, kind: 'blog', id: childId, name: { de: 'Wanderungen' }, idempotencyKey })
      await result.current.save.mutateAsync({ storeId, kind: 'blog', id: childId, parentId: null, idempotencyKey })
      await result.current.reorder.mutateAsync({ storeId, kind: 'map', parentId: null, ids: [parentId, childId], idempotencyKey })
      await result.current.remove.mutateAsync({ storeId, kind: 'map', id: childId, idempotencyKey })
    })

    const base = `/api/store/${storeId}/categories`

    expect(calls.filter(c => c.method !== 'GET')).toEqual([
      { method: 'POST', path: `${base}/map`, key: idempotencyKey, body: { name: { en: 'Walks', de: '' }, parentId } },
      { method: 'PATCH', path: `${base}/blog/${childId}`, key: idempotencyKey, body: { name: { de: 'Wanderungen' } } },
      { method: 'PATCH', path: `${base}/blog/${childId}`, key: idempotencyKey, body: { parentId: null } },
      { method: 'PUT', path: `${base}/map/order`, key: idempotencyKey, body: { parentId: null, ids: [parentId, childId] } },
      { method: 'DELETE', path: `${base}/map/${childId}`, key: idempotencyKey, body: undefined },
    ])
  })

  it('a refused delete throws an ApiProblem with the problem type', async () => {
    answer = () => Response.json(problemSchema.parse({ type: 'category-in-use', status: 409, title: 'x', instance: '/x', requestId: 'r' }), { status: 409 })
    const { result } = renderHook(() => useCommand('categories', 'remove'), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ storeId, kind: 'map', id: childId, idempotencyKey: 'k' })).rejects.toMatchObject({ status: 409, type: 'category-in-use' })
    })
  })

  it('a write refreshes the lists on screen', async () => {
    answer = call => call.method === 'GET' ? Response.json({ items: [] }) : Response.json(category(childId))
    const { result } = renderHook(() => ({
      map: useCategories(storeId, 'map'),
      blog: useCategories(storeId, 'blog'),
      create: useCommand('categories', 'create'),
    }), { wrapper })

    await waitFor(() => expect(calls.filter(c => c.method === 'GET')).toHaveLength(2))
    calls = []
    await act(async () => {
      await result.current.create.mutateAsync({ storeId, kind: 'map', name: { en: 'A' }, idempotencyKey: 'k' })
    })

    expect(calls.filter(c => c.method === 'GET').map(c => c.path).sort()).toEqual([`/api/store/${storeId}/categories/blog`, `/api/store/${storeId}/categories/map`])
  })
})

describe('[E4.18][AC87] the problem mapping', () => {
  it.each([
    ['category-has-children', 'categories.problem.hasChildren'],
    ['category-in-use', 'categories.problem.inUse'],
    ['category-too-deep', 'categories.problem.tooDeep'],
    ['category-parent-has-children', 'categories.problem.parentHasChildren'],
    ['validation-failed', 'categories.problem.name'],
    ['forbidden', 'categories.problem.forbidden'],
    ['not-found', 'categories.problem.notFound'],
    ['something-new', 'categories.problem.generic'],
  ])('maps %s to %s, which has English and German copy', (type, key) => {
    const mapped = problemTypeToMessageKey(type)

    expect(mapped).toBe(key)
    expect(en[mapped]).toBeTruthy()
    expect(de[mapped]).toBeTruthy()
  })
})
