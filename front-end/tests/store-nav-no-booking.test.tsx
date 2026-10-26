import type { Guest } from '@sk/domain/orders'

import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { SECTION_PAGES } from '@/components/layout/section-pages'
import { LocaleProvider } from '@/contexts/locale-context'
import { AccountHub } from '@/features/account/components/account-hub'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { REQUEST_TABS } from '@/features/requests/merchant/lib/search-params'
import { en } from '@/i18n/en'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

async function renderAt(path: string, component: () => React.ReactNode) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path, component })
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
}

const hidden = /bookings|requests\/private|products\/categories/

describe('store menus', () => {
  it('[E3.1][AC50] store menus show no booking path', async () => {
    await renderAt('/store', () => (
      <MerchantShell>
        <p>page</p>
      </MerchantShell>
    ))
    await userEvent.click(screen.getByRole('button', { name: en['nav.more'] }))
    const hrefs = screen.getAllByRole('link', { hidden: true }).map(a => a.getAttribute('href') ?? '')
    expect(hrefs.length).toBeGreaterThan(10)
    expect(hrefs.filter(h => hidden.test(h))).toEqual([])
    expect(SECTION_PAGES.requests.map(p => p.id)).not.toContain('private')
    expect(REQUEST_TABS).not.toContain('private')
    expect(document.body.textContent).not.toContain(en['merchantRequests.tab.private'])
    expect(document.body.textContent).not.toMatch(/Bookings/)
  })

  it('[E3.1][AC50] account hub lists no bookings for a guest who has one', async () => {
    const guest = { id: 'g-anna', name: 'Anna', email: 'anna@example.com' } as Guest
    await renderAt('/account', () => <AccountHub guest={guest} onSignOut={() => {}} />)
    expect(document.body.textContent).not.toContain(en['account.section.bookings'])
    expect(document.querySelectorAll('a[href*="bookings"]')).toHaveLength(0)
  })
})
