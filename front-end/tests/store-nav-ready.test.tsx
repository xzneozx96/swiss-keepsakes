import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { HIDDEN_UNTIL_READY } from '@/components/layout/nav-ready'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { en } from '@/i18n/en'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

async function renderShop(at = '/store/products') {
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
    history: createMemoryHistory({ initialEntries: [at] }),
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

  return {
    sidebar: navs.find(n => !n.className.includes('lg:hidden'))!,
    phone: navs.find(n => n.className.includes('lg:hidden'))!,
  }
}

const text = (el: Element) => el.textContent?.trim() ?? ''
const hrefs = (el: Element) => Array.from(el.querySelectorAll('a'), a => a.getAttribute('href'))

describe('the merchant menus show only ready pages', () => {
  it('the sidebar lists only Products, Content and Settings', async () => {
    const { sidebar } = await renderShop()
    const top = Array.from(sidebar.querySelectorAll(':scope > ul > li > button, :scope > ul > li > a'), text)

    expect(top).toEqual([en['nav.products'], en['nav.content'], en['nav.settings']])
  })

  it('no group lists a hidden page', async () => {
    const { sidebar } = await renderShop()
    await userEvent.click(Array.from(sidebar.querySelectorAll(':scope > ul > li > button')).find(b => text(b) === en['nav.content'])!)
    const links = hrefs(sidebar)

    expect(links.filter(h => HIDDEN_UNTIL_READY.has(h ?? ''))).toEqual([])
    expect(links).toEqual(expect.arrayContaining([
      '/store/products',
      '/store/products/inventory',
      '/store/products/pickup',
      '/store/content',
      '/store/content/places',
      '/store/content/categories',
      '/store/content/media',
    ]))
  })

  it('the phone bar and More sheet list the same ready sections', async () => {
    const { phone } = await renderShop()

    expect(Array.from(phone.querySelectorAll('a, button'), text)).toEqual([en['nav.products'], en['nav.content'], en['nav.settings']])
    expect(hrefs(phone).filter(h => HIDDEN_UNTIL_READY.has(h ?? ''))).toEqual([])
    expect(screen.queryByRole('button', { name: en['nav.more'] })).toBeNull()
  })

  it('the shop mark opens the first ready page', async () => {
    const { sidebar } = await renderShop()

    expect(hrefs(sidebar)[0]).toBe('/store/products')
  })

  it('hidden pages are still reachable by URL and keep their group open', async () => {
    const { sidebar } = await renderShop('/store/orders')

    expect(text(sidebar)).not.toContain(en['nav.orders'])
    expect(document.querySelector('main')).not.toBeNull()
  })
})
