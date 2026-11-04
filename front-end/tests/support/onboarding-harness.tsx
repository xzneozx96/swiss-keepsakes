import type { Guest } from '@sk/domain/orders'

import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, render } from '@testing-library/react'

import { LocaleProvider } from '@/contexts/locale-context'
import { AccountHub } from '@/features/account/components/account-hub'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { OnboardingHost } from '@/features/onboarding/components/onboarding-host'
import { resetAnswersStoreForTests } from '@/features/onboarding/lib/answers-store'
import { resetOpenerForTests } from '@/features/onboarding/lib/opener'
import { resetVisitForTests } from '@/features/onboarding/lib/visit'

export const guest = { id: 'g-anna', name: 'Anna', email: 'anna@example.com' } as Guest

/** Drops the page's memory copies, as a reload does. Storage stays. */
export function reloadPage() {
  resetAnswersStoreForTests()
  resetVisitForTests()
  resetOpenerForTests()
}

/** A clean browser: no storage, no memory copies, no referrer. */
export function freshBrowser(referrer = '') {
  localStorage.clear()
  sessionStorage.clear()
  reloadPage()
  Object.defineProperty(document, 'referrer', { configurable: true, get: () => referrer })
}

/** Lets lazy chunks and effects settle, for a test that asserts nothing opened. */
export async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 60))
  })
}

/** The guest shell in miniature: the host beside the routes the host reads (home, story, stories, Account, private screens). */
export async function renderApp(url: string, { stories }: { stories?: () => React.JSX.Element } = {}) {
  const demo = startDemo()

  await demo.ready
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
          <LocaleProvider>
            <DemoProvider store={demo.store}>
              <OnboardingHost />
              <Outlet />
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
  const page = (path: string, component: () => React.JSX.Element) => createRoute({ getParentRoute: () => root, path, component })
  const router = createRouter({
    routeTree: root.addChildren([
      page('/$lang', () => (
        <main>
          <h1>Home page</h1>
          <button type="button" data-onboarding-return>Sort for my trip</button>
          <button type="button">Other control</button>
          <Link params={{ lang: 'en' }} to="/$lang/stories">Stories</Link>
        </main>
      )),
      page('/$lang/stories/$slug', () => <h1>A story</h1>),
      page('/$lang/stories', stories ?? (() => <Link params={{ lang: 'en' }} to="/$lang">Home</Link>)),
      page('/account', () => <AccountHub guest={guest} onSignOut={() => {}} />),
      page('/store', () => <h1>Store</h1>),
      page('/sign-in', () => <h1>Sign in</h1>),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  window.scrollTo = () => {}
  render(<RouterProvider router={router} />)
  await router.load()
  await settle()

  return { router }
}
