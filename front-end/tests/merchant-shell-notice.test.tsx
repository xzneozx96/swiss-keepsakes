import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
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

async function renderShop(notice?: React.ReactNode) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/store',
    component: () => (
      <MerchantShell notice={notice}>
        <MerchantBackBar label="Back" status={<span>Published</span>} title="Chapel Bridge" to="/store" />
        <p>page</p>
      </MerchantShell>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ['/store'] }),
    disableGlobalCatchBoundary: true,
  })
  render(
    <DataClientProvider client={demo.dataClient}>
      <LocaleProvider>
        <DemoProvider store={demo.store}>
          <RouterProvider router={router} />
        </DemoProvider>
      </LocaleProvider>
    </DataClientProvider>,
  )
  await screen.findByText('page')
}

describe('merchant shell notice and phone bar', () => {
  it('renders the notice above the phone bar slot, which comes before the page', async () => {
    await renderShop(<p>Store not open</p>)
    const notice = screen.getByText('Store not open')
    const slot = document.querySelector('[data-merchant-bar-slot]')!

    expect(notice.closest('[data-merchant-notice]')!.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(slot.compareDocumentPosition(screen.getByText('page')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(notice.closest('main')).toBeNull()
  })

  it('without a notice the notice slot stays empty (and hidden)', async () => {
    await renderShop()

    expect(document.querySelector('[data-merchant-notice]')).toBeEmptyDOMElement()
  })

  it('the back bar shows the title and the status chip in its slot', async () => {
    await renderShop()
    const slot = document.querySelector('[data-merchant-bar-slot]')!

    expect(slot).toHaveTextContent('Chapel Bridge')
    expect(slot).toHaveTextContent('Published')
  })
})
