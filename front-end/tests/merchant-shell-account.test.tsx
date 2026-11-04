import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'

const account = vi.hoisted(() => ({ value: { loading: false, name: 'Anna Keller', role: 'owner' } as { loading: boolean, name: string, role?: string } }))
const out = vi.hoisted(() => ({ pending: false, signOutThen: vi.fn(), signOut: vi.fn() }))

vi.mock('@/features/stores/hooks/use-staff-account', () => ({ useStaffAccount: () => account.value }))
vi.mock('@/features/auth/hooks/use-sign-out', () => ({ useSignOut: () => out }))

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  out.pending = false
  out.signOutThen.mockReset()
  account.value = { loading: false, name: 'Anna Keller', role: 'owner' }
  demo = startDemo()
  await demo.ready
})

async function renderShop() {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/store', component: () => (
    <MerchantShell>
      <p>page</p>
    </MerchantShell>
  ) })
  const signIn = createRoute({ getParentRoute: () => root, path: '/sign-in', component: () => <p>sign-in page</p> })
  const router = createRouter({
    routeTree: root.addChildren([page, signIn]),
    history: createMemoryHistory({ initialEntries: ['/store'] }),
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
  await screen.findByText('page')

  return router
}

describe('merchant sidebar account block', () => {
  it('shows the signed-in name and Owner, never the demo name', async () => {
    await renderShop()
    const aside = document.querySelector('aside')!

    expect(aside).toHaveTextContent('Anna Keller')
    expect(aside).toHaveTextContent('Owner')
    expect(aside).not.toHaveTextContent('Sonja')
  })

  it('shows Store Manager for a Manager', async () => {
    account.value = { loading: false, name: 'Lukas M', role: 'manager' }
    await renderShop()

    expect(document.querySelector('aside')).toHaveTextContent('Store Manager')
  })

  it('shows a skeleton and no name while the session loads', async () => {
    account.value = { loading: true, name: '' }
    await renderShop()
    const aside = document.querySelector('aside')!

    expect(aside.querySelector('[data-slot="skeleton"], .skeleton')).not.toBeNull()
    expect(aside).not.toHaveTextContent('Sonja')
  })

  it('signs out through the hook and lands on the sign-in page', async () => {
    out.signOutThen.mockImplementation((done: () => void) => done())
    const router = await renderShop()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  })

  it('stays on the page when the sign out does not complete', async () => {
    const router = await renderShop()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(out.signOutThen).toHaveBeenCalledOnce()
    expect(router.state.location.pathname).toBe('/store')
  })

  it('disables the button while the sign out is pending', async () => {
    out.pending = true
    await renderShop()

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled()
  })
})
