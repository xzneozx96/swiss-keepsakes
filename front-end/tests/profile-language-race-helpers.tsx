/* eslint-disable react-refresh/only-export-components -- a test helper, not a hot-reloaded module */
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { rememberPublicPath } from '@/components/layout/last-public-path'
import { LocaleProvider, useLocale } from '@/contexts/locale-context'
import { ProfilePanel } from '@/features/account/components/profile-panel'

/** Another control that sets the language, as the language sheet does on a public page. */
function OtherLanguageControl({ to }: { to: 'en' | 'de' }) {
  const { setLanguage } = useLocale()

  return <button type="button" onClick={() => setLanguage(to)}>{`other ${to}`}</button>
}

export function renderProfile(other: 'en' | 'de') {
  const root = createRootRoute({ component: () => (
    <LocaleProvider>
      <OtherLanguageControl to={other} />
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

  return router
}

export const storedLanguage = () => localStorage.getItem('sk.language')
