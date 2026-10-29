import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GuestShell } from '@/components/layout/guest-shell'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

vi.mock('@/components/background-music', () => ({ BackgroundMusic: () => null }))

let demo: ReturnType<typeof startSeedDemo>

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn()
  demo = startSeedDemo()
})

async function renderShell(url: string) {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
          <LocaleProvider>
            <DemoProvider store={demo.store}>
              <GuestShell>
                <Outlet />
              </GuestShell>
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
  const page = (path: string) => createRoute({
    getParentRoute: () => root,
    path,
    loader: ({ params }) => (params as { lang?: string }).lang === 'de' ? loadDictionary('de') : undefined,
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren(['/$lang', '/$lang/gifts', '/$lang/map', '/$lang/plan', '/account'].map(page)),
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  render(<RouterProvider router={router} />)

  return await screen.findByRole('navigation', { name: /Main|Hauptnavigation/ })
}

describe('[E4.6][G-S5-MAPTAB] the Map tab replaces the Tours tab', () => {
  it('puts Map in the slot Tours had, between the assistant and Account, and no Tours tab remains', async () => {
    const nav = await renderShell('/en')
    const links = within(nav).getAllByRole('link')

    expect(links.map(link => link.textContent.trim())).toEqual([en['nav.explore'], en['nav.gifts'], en['nav.assistant'], en['nav.map'], en['nav.account']])
    expect(within(nav).queryByRole('link', { name: en['nav.tours'] })).toBeNull()
    expect(within(nav).getByRole('link', { name: en['nav.map'] })).toHaveAttribute('href', '/en/map')
  })

  it('marks Map as the current tab on the map page', async () => {
    const nav = await renderShell('/en/map')

    expect(within(nav).getByRole('link', { name: en['nav.map'] })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: en['nav.explore'] })).not.toHaveAttribute('aria-current')
  })

  it('writes Karte and keeps the language prefix on a German page', async () => {
    const nav = await renderShell('/de/map')

    expect(de['nav.map']).toBe('Karte')
    expect(within(nav).getByRole('link', { name: de['nav.map'] })).toHaveAttribute('href', '/de/map')
    expect(within(nav).getByRole('link', { name: de['nav.map'] })).toHaveAttribute('aria-current', 'page')
  })
})
