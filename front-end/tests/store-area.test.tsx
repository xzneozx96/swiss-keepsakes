import { meSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'
import { Route as StoreRoute } from '@/routes/store'

// The real /store layout and OwnerStore redirects, with the HTTP answered here.
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const storeId = '0198a000-0000-7000-8000-000000000001'
type Status = 'invited' | 'onboarding' | 'live' | 'suspended'
const entry = (role: 'owner' | 'manager', status: Status) => ({ storeId, role, status })
const meBody = (stores: ReturnType<typeof entry>[]) => Response.json(meSchema.parse({ guestId: '0198a000-0000-7000-8000-0000000000f1', stores }))
const problem = (status: number) => Response.json(problemSchema.parse({ type: 'x', status, title: 'x', instance: '/x', requestId: 'req-1' }), { status })

let demo: ReturnType<typeof startDemo>
let answer: () => Response | Promise<Response>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  answer = () => meBody([])
  vi.stubGlobal('fetch', async () => answer())
  demo = startDemo()
  await demo.ready
})

/** `/store` is the real layout with a child; `/store/onboarding` is the real screen or a stub. */
function renderAt(path: string, { realOnboarding = false } = {}) {
  const root = createRootRoute({ component: Outlet, notFoundComponent: () => <p>No such page</p> })
  const store = createRoute({ getParentRoute: () => root, path: '/store', component: StoreRoute.options.component })
  const children = createRoute({ getParentRoute: () => store, path: '/', component: () => <p>Shell children</p> })
  const categories = createRoute({ getParentRoute: () => store, path: '/content/categories', component: () => <p>Categories page</p> })
  const onboarding = createRoute({
    getParentRoute: () => root,
    path: '/store/onboarding',
    component: realOnboarding ? OnboardingScreen : () => <p>Open your store stub</p>,
  })
  const signIn = createRoute({ getParentRoute: () => root, path: '/sign-in', component: () => <p>Sign-in screen</p> })
  const router = createRouter({
    routeTree: root.addChildren([store.addChildren([children, categories]), onboarding, signIn]),
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

  return router
}

describe('the /store area while the store is onboarding [E2.16][E2.3]', () => {
  it('shows the Owner of an onboarding store the store area with the menu, and a link to Open your store', async () => {
    answer = () => meBody([entry('owner', 'onboarding')])
    const router = renderAt('/store')

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store')
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    expect(await screen.findByText('Your store is not open for sale yet.')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('link', { name: 'Open your store' }))
    expect(await screen.findByText('Open your store stub')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store/onboarding')
  })

  it('shows a deeper store page, such as Content > Categories, the same way', async () => {
    answer = () => meBody([entry('owner', 'onboarding')])
    const router = renderAt('/store/content/categories')

    expect(await screen.findByText('Categories page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store/content/categories')
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })

  it('shows the shell to the Owner of a live store, with no link to Open your store', async () => {
    answer = () => meBody([entry('owner', 'live')])
    renderAt('/store')

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Open your store' })).not.toBeInTheDocument())
  })

  it('shows the shell to a Manager of an onboarding store, with no link to Open your store', async () => {
    answer = () => meBody([entry('manager', 'onboarding')])
    renderAt('/store')

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open your store' })).not.toBeInTheDocument()
  })

  it.each([401, 500])('shows the shell when GET /api/me answers %i', async (status) => {
    answer = () => problem(status)
    renderAt('/store')

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open your store' })).not.toBeInTheDocument()
  })
})

describe('the Open your store screen for someone who does not belong [E2.16][E2.3]', () => {
  it('sends the Owner of a live store to /store', async () => {
    answer = () => meBody([entry('owner', 'live')])
    const router = renderAt('/store/onboarding', { realOnboarding: true })

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store')
  })

  it('sends a Manager to /store', async () => {
    answer = () => meBody([entry('manager', 'onboarding')])
    const router = renderAt('/store/onboarding', { realOnboarding: true })

    expect(await screen.findByText('Shell children')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store')
  })

  it('shows the not-found state to a user with no store', async () => {
    answer = () => meBody([])
    const router = renderAt('/store/onboarding', { realOnboarding: true })

    expect(await screen.findByText('Open the link from your email')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store/onboarding')
  })

  it('sends a signed-out visitor to sign-in', async () => {
    answer = () => problem(401)
    const router = renderAt('/store/onboarding', { realOnboarding: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  })
})
