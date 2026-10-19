import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { RouteError, RoutePending } from '@/components/route-fallbacks'
import { LocaleProvider } from '@/contexts/locale-context'

beforeEach(() => {
  window.localStorage.clear()
})

/** One screen whose read waits for `answer` and then fails or succeeds, under the app's defaults. */
function renderScreen() {
  const reads: { answer: (outcome: 'fail' | 'load') => void }[] = []
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Screen() {
    const { data } = useSuspenseQuery({
      queryKey: ['screen'],
      queryFn: () =>
        new Promise<string>((resolve, reject) => {
          reads.push({
            answer: outcome =>
              outcome === 'load'
                ? resolve('Loaded screen')
                : reject(new Error('The API is down')),
          })
        }),
    })

    return <p>{data}</p>
  }

  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: Screen,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory(),
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
  })

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </QueryClientProvider>,
  )

  return { reads }
}

describe('route fallbacks', () => {
  it('[E1.11] a screen whose first read is on its way shows a skeleton, a failed read an error, and Retry reads again', async () => {
    const { reads } = renderScreen()

    await expect.poll(() => reads.length).toBe(1)
    expect(document.querySelector('[aria-busy]')).toBeInTheDocument()

    reads[0].answer('fail')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This screen could not load.',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await expect.poll(() => reads.length).toBe(2)
    reads[1].answer('load')

    expect(await screen.findByText('Loaded screen')).toBeInTheDocument()
  })
})
