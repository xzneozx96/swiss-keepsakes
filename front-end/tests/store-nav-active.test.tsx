import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

async function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/store/$',
    component: () => (
      <MerchantShell>
        <p>page</p>
      </MerchantShell>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
    disableGlobalCatchBoundary: true,
  })
  render(
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
  await screen.findAllByRole('link')
  const navs = [...document.querySelectorAll('nav')]
  const sidebar = navs.find(n => !n.className.includes('lg:hidden'))!
  const phone = navs.find(n => n.className.includes('lg:hidden'))!

  return {
    sidebar,
    phone,
    active: (nav: Element) =>
      Array.from(nav.querySelectorAll('a'))
        .filter(a => a.getAttribute('data-status') === 'active')
        .map(a => a.getAttribute('href')),
  }
}

describe('merchant navigation keeps a page active on its own screens', () => {
  it.each([
    ['place editor', '/store/content/places/01a18a53-4376-71e9-bbbd-ec5ead42dea6', '/store/content/places', '/store/content'],
    ['article editor', '/store/content/articles/a1', '/store/content', '/store/content/places'],
    ['gift editor', '/store/products/gifts/p1', '/store/products', '/store/products/pickup'],
    ['partner detail', '/store/partners/pt1', '/store/partners', '/store/partners/analytics'],
    ['order detail', '/store/orders/o1', '/store/orders', '/store/calendar'],
    ['partner analytics', '/store/partners/analytics', '/store/partners/analytics', '/store/partners'],
  ])('%s: only its own page is active', async (_name, path, on, off) => {
    const { sidebar, active } = await renderAt(path)

    expect(active(sidebar)).toEqual([on])
    expect(active(sidebar)).not.toContain(off)
  })

  it('phone tabs stay active on detail screens', async () => {
    const { phone, active } = await renderAt('/store/orders/o1')

    expect(active(phone)).toEqual(['/store/orders'])
  })
})
