import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { rememberPublicPath } from '@/components/layout/last-public-path'
import { LocaleProvider } from '@/contexts/locale-context'
import { ProfilePanel } from '@/features/account/components/profile-panel'

// The German messages fail to load, as on a lost connection. The module exists and fails on read, so every
// import fails the same way. A factory that throws does not: vitest rejects only the first of several
// imports made while it is still running, and the later ones get an empty module.
vi.mock('@/i18n/de', () => ({
  get de(): never {
    throw new Error('chunk failed')
  },
}))

describe('profile language change', () => {
  it('stays on the profile when the new language cannot be loaded', async () => {
    const root = createRootRoute({ component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ) })
    const account = createRoute({ getParentRoute: () => root, path: '/account', component: ProfilePanel })
    const gifts = createRoute({ getParentRoute: () => root, path: '/$lang/gifts', component: () => null })
    const router = createRouter({
      routeTree: root.addChildren([account, gifts]),
      history: createMemoryHistory({ initialEntries: ['/account?tab=profile'] }),
    })

    rememberPublicPath('/en/gifts')
    render(<RouterProvider router={router} />)
    await userEvent.click(await screen.findByText('Deutsch'))
    await new Promise(resolve => setTimeout(resolve, 100))

    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
  })
})
