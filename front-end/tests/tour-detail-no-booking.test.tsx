import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { TourDetailPage } from '@/features/tours/discovery'
import { tourDiscoveryEn as discovery } from '@/features/tours/discovery/messages'
import { tourDiscoveryDe } from '@/features/tours/discovery/messages.de'

const slug = 'lucerne-the-things-that-remain'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

async function renderTour(language = 'en') {
  await loadDictionary('de')
  localStorage.setItem('sk.language', JSON.stringify(language))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/tours/$slug', component: () => <TourDetailPage slug={slug} /> })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [`/tours/${slug}`] }),
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
  await screen.findByRole('heading', { level: 1 })
}

describe('tour detail page', () => {
  it('[E3.1][AC50] tour page shows no booking entry', async () => {
    await renderTour()
    expect(document.querySelectorAll('a[href*="/book"]')).toHaveLength(0)
    expect(document.querySelectorAll('a[href*="private-tour"]')).toHaveLength(0)
    const choose = discovery['tourDiscovery.choose']
    const review = discovery['tourDiscovery.review'].split(' ·')[0]
    for (const button of screen.queryAllByRole('button')) {
      const name = button.getAttribute('aria-label') ?? button.textContent ?? ''
      expect(name.trim()).not.toBe(choose)
      expect(name.trim().startsWith(review)).toBe(false)
    }
  })

  it.each(['en', 'de'] as const)('[E3.1][AC50] tour page shows no price, departure, seat or payment text (%s)', async (language) => {
    await renderTour(language)
    const messages = language === 'en' ? discovery : tourDiscoveryDe
    const text = document.body.textContent ?? ''
    const banned = [
      messages['tourDiscovery.prices'],
      messages['tourDiscovery.noSeat'],
      messages['tourDiscovery.policy.variesShort'],
      messages['tourDiscovery.policyShort.full'],
      messages['tourDiscovery.policyShort.deposit'],
      messages['tourDiscovery.policyShort.later'],
      messages['tourDiscovery.ages.range'].replace('{from}', '0').replace('{to}', '5'),
      'CHF 89.00',
      'CHF 45.00',
      'CHF 0.00',
    ]
    for (const needle of banned) expect(text).not.toContain(needle)
    expect(screen.queryByText(messages['tourDiscovery.payment'], { exact: true })).toBeNull()
  })
})
