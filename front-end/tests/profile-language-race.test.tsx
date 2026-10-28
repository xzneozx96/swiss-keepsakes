import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rememberPublicPath } from '@/components/layout/last-public-path'
import { LocaleProvider, useLocale } from '@/contexts/locale-context'
import { ProfilePanel } from '@/features/account/components/profile-panel'

// The German messages arrive when the test lets them: a slow connection.
const gate = vi.hoisted(() => {
  let release = () => {}
  const opened = new Promise<void>((resolve) => {
    release = resolve
  })

  return { opened, release }
})

vi.mock('@/i18n/de', async (importActual) => {
  await gate.opened

  return importActual()
})

/** Another control that sets the language, as the language sheet does on a public page. */
function OtherLanguageControl({ to }: { to: 'en' | 'de' }) {
  const { setLanguage } = useLocale()

  return <button type="button" onClick={() => setLanguage(to)}>{`other ${to}`}</button>
}

function renderProfile(other: 'en' | 'de') {
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

const storedLanguage = () => localStorage.getItem('sk.language')

describe('profile language change, last tap wins', () => {
  beforeEach(() => localStorage.clear())

  it('a slow German load followed by a fast English tap ends in English, never on /de', async () => {
    const router = renderProfile('en')

    await userEvent.click(await screen.findByText('Deutsch'))
    await userEvent.click(screen.getByRole('button', { name: 'other en' }))
    await waitFor(() => expect(storedLanguage()).toBe(JSON.stringify('en')))

    await act(async () => {
      gate.release()
      // The German messages are in (the load the panel waited for is done), then the panel's own follow-up has had its turn.
      await import('@/i18n/de')
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(router.state.location.pathname).not.toMatch(/^\/de/)
    expect(storedLanguage()).toBe(JSON.stringify('en'))
  })

  it('an English tap followed by a German tap ends in German on the /de address', async () => {
    const router = renderProfile('en')

    await userEvent.click(await screen.findByRole('button', { name: 'other en' }))
    await userEvent.click(await screen.findByText('Deutsch'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/de/gifts'))
    expect(storedLanguage()).toBe(JSON.stringify('de'))
  })
})
