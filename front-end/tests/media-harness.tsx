import { mediaItemSchema, mediaListSchema, mediaUsesSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { MediaScreen } from '@/features/media/components/media-screen'
import { parseMediaSearch } from '@/features/media/lib/search-params'
import { state } from './keepsakes-harness'

export { problem, setUpHarness, state, storeId, writes } from './keepsakes-harness'

// The real library screen, hooks and DataClient, with the HTTP answered by the test.
export const photoId = '0198a000-0000-7000-8000-0000000000e1'
export const other = '0198a000-0000-7000-8000-0000000000e2'
export const third = '0198a000-0000-7000-8000-0000000000e3'

export function item(over: Record<string, unknown> = {}) {
  return mediaItemSchema.parse({
    id: photoId,
    kind: 'image',
    status: 'ready',
    contentType: 'image/jpeg',
    byteSize: 3_200_000,
    width: 4032,
    height: 3024,
    publicUrl: 'https://storage.test/media/s/p/original.jpg',
    variants: [{ width: 320, url: 'https://storage.test/media/s/p/w320.webp' }, { width: 640, url: 'https://storage.test/media/s/p/w640.webp' }],
    name: 'Kapellbruecke-Sunrise.JPG',
    fileName: 'IMG_4032.JPG',
    alt: { en: 'The Chapel Bridge at sunrise' },
    durationSeconds: null,
    version: 1,
    createdAt: '2026-10-01T10:00:00.000Z',
    usage: { pages: 3, published: 2, drafts: 1 },
    ...over,
  })
}

export function page(items: Record<string, unknown>[], over: Record<string, unknown> = {}) {
  return mediaListSchema.parse({
    items,
    total: items.length,
    page: 1,
    pageSize: 24,
    kinds: { image: items.length, audio: 2, pdf: 1 },
    uses: { unused: 1, drafts: 1, published: 1 },
    statuses: { processing: 0, ready: items.length, retired: 0 },
    ...over,
  })
}

export function uses(over: Record<string, unknown> = {}) {
  return mediaUsesSchema.parse({
    published: [
      { pageKind: 'story', pageId: other, language: 'en', title: { en: 'Lucerne in a day' }, role: 'cover', published: true, thumbnailUrl: 'https://storage.test/t.webp' },
      { pageKind: 'tour', pageId: third, language: null, title: { en: 'Old town walk' }, role: 'cover', published: true, thumbnailUrl: null },
    ],
    drafts: [{ pageKind: 'keepsake', pageId: photoId, language: null, title: { en: 'Fondue set' }, role: 'photo', published: false, thumbnailUrl: null }],
    ...over,
  })
}

export function renderMedia(initial = '/store/content/media') {
  const root = createRootRoute({ component: Outlet })
  const library = createRoute({
    getParentRoute: () => root,
    path: '/store/content/media',
    validateSearch: (search: Record<string, unknown>) => parseMediaSearch(search),
    component: function Library() {
      const search = library.useSearch()
      const navigate = library.useNavigate()

      return <MediaScreen search={search} onSearch={patch => void navigate({ search: previous => ({ ...previous, ...patch }), replace: true })} />
    },
  })
  const router = createRouter({ routeTree: root.addChildren([library]), history: createMemoryHistory({ initialEntries: [initial] }), disableGlobalCatchBoundary: true })

  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={state.demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )

  return router
}
