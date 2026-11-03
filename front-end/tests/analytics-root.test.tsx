import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsRoot } from '@/features/analytics/components/analytics-root'
import { installFakeAnalytics } from './support/fake-analytics'

const state = vi.hoisted(() => ({
  api: false,
  path: '/en',
  sessionUser: (): Promise<unknown> => Promise.resolve(null),
  me: { isPending: false, isError: false, data: { stores: [] as unknown[] } },
}))

vi.mock('@/lib/api-mode', () => ({
  get apiEnabled() {
    return state.api
  },
}))
vi.mock('@/features/stores/api/queries', () => ({
  sessionUserQuery: { queryKey: ['test', 'session-user'], queryFn: () => state.sessionUser() },
  useMe: () => state.me,
}))
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return { ...actual, useRouterState: ({ select }: { select: (value: unknown) => unknown }) => select({ location: { pathname: state.path } }) }
})

const fake = installFakeAnalytics()
const MERCHANT = { id: 'u1' }
const settle = () => new Promise(resolve => setTimeout(resolve, 20))

function tree(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <AnalyticsRoot />
    </QueryClientProvider>
  )
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(tree(client))

  return { client, go(path: string) {
    state.path = path
    view.rerender(tree(client))
  }, again() {
    view.rerender(tree(client))
  } }
}

const pageViews = () => fake.events.filter(event => event.name === 'page_view').map(event => event.props)

beforeEach(() => {
  fake.reset()
  window.localStorage.clear()
  state.api = false
  state.path = '/en'
  state.sessionUser = () => Promise.resolve(null)
  state.me = { isPending: false, isError: false, data: { stores: [] } }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[E8.7][AC37][AC60][AC-4] AnalyticsRoot tracks a page_view on each guest route change', () => {
  it('tracks the first page and each path change, with page type and language', async () => {
    const view = mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.go('/de/stories/lucerne')
    await waitFor(() => expect(pageViews()).toHaveLength(2))
    view.go('/en/gifts')
    await waitFor(() => expect(pageViews()).toHaveLength(3))

    expect(pageViews().map(props => [props.page_type, props.language])).toEqual([['home', 'en'], ['story', 'de'], ['keepsakes', 'en']])
    expect(pageViews().every(props => !('content_id' in props))).toBe(true)
  })

  it('does not track the same path twice', async () => {
    const view = mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.again()
    view.go('/en')
    await settle()

    expect(pageViews()).toHaveLength(1)
  })

  it('renders nothing', () => {
    const view = mount()

    expect(view.client).toBeDefined()
    expect(document.body.textContent).toBe('')
  })
})

describe('[E8.7][AC37][AC60][AC-5] private areas and merchants send nothing', () => {
  it.each(['/store/orders', '/partner/report', '/admin', '/en/plan', '/account', '/cart', '/sign-in', '/lab/x'])('%s sends nothing', async (path) => {
    state.path = path
    mount()
    await settle()

    expect(fake.events).toEqual([])
  })

  it('tracks a page again after a private one, and the private one in between is skipped', async () => {
    const view = mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.go('/store/orders')
    await settle()
    view.go('/en/map')
    await waitFor(() => expect(pageViews()).toHaveLength(2))

    expect(pageViews().map(props => props.page_type)).toEqual(['home', 'map'])
  })

  it('with the API on, a signed-out visitor is tracked', async () => {
    state.api = true
    mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('with the API on, a signed-in guest without stores is tracked', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('with the API on, a signed-in merchant (one or more stores) sends nothing, on any page', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: false, isError: false, data: { stores: [{ id: 's1' }] } }
    const view = mount()

    await settle()
    view.go('/en/map')
    await settle()

    expect(fake.events).toEqual([])
  })

  it('holds while the session is unresolved, and tracks the held page once it resolves to a guest', async () => {
    state.api = true
    let resolve: (user: unknown) => void = () => {}

    state.sessionUser = () => new Promise((done) => {
      resolve = done
    })
    mount()
    await settle()
    expect(fake.events).toEqual([])

    resolve(null)
    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('holds while me is pending, then tracks the held page once when it resolves to no stores', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: true, isError: false, data: undefined as never }
    const view = mount()

    await settle()
    expect(fake.events).toEqual([])

    state.me = { isPending: false, isError: false, data: { stores: [] } }
    view.again()
    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.again()
    await settle()
    expect(pageViews()).toHaveLength(1)
  })

  it('holds, and sends nothing, while me has failed', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: false, isError: true, data: undefined as never }
    mount()

    await settle()

    expect(fake.events).toEqual([])
  })

  it('holds, and sends nothing, when the session read itself fails', async () => {
    state.api = true
    state.sessionUser = () => Promise.reject(new Error('offline'))
    mount()

    await settle()

    expect(fake.events).toEqual([])
  })

  it('with the API off, reads no session at all', async () => {
    const read = vi.fn(() => Promise.resolve(null))

    state.sessionUser = read
    mount()
    await waitFor(() => expect(pageViews()).toHaveLength(1))

    expect(read).not.toHaveBeenCalled()
  })
})

describe('[E8.7][AC37][AC60][AC-3] a server render', () => {
  it('renders nothing and tracks nothing', () => {
    const client = new QueryClient()
    const html = renderToString(tree(client))

    expect(html).toBe('')
    expect(fake.events).toEqual([])
  })
})
