import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

// These tests check the menu's structure with every page listed; store-nav-ready.test.tsx covers the real hidden list.
vi.mock('@/components/layout/nav-ready', () => ({
  HIDDEN_UNTIL_READY: new Set<string>(),
  isReady: () => true,
}))

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

async function renderShop(language: 'en' | 'de', at = '/store') {
  if (language === 'de') {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
  }
  const root = createRootRoute({ component: Outlet })
  const pages = ['/store', '/store/products/inventory', '/store/products/inventory/$skuId'].map(path => createRoute({
    getParentRoute: () => root,
    path,
    component: () => (
      <MerchantShell>
        <p>page</p>
      </MerchantShell>
    ),
  }))
  const router = createRouter({
    routeTree: root.addChildren(pages),
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
  const sidebar = navs.find(n => !n.className.includes('lg:hidden'))!
  const phone = navs.find(n => n.className.includes('lg:hidden'))!

  return { sidebar, phone }
}

const text = (el: Element) => el.textContent?.trim() ?? ''

describe.each([
  { language: 'en', dict: en, labels: ['Dashboard', 'Operations', 'Products', 'Partners', 'Content', 'Settings'], gone: ['Marketing', 'Bookings'] },
  { language: 'de', dict: de, labels: ['Dashboard', 'Tagesgeschäft', 'Produkte', 'Partner', 'Inhalte', 'Einstellungen'], gone: ['Marketing', 'Buchungen'] },
] as const)('merchant navigation groups ($language)', ({ language, dict, labels, gone }) => {
  it(`[E4.1][AC50] sidebar lists ${labels.join(', ')}`, async () => {
    const { sidebar } = await renderShop(language)
    const top = Array.from(sidebar.querySelectorAll(':scope > ul > li > button, :scope > ul > li > a'), text)

    expect(top).toEqual(labels)
    for (const word of gone)
      expect(text(sidebar)).not.toContain(word)
  })

  it('[E4.1][AC50] phone bar reads Dashboard, Operations, Calendar, More', async () => {
    const { phone } = await renderShop(language)
    const items = Array.from(phone.querySelectorAll('a, button'), text)

    expect(items).toEqual([dict['nav.today'], dict['nav.operations'], dict['nav.calendar'], dict['nav.more']])
    expect(phone.querySelectorAll('a')[1].getAttribute('href')).toBe('/store/orders')
  })

  it('[E4.1][AC50] the More sheet lists the other sections', async () => {
    const { phone } = await renderShop(language)
    await userEvent.click(phone.querySelector('button')!)
    const sheet = screen.getAllByRole('link', { hidden: true }).filter(a => !phone.contains(a) && !a.closest('aside'))
    const names = sheet.map(text)

    expect(names).toEqual([
      dict['nav.products'],
      dict['nav.partners'],
      dict['nav.content'],
      dict['nav.requests'],
      dict['nav.reports'],
      dict['nav.settings'],
    ])
    for (const word of gone)
      expect(names).not.toContain(word)
  })

  it('[E4.18][AC87] the Content menu lists Categories before Analytics, under its own label', async () => {
    const { sidebar } = await renderShop(language)
    const content = Array.from(sidebar.querySelectorAll(':scope > ul > li > button'), el => el).find(el => text(el) === dict['nav.content'])!

    await userEvent.click(content)
    const links = Array.from(sidebar.querySelectorAll('a'))
    const hrefs = links.map(a => a.getAttribute('href'))
    const link = links.find(a => a.getAttribute('href') === '/store/content/categories')

    expect(link && text(link)).toBe(dict['merchantContent.tab.categories'])
    expect(hrefs.indexOf('/store/content/categories')).toBeGreaterThan(hrefs.indexOf('/store/content/reviews'))
    expect(hrefs.indexOf('/store/content/categories')).toBeLessThan(hrefs.indexOf('/store/content/analytics'))
  })

  it('[E6.3][AC05][AC53] AC-1 [E6.1][nav] the Products menu links Keepsakes, Inventory and Pickup points', async () => {
    const { sidebar } = await renderShop(language)
    const products = Array.from(sidebar.querySelectorAll(':scope > ul > li > button'), el => el).find(el => text(el) === dict['nav.products'])!

    await userEvent.click(products)
    const links = Array.from(sidebar.querySelectorAll('a')).filter(a => a.getAttribute('href')?.startsWith('/store/products'))

    expect(links.map(a => [a.getAttribute('href'), text(a)])).toEqual([
      ['/store/products', dict['products.tab.gifts']],
      ['/store/products/inventory', dict['inventory.nav']],
      ['/store/products/pickup', dict['products.tab.pickup']],
    ])
  })

  it.each(['/store/products/inventory', '/store/products/inventory/0198a000-0000-7000-8000-000000000101'])('[E6.3][AC05][AC53] AC-1 Inventory is the highlighted page of Products on %s', async (path) => {
    const { sidebar } = await renderShop(language, path)
    const links = Array.from(sidebar.querySelectorAll('a')).filter(a => a.getAttribute('href')?.startsWith('/store/products'))

    expect(links.filter(a => a.getAttribute('data-status') === 'active').map(text)).toEqual([dict['inventory.nav']])
  })

  it('[E4.1][AC50] no menu link is a booking path or a raw key', async () => {
    const { phone } = await renderShop(language)
    await userEvent.click(phone.querySelector('button')!)
    const links = screen.getAllByRole('link', { hidden: true })

    expect(links.filter(a => /\/bookings(?:\/|$)/.test(a.getAttribute('href') ?? ''))).toEqual([])
    expect(links.filter(a => /^(?:nav|sectionPages)\./.test(text(a)))).toEqual([])
  })
})
