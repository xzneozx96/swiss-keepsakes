import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'
import { HomeEndingBlock } from '@/features/home/components/home-ending-block'
import { en } from '@/i18n/en'

vi.mock('@/lib/api-mode', () => ({ apiEnabled: false }))
vi.mock('@/features/catalog/api/keepsakes', () => ({ fetchKeepsakeList: vi.fn() }))

describe('[E4.13][AC95] the demo build of the home', () => {
  it('sends no keepsake request and shows no error block in the ending (no API in the demo)', async () => {
    const root = createRootRoute({ component: () => (
      <QueryClientProvider client={new QueryClient()}>
        <LocaleProvider>
          <Outlet />
        </LocaleProvider>
      </QueryClientProvider>
    ) })
    const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: HomeEndingBlock })
    const others = ['gifts', 'gifts/$slug', 'stories/$slug'].map(path => createRoute({ getParentRoute: () => root, path: `/$lang/${path}`, component: () => null }))
    const router = createRouter({ routeTree: root.addChildren([home, ...others]), history: createMemoryHistory({ initialEntries: ['/en'] }) })

    render(<RouterProvider router={router} />)
    await screen.findByRole('heading', { name: en['home.victorinox.title'] })

    expect(fetchKeepsakeList).not.toHaveBeenCalled()
    expect(screen.queryByText(en['homePage.ending.failed'])).toBeNull()
  })
})
