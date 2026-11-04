import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { MAX_TOUR_KEEPSAKES, TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'

const MONEY = /CHF|Fr\.|\d\.\d{2}/

const read = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/features/catalog/api/keepsakes', () => ({ fetchKeepsakeList: read.fn }))

function card(n: number, over: Record<string, unknown> = {}) {
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
    ...over,
  }
}

async function renderBlock(variant?: 'confirmation') {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify('en'))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/tours', component: () => <TourKeepsakes variant={variant} /> })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ['/tours'] }),
    disableGlobalCatchBoundary: true,
  })
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </QueryClientProvider>,
  )
  await vi.waitFor(() => expect(router.state.status).toBe('idle'))
  return container
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  read.fn.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('[E6.4] the tour keepsake block', () => {
  it('[AC31] AC-1 shows the first three of five published keepsakes, each linking to its page', async () => {
    read.fn.mockResolvedValue({ items: [1, 2, 3, 4, 5].map(n => card(n)) })
    await renderBlock()

    expect(await screen.findByText('Keepsake 1')).toBeInTheDocument()
    expect(MAX_TOUR_KEEPSAKES).toBe(3)
    const links = screen.getAllByRole('link')
    expect(links.map(l => l.getAttribute('href'))).toEqual(['/en/gifts/keepsake-1', '/en/gifts/keepsake-2', '/en/gifts/keepsake-3'])
    expect(screen.queryByText('Keepsake 4')).toBeNull()
    expect(read.fn).toHaveBeenCalledWith('en')
  })

  it('[AC31][AC54] AC-2 no price or CHF; a sold-out card is marked and still links', async () => {
    read.fn.mockResolvedValue({ items: [card(1), card(2, { soldOut: true }), card(3)] })
    await renderBlock()

    const sold = await screen.findByRole('link', { name: /Keepsake 2/ })
    expect(sold).toHaveTextContent('Sold out')
    expect(sold).toHaveAttribute('href', '/en/gifts/keepsake-2')
    expect(document.body.textContent).not.toMatch(MONEY)
  })

  it('[AC31] AC-3 an empty list draws nothing, heading included', async () => {
    read.fn.mockResolvedValue({ items: [] })
    const container = await renderBlock()

    await vi.waitFor(() => expect(read.fn).toHaveBeenCalled())
    await vi.waitFor(() => expect(container.querySelector('[data-skeleton="tour-keepsakes"]')).toBeNull())
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('[AC31] AC-4 pending shows three skeleton cards in the rail', async () => {
    read.fn.mockReturnValue(new Promise(() => {}))
    const container = await renderBlock()

    const skeleton = container.querySelector('[data-skeleton="tour-keepsakes"]')
    expect(skeleton).not.toBeNull()
    expect(skeleton?.querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('[AC31] AC-4 a failed read draws nothing and shows no error', async () => {
    read.fn.mockRejectedValue(new Error('down'))
    const container = await renderBlock()

    await vi.waitFor(() => expect(read.fn).toHaveBeenCalled())
    await vi.waitFor(() => expect(container.querySelector('[data-skeleton="tour-keepsakes"]')).toBeNull())
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('[E6.4] AC-5 the block source reads none of the demo keepsake hooks', () => {
    const source = readFileSync(join(import.meta.dirname, '..', 'src/features/tours/discovery/tour-keepsakes.tsx'), 'utf8')

    for (const demo of ['useProducts', 'useOrders', 'useProductCard', 'isPublished', 'isSoldOut'])
      expect(source).not.toContain(demo)
    expect(source).toContain('guestKeepsakeList')
  })
})
