import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AssistantHeader } from '@/components/assistant'
import { LocaleProvider } from '@/contexts/locale-context'
import { GlobalSearch } from '@/features/search/components/global-search'
import { en } from '@/i18n/en'

function renderScreen(element: React.ReactNode) {
  const root = createRootRoute({ component: () => <LocaleProvider>{element}</LocaleProvider> })
  const page = createRoute({ getParentRoute: () => root, path: '/$lang/plan', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ['/en/plan'] }) })

  render(<RouterProvider router={router} />)
}

describe('language button placement', () => {
  it('sits in the assistant header (plan, plan sent)', async () => {
    renderScreen(<AssistantHeader subtitle="Shop" onBack={() => {}} />)

    expect(await screen.findByRole('button', { name: en['shell.language.button'] })).toBeInTheDocument()
  })

  it('sits in the global search bar', async () => {
    renderScreen(
      <GlobalSearch
        backLabel="Back"
        browse={{ title: 'Browse', items: [] }}
        groups={[]}
        label="Search"
        noResults="None"
        placeholder="Search"
        query=""
        onBack={() => {}}
        onQueryChange={() => {}}
      />,
    )

    expect(await screen.findByRole('button', { name: en['shell.language.button'] })).toBeInTheDocument()
  })
})
