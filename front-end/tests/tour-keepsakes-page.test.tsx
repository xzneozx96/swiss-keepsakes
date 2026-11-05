import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { TourDetailPage } from '@/features/tours/discovery'
import { routeTree } from '@/routeTree.gen'

const read = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/features/catalog/api/keepsakes', async importOriginal => ({ ...await importOriginal<typeof import('@/features/catalog/api/keepsakes')>(), loadKeepsakesPage: read.fn }))

const slug = 'lucerne-the-things-that-remain'
const BLOCK = '[aria-labelledby="tour-keepsakes-page"]'

// React numbers its generated ids (react-aria, icon gradients) per render, so two renders differ in them alone.
const stable = (html: string) => html.replace(/_r_\w+_/g, '_r_')

function card(n: number) {
  return {
    id: crypto.randomUUID(),
    slug: `keepsake-${n}`,
    name: `Keepsake ${n}`,
    cover: null,
    soldOut: false,
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en', 'de'],
  }
}

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  read.fn.mockReset()
  demo = startDemo()
  await demo.ready
})

async function renderTour() {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify('en'))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/tours/$slug', component: () => <TourDetailPage slug={slug} /> })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [`/tours/${slug}`] }),
    disableGlobalCatchBoundary: true,
  })
  const { container } = render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { level: 1 })
  // The itinerary loads in the browser only; the page is whole when it has.
  await vi.waitFor(() => expect(container.querySelector('.tour-itinerary')).not.toBeNull(), { timeout: 10_000 })

  return container
}

describe('[E6.4] the keepsake block on a tour page', () => {
  it('[AC31] AC-1 each card links to a path that a real route answers, so it is not a 404', async () => {
    read.fn.mockResolvedValue({ items: [1, 2, 3, 4, 5].map(card) })
    const container = await renderTour()
    await screen.findByText('Keepsake 1')

    const router = createRouter({ routeTree })
    const hrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>(`${BLOCK} a`), link => link.getAttribute('href')!)

    expect(hrefs).toEqual(['/en/gifts/keepsake-1', '/en/gifts/keepsake-2', '/en/gifts/keepsake-3'])
    for (const href of hrefs) {
      const matches = router.matchRoutes(href)

      expect(matches.at(-1)?.routeId, href).toBe('/_guest/$lang/gifts/$slug')
      expect(matches.at(-1)?.params).toMatchObject({ lang: 'en', slug: href.split('/').at(-1) })
    }
  })

  it('[AC31] AC-3 with no keepsake published the block is gone and the rest of the page is what it is with keepsakes', async () => {
    read.fn.mockResolvedValue({ items: [1, 2, 3].map(card) })
    const withKeepsakes = await renderTour()
    await screen.findByText('Keepsake 1')
    withKeepsakes.querySelector(BLOCK)?.remove()
    const rest = withKeepsakes.innerHTML
    cleanup()
    // A new store and cache, or the empty read would show the first read's cards while it loads.
    demo = startDemo()
    await demo.ready

    read.fn.mockResolvedValue({ items: [] })
    const empty = await renderTour()
    await vi.waitFor(() => expect(read.fn).toHaveBeenCalled())
    await vi.waitFor(() => expect(empty.querySelector('[data-skeleton="tour-keepsakes"]')).toBeNull())

    expect(empty.querySelector(BLOCK)).toBeNull()
    expect(stable(empty.innerHTML)).toBe(stable(rest))
  })
})
