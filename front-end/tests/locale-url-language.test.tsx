import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useRouterState } from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { loadDictionary, LocaleOverride, LocaleProvider, useLocale } from '@/contexts/locale-context'

function Probe() {
  const { language, setLanguage, t } = useLocale()
  const href = useRouterState({ select: state => state.location.href })

  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="href">{href}</p>
      <p data-testid="copy">{t('notFound.message')}</p>
      {/* Stands in for a shared component that builds its link from the language. */}
      <a data-testid="shared-link" href={`/${language}/stories`}>stories</a>
      <button type="button" onClick={() => setLanguage('de')}>de</button>
      <button type="button" onClick={() => setLanguage('en')}>en</button>
    </div>
  )
}

function renderAt(url: string, children: React.ReactNode = <Probe />) {
  const root = createRootRoute({
    component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ),
  })
  const page = (path: string) => createRoute({ getParentRoute: () => root, path, loader: ({ params }) => (params as { lang?: string }).lang === 'de' ? loadDictionary('de').then(() => null) : null, component: () => children })
  const router = createRouter({
    routeTree: root.addChildren([page('/$lang/stories'), page('/cart')]),
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  render(<RouterProvider router={router} />)

  return router
}

const cookie = () => document.cookie

beforeEach(() => {
  localStorage.clear()
  document.cookie = 'sk_lang=; Max-Age=0; Path=/'
  document.documentElement.lang = ''
})

describe('page language follows the URL', () => {
  it('uses the URL language on a prefixed page and leaves the stored one alone', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/en/stories')

    expect(await screen.findByTestId('language')).toHaveTextContent('en')
    expect(screen.getByTestId('shared-link')).toHaveAttribute('href', '/en/stories')
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('de'))
  })

  it('gives shared components the URL language on /de with stored en', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    renderAt('/de/stories')

    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('de'))
    expect(screen.getByTestId('shared-link')).toHaveAttribute('href', '/de/stories')
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('en'))
    expect(document.documentElement.lang).toBe('de')
  })

  it('uses the stored language on an unprefixed page', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    renderAt('/cart')

    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('de'))
  })

  it('setLanguage navigates on a prefixed page, keeping search and hash, and stores and sets the cookie', async () => {
    const router = renderAt('/en/stories?x=1#h')

    await screen.findByTestId('language')
    await act(async () => screen.getByText('de').click())

    await waitFor(() => expect(router.state.location.href).toBe('/de/stories?x=1#h'))
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('de'))
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('de'))
    expect(cookie()).toContain('sk_lang=de')
  })

  it('setLanguage on an unprefixed page only changes the stored language', async () => {
    const router = renderAt('/cart')

    await screen.findByTestId('language')
    await act(async () => screen.getByText('de').click())
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('de'))
    await act(async () => screen.getByText('en').click())

    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('en'))
    expect(router.state.location.href).toBe('/cart')
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('en'))
    expect(cookie()).toContain('sk_lang=en')
  })

  it('locale override keeps its language and does not write storage', async () => {
    localStorage.setItem('sk.language', JSON.stringify('en'))
    const preview = (
      <LocaleOverride language="de">
        <Probe />
      </LocaleOverride>
    )

    renderAt('/en/stories', preview)

    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('de'))
    await act(async () => screen.getByText('en').click())
    expect(screen.getByTestId('language')).toHaveTextContent('de')
    expect(localStorage.getItem('sk.language')).toBe(JSON.stringify('en'))
    expect(cookie()).not.toContain('sk_lang')
  })
})
