import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { GuestLanguageSwitch } from '@/components/layout/guest-language-switch'
import { LanguageNotice } from '@/components/layout/language-notice'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function renderAt(url: string, availableLanguages?: ('en' | 'de')[]) {
  const root = createRootRoute({
    component: () => (
      <LocaleProvider>
        <GuestLanguageSwitch />
        <LanguageNotice />
        <Outlet />
      </LocaleProvider>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/$lang/stories',
    loader: ({ params }) => params.lang === 'de' ? loadDictionary('de').then(() => ({ availableLanguages })) : { availableLanguages },
    component: () => null,
  })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [url] }) })

  render(<RouterProvider router={router} />)

  return router
}

beforeEach(() => {
  localStorage.clear()
})

describe('guest language control', () => {
  it('marks the URL language as pressed and switches with the other button', async () => {
    const router = renderAt('/en/stories')
    const group = await screen.findByRole('group', { name: en['shell.language.label'] })

    expect(group.querySelector('[aria-pressed="true"]')).toHaveTextContent('EN')
    await userEvent.click(screen.getByRole('button', { name: 'DE' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/de/stories'))
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('de'))
  })

  it('has the label and notice keys in both dictionaries', () => {
    for (const dictionary of [en, de]) {
      expect(dictionary['shell.language.label']).toBeTruthy()
      expect(dictionary['shell.notice.onlyEn']).toBeTruthy()
      expect(dictionary['shell.notice.onlyDe']).toBeTruthy()
    }
  })
})

describe('language notice', () => {
  it('names the language shown when the stored language has no version', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', ['en'])

    expect(await screen.findByRole('status')).toHaveTextContent(en['shell.notice.onlyEn'])
  })

  it('names German on a German-only page when the stored language is English', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    renderAt('/de/stories', ['de'])

    expect(await screen.findByRole('status')).toHaveTextContent(de['shell.notice.onlyDe'])
  })

  it('stays out when the stored language has a version', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', ['en', 'de'])
    await screen.findByRole('group')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the page has no loader data', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories')
    await screen.findByRole('group')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the loader does not know the page (empty list)', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', [])
    await screen.findByRole('group')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the stored language is English and the page is English', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    renderAt('/en/stories', ['en'])
    await screen.findByRole('group')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when nothing is stored, on a German-only page', async () => {
    renderAt('/de/stories', ['de'])
    await screen.findByRole('group')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
