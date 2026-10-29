import { mediaSchema, problemSchema, productListSchema, productSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { CreateKeepsake } from '@/features/keepsakes/components/create-flow'
import { KeepsakeEditorScreen } from '@/features/keepsakes/components/keepsake-editor'
import { KeepsakeList } from '@/features/keepsakes/components/keepsake-list'
import { VariantScreen } from '@/features/keepsakes/components/variant-page'
import { isKeepsakeView } from '@/features/keepsakes/lib/search-params'

// jsdom has no CSS.supports, which a module of the prototype gift editor (the CommissionCard's file) calls on load.
vi.hoisted(() => {
  const css = (globalThis as unknown as { CSS?: { supports?: () => boolean } }).CSS

  if (css)
    css.supports ??= () => false
  else
    Object.defineProperty(globalThis, 'CSS', { value: { supports: () => false }, configurable: true })
})

// The real keepsake screens, hooks and DataClient, with the HTTP answered by the test.
export interface Call { method: string, path: string, key: string | null, ifMatch: string | null, body: unknown }

export const storeId = '0198a000-0000-7000-8000-000000000001'
export const productId = '0198a000-0000-7000-8000-0000000000a1'
export const variantId = '0198a000-0000-7000-8000-0000000000b1'
export const photoId = '0198a000-0000-7000-8000-0000000000e1'

export const media = mediaSchema.parse({
  id: photoId,
  kind: 'image',
  status: 'ready',
  contentType: 'image/jpeg',
  byteSize: 1000,
  width: 1280,
  height: 960,
  publicUrl: 'https://storage.test/media/s/p/original.jpg',
  variants: [{ width: 320, url: 'https://storage.test/media/s/p/w320.webp' }, { width: 640, url: 'https://storage.test/media/s/p/w640.webp' }],
})

export function product(over: Record<string, unknown> = {}) {
  return productSchema.parse({
    id: productId,
    storeId,
    status: 'draft',
    name: { en: 'Victorinox Classic' },
    text: { en: 'A Swiss knife.' },
    photos: [media],
    commissionRate: 0.1,
    slug: null,
    hasUnpublishedEdits: false,
    options: [],
    variants: [{ id: variantId, skuCode: 'VX-1', priceRappen: 3900, status: 'published', values: {} }],
    blocking: [],
    warnings: [{ code: 'other-language', card: 'basics', language: 'de' }],
    rowVersion: 1,
    createdAt: '2026-10-30T08:00:00.000Z',
    updatedAt: '2026-10-30T08:00:00.000Z',
    ...over,
  })
}

export function listItem(over: Record<string, unknown> = {}) {
  return {
    id: productId,
    name: { en: 'Victorinox Classic' },
    status: 'draft',
    hasUnpublishedEdits: false,
    cover: media,
    variantCount: 1,
    soldOutCount: 0,
    updatedAt: '2026-10-30T08:00:00.000Z',
    ...over,
  }
}

export const list = (items: Record<string, unknown>[]) => productListSchema.parse({ items })
export const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

export interface Harness {
  calls: Call[]
  /** The test's answer for a call; return undefined to let the default answer it (/api/me). */
  answer: (call: Call) => Response | undefined
  demo: ReturnType<typeof startDemo>
}

export const state = {} as Harness

/** Stubs `fetch`, starts the demo store and resets the page. Call it in `beforeEach`. */
export async function setUpHarness() {
  window.scrollTo = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.history.pushState({}, '', '/store/products')
  localStorage.clear()
  sessionStorage.clear()
  state.calls = []
  state.answer = () => undefined
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    // jsdom's File is no body for Node's Request: a file PUT is recorded without its bytes.
    const request = input instanceof Request
      ? input
      : (() => {
          try {
            return new Request(input, init)
          }
          catch {
            return new Request(input, { method: init?.method, headers: init?.headers })
          }
        })()
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), ifMatch: request.headers.get('if-match'), body: text && request.headers.get('content-type')?.includes('json') ? JSON.parse(text) : undefined }

    state.calls.push(call)
    const custom = state.answer(call)

    if (custom)
      return custom
    if (call.path === '/api/me')
      return Response.json({ guestId: storeId, stores: [{ storeId, role: 'owner', status: 'live' }] })

    return problem(404, 'not-found')
  })
  state.demo = startDemo()
  await state.demo.ready
}

export function renderKeepsakes(initial: string) {
  const root = createRootRoute({ component: Outlet })
  const index = createRoute({ getParentRoute: () => root, path: '/store/products', component: KeepsakeList })
  const create = createRoute({ getParentRoute: () => root, path: '/store/products/gifts/new', component: CreateKeepsake })
  const edit = createRoute({
    getParentRoute: () => root,
    path: '/store/products/gifts/$productId',
    validateSearch: (search: Record<string, unknown>) => ({ view: isKeepsakeView(search.view) && search.view !== 'edit' ? search.view : undefined }),
    component: function Edit() {
      const { productId: id } = edit.useParams()
      const { view = 'edit' } = edit.useSearch()
      const navigate = edit.useNavigate()

      return <KeepsakeEditorScreen id={id} view={view} onView={next => void navigate({ search: next === 'edit' ? {} : { view: next }, replace: true })} />
    },
  })
  const variant = createRoute({
    getParentRoute: () => root,
    path: '/store/products/gifts/$productId/variants/$variantId',
    component: function VariantPage() {
      const { productId: id, variantId: variantRef } = variant.useParams()

      return <VariantScreen id={id} variantId={variantRef} />
    },
  })
  const router = createRouter({ routeTree: root.addChildren([index, create, edit, variant]), history: createMemoryHistory({ initialEntries: [initial] }), disableGlobalCatchBoundary: true })

  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )

  return router
}

export const writes = () => state.calls.filter(call => call.method !== 'GET')
