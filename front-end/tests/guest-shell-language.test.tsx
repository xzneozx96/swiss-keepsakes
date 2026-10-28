import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageButton } from '@/components/layout/language-button'
import { LanguageNotice } from '@/components/layout/language-notice'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function renderAt(url: string, availableLanguages?: ('en' | 'de')[]) {
  const root = createRootRoute({
    component: () => (
      <LocaleProvider>
        <LanguageButton tone="floating" />
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
  window.scrollTo = vi.fn()
  localStorage.clear()
})

describe('language button', () => {
  it('opens a sheet with both languages and the URL language checked', async () => {
    renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))

    expect(await screen.findByRole('dialog', { name: en['shell.language.title'] })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toHaveAttribute('aria-checked', 'false')
  })

  it('shows each language as one tall row, with a tick only on the current one', async () => {
    renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))

    const group = await screen.findByRole('radiogroup', { name: en['shell.language.title'] })
    const rows = within(group).getAllByRole('radio')
    expect(rows.map(r => r.textContent)).toEqual(['English', 'Deutsch'])
    for (const row of rows)
      expect(row).toHaveClass('min-h-12')
    expect(rows[0].querySelector('svg')).not.toBeNull()
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('switches with the other option, stores the choice and closes the sheet', async () => {
    const router = renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))
    await userEvent.click(await screen.findByRole('radio', { name: 'Deutsch' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/de/stories'))
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('de'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: de['shell.language.button'] })).toBeInTheDocument()
  })

  it('closes when the already checked language is tapped, without navigating', async () => {
    const router = renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))
    await userEvent.click(await screen.findByRole('radio', { name: 'English' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/en/stories')
  })

  it('closes on Escape and returns focus to the button', async () => {
    renderAt('/en/stories')
    const button = await screen.findByRole('button', { name: en['shell.language.button'] })

    await userEvent.click(button)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(button).toHaveFocus())
  })

  it('renders nothing without a URL language', async () => {
    const root = createRootRoute({
      component: () => (
        <LocaleProvider>
          <LanguageButton tone="floating" />
          <Outlet />
        </LocaleProvider>
      ),
    })
    const page = createRoute({ getParentRoute: () => root, path: '/account', component: () => <p>account</p> })
    const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ['/account'] }) })

    render(<RouterProvider router={router} />)
    await screen.findByText('account')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('has the language and notice keys in both dictionaries', () => {
    for (const dictionary of [en, de]) {
      expect(dictionary['shell.language.button']).toBeTruthy()
      expect(dictionary['shell.language.title']).toBeTruthy()
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
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the page has no loader data', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories')
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the loader does not know the page (empty list)', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', [])
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when the stored language is English and the page is English', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    renderAt('/en/stories', ['en'])
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays out when nothing is stored, on a German-only page', async () => {
    renderAt('/de/stories', ['de'])
    await screen.findByRole('button', { name: de['shell.language.button'] })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
