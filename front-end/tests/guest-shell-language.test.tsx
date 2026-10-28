import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageButton } from '@/components/layout/language-button'
import { LanguageNotice } from '@/components/layout/language-notice'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function buildRouter(url: string, availableLanguages?: ('en' | 'de')[]) {
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

  return createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [url] }) })
}

function renderAt(url: string, availableLanguages?: ('en' | 'de')[]) {
  const router = buildRouter(url, availableLanguages)

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

  it('announces a popup dialog, and whether it is open', async () => {
    renderAt('/en/stories')
    const button = await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(button)
    await screen.findByRole('dialog')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'))
  })

  it('names the sheet close button from its own key, in English and German', async () => {
    expect(en['shell.language.close']).toBe('Close')
    expect(de['shell.language.close']).toBe('Schliessen')

    renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: en['shell.language.close'] })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('names the sheet close button in German on a German page', async () => {
    renderAt('/de/stories')
    await userEvent.click(await screen.findByRole('button', { name: de['shell.language.button'] }))
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: de['shell.language.close'] })).toBeInTheDocument()
  })

  it('returns focus to the button after Escape even when the click never focused it (Safari)', async () => {
    renderAt('/en/stories')
    const button = await screen.findByRole('button', { name: en['shell.language.button'] })

    expect(button).not.toHaveFocus()
    fireEvent.click(button)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(button))
  })

  it('closes when the backdrop is tapped, without switching', async () => {
    const router = renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))
    const dialog = await screen.findByRole('dialog')
    const backdrop = dialog.closest('[data-slot="drawer__backdrop"]') ?? dialog.parentElement!.parentElement!

    await userEvent.click(backdrop)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/en/stories')
  })

  it('shows each language as one tall row, with a tick only on the current one', async () => {
    renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))

    const group = await screen.findByRole('radiogroup', { name: en['shell.language.title'] })
    const rows = within(group).getAllByRole('radio')
    expect(rows.map(r => r.textContent)).toEqual(['English', 'Deutsch'])
    for (const row of rows)
      expect(row).toHaveClass('min-h-12')
    expect(within(rows[0]).getByTestId('language-tick')).toBeInTheDocument()
    expect(within(rows[1]).queryByTestId('language-tick')).toBeNull()
    expect(within(rows[1]).getByText('Deutsch')).toHaveAttribute('lang', 'de')
  })

  it('draws flat rows and an accent tick', async () => {
    renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))

    const group = await screen.findByRole('radiogroup', { name: en['shell.language.title'] })
    const [english] = within(group).getAllByRole('radio')
    expect(english.className).not.toMatch(/rounded|shadow|focus-ring|\bring/)
    expect(within(english).getByTestId('language-tick')).toHaveClass('text-accent')
  })

  it('moves focus with the arrow keys, wrapping, and keeps one tab stop on the checked row', async () => {
    const router = renderAt('/en/stories')
    await userEvent.click(await screen.findByRole('button', { name: en['shell.language.button'] }))

    const english = await screen.findByRole('radio', { name: 'English' })
    const deutsch = screen.getByRole('radio', { name: 'Deutsch' })
    expect(english).toHaveAttribute('tabindex', '0')
    expect(deutsch).toHaveAttribute('tabindex', '-1')

    english.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(deutsch).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(english).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(deutsch).toHaveFocus()
    // Arrows only move focus: selecting navigates, so it waits for Space or Enter.
    expect(router.state.location.pathname).toBe('/en/stories')
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
  it('keeps one polite live region in the page, and the text lands in that same region', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', ['en'])
    const region = await screen.findByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    await waitFor(() => expect(region).toHaveTextContent(en['shell.notice.onlyEn']))
    expect(screen.getByRole('status')).toBe(region)
  })

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
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('stays out when the page has no loader data', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories')
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('stays out when the loader does not know the page (empty list)', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories', [])
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('stays out when the stored language is English and the page is English', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    renderAt('/en/stories', ['en'])
    await screen.findByRole('button', { name: en['shell.language.button'] })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('stays out when nothing is stored, on a German-only page', async () => {
    renderAt('/de/stories', ['de'])
    await screen.findByRole('button', { name: de['shell.language.button'] })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
