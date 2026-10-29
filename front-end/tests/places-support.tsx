import type { Pin, PinListItem } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { pinListSchema, pinSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { startDemo } from '@/features/demo/data-client'
import { Stub } from './places-stub'

export const storeId = '0198a000-0000-7000-8000-000000000001'
export const uuid = (n: number) => `0198a000-0000-7000-8000-${String(n).padStart(12, '0')}`

export interface Call { method: string, path: string, key: string | null, ifMatch: string | null, body: unknown }

export const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

export function listItem(over: Partial<PinListItem> = {}): PinListItem {
  return {
    id: uuid(10),
    status: 'draft',
    title: { en: 'Chapel Bridge' },
    slug: null,
    located: true,
    categoryIds: [],
    hasDates: false,
    nextDate: null,
    stayTag: 'both',
    interests: [],
    coverMediaId: null,
    mainStory: null,
    hasPendingChanges: false,
    rowVersion: 1,
    updatedAt: '2026-10-29T10:00:00.000Z',
    ...over,
  }
}

export function pinOf(over: Partial<Pin> = {}): Pin {
  return pinSchema.parse({
    id: uuid(10),
    storeId,
    status: 'draft',
    slug: null,
    latitude: null,
    longitude: null,
    address: null,
    weeklyHours: [],
    stayTag: 'both',
    interests: [],
    serviceType: null,
    mustVisit: false,
    foodKind: null,
    coverMediaId: null,
    coverAlt: {},
    photos: [],
    outboundUrl: null,
    mainStoryGroupId: null,
    categoryIds: [],
    dates: [],
    draft: { title: { en: 'Chapel Bridge' }, tip: {}, localTip: {} },
    published: null,
    firstPublishedAt: null,
    rowVersion: 1,
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    ...over,
  })
}

/** What the stubbed API holds and does. `answer` may take over any call, so a test can refuse one. */
export interface FakeApi {
  calls: Call[]
  items: PinListItem[]
  pin: Pin | undefined
  categories: unknown[]
  stories: unknown[]
  answer: ((call: Call) => Response | undefined) | undefined
  hold: Promise<void> | undefined
}

// The generated client keeps the `fetch` it saw on its first call, so every test shares this one handler and
// only the state behind it is replaced.
let current: FakeApi = { calls: [], items: [], pin: undefined, categories: [], stories: [], answer: undefined, hold: undefined }

async function handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const api = current
  const request = input instanceof Request ? input : new Request(input, init)
  const text = await request.clone().text()
  const url = new URL(request.url)
  const call: Call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), ifMatch: request.headers.get('if-match'), body: text && request.headers.get('content-type')?.includes('json') ? JSON.parse(text) : undefined }

  api.calls.push(call)
  await api.hold
  const custom = api.answer?.(call)

  if (custom)
    return custom
  if (call.path === '/api/me')
    return Response.json({ guestId: storeId, stores: [{ storeId, role: 'owner', status: 'live' }] })
  if (call.method === 'GET' && call.path === `/api/store/${storeId}/pins`)
    return Response.json(pinListSchema.parse({ items: api.items }))
  if (call.method === 'GET' && call.path === `/api/store/${storeId}/pins/story-options`)
    return Response.json({ items: api.stories })
  if (call.method === 'GET' && call.path.includes('/pins/'))
    return api.pin ? Response.json(api.pin) : problem(404, 'not-found')
  if (call.method === 'GET' && call.path.includes('/categories/'))
    return Response.json({ items: api.categories })
  if (call.method === 'DELETE')
    return new Response(null, { status: 204 })

  return Response.json(api.pin ?? pinOf(), { status: call.method === 'POST' && call.path.endsWith('/pins') ? 201 : 200 })
}

export function installApi(): FakeApi {
  current = { calls: [], items: [], pin: undefined, categories: [], stories: [], answer: undefined, hold: undefined }
  vi.stubGlobal('fetch', handle)

  return current
}

export async function renderInRouter(screen_: ReactNode, { path, language = 'en' }: { path: string, language?: 'en' | 'de' }) {
  if (language === 'de') {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
  }
  const demo = startDemo()

  await demo.ready
  const root = createRootRoute({ component: Outlet })
  const list = createRoute({ getParentRoute: () => root, path: '/store/content/places', component: () => (path === '/store/content/places' ? screen_ : <Stub label="list" />) })
  const editor = createRoute({
    getParentRoute: () => root,
    path: '/store/content/places/$placeId',
    validateSearch: (search: Record<string, unknown>) => ({ start: search.start === 'dates' ? 'dates' : undefined }),
    component: () => (path.startsWith('/store/content/places/') ? screen_ : <Stub label="editor" />),
  })
  const router = createRouter({ routeTree: root.addChildren([list, editor]), history: createMemoryHistory({ initialEntries: [path] }), disableGlobalCatchBoundary: true })

  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )

  return { router, demo, screen }
}
