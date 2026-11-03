import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsRoot } from '@/features/analytics/components/analytics-root'
import { isTrackAllowed, setTrackAllowed, track } from '@/lib/analytics/track'
import { installFakeAnalytics } from './support/fake-analytics'

const state = vi.hoisted(() => ({
  api: false,
  on: true,
  path: '/en',
  sessionUser: (): Promise<unknown> => Promise.resolve(null),
  me: { isPending: false, isError: false, data: { stores: [] as unknown[] } },
  meAsked: false,
}))

vi.mock('@/lib/api-mode', () => ({
  get apiEnabled() {
    return state.api
  },
}))
vi.mock('@/lib/analytics/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics/config')>()

  return { ...actual, analyticsEnabled: () => state.on }
})
vi.mock('@/features/stores/api/queries', () => ({
  sessionUserQuery: { queryKey: ['test', 'session-user'], queryFn: () => state.sessionUser() },
  useMe: (enabled: boolean) => {
    if (enabled)
      state.meAsked = true

    return state.me
  },
}))
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return { ...actual, useRouterState: ({ select }: { select: (value: unknown) => unknown }) => select({ location: { pathname: state.path } }) }
})

const fake = installFakeAnalytics()
const MERCHANT = { id: 'u1' }
const SESSION_KEY = ['test', 'session-user']
const gateOpen = () => waitFor(() => expect(isTrackAllowed()).toBe(true))

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

  return { client, unmount: view.unmount, go(path: string) {
    state.path = path
    view.rerender(tree(client))
  }, again() {
    view.rerender(tree(client))
  } }
}

const pageViews = () => fake.events.filter(event => event.name === 'page_view').map(event => event.props)

beforeEach(() => {
  fake.reset()
  setTrackAllowed(false)
  window.localStorage.clear()
  state.api = false
  state.on = true
  state.meAsked = false
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
    await gateOpen()

    expect(fake.events).toEqual([])
  })

  it('tracks a page again after a private one, and the private one in between is skipped', async () => {
    const view = mount()

    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.go('/store/orders')
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

    // The stores lookup was made and answered "a merchant": the gate is closed for good, not held.
    await waitFor(() => expect(state.meAsked).toBe(true))
    view.go('/en/map')

    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])
  })

  it('with the API on, a signed-in Super Admin sends nothing on a guest page, pin events included, and holds while me is unresolved', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: true, isError: false, data: undefined as never }
    const view = mount()

    await waitFor(() => expect(state.meAsked).toBe(true))
    expect(isTrackAllowed()).toBe(false)

    state.me = { isPending: false, isError: false, data: { stores: [], platformAdmin: true } as never }
    view.again()
    const pin = { pageType: 'place', contentId: '00000000-0000-4000-8000-000000000101', language: 'en' } as const

    view.go('/en/map')
    track('pin_open', pin)

    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])
  })

  it('a signed-in merchant who opens a pin, follows its story or its website sends nothing; a guest does', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: false, isError: false, data: { stores: [{ id: 's1' }] } }
    const merchantView = mount()

    await waitFor(() => expect(state.meAsked).toBe(true))
    const pin = { pageType: 'place', contentId: '00000000-0000-4000-8000-000000000101', language: 'en' } as const

    track('pin_open', pin)
    track('pin_to_story_click', pin)
    track('outbound_click', pin)
    expect(fake.events).toEqual([])

    merchantView.unmount()
    fake.reset()
    state.me = { isPending: false, isError: false, data: { stores: [] } }
    mount()
    await waitFor(() => expect(pageViews()).toHaveLength(1))
    track('pin_open', pin)
    expect(fake.events.map(event => event.name)).toEqual(['page_view', 'pin_open'])
  })

  it('holds while the session is unresolved, and tracks the held page once it resolves to a guest', async () => {
    state.api = true
    let resolve: (user: unknown) => void = () => {}

    state.sessionUser = () => new Promise((done) => {
      resolve = done
    })
    const view = mount()

    await waitFor(() => expect(view.client.isFetching({ queryKey: SESSION_KEY })).toBe(1))
    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])

    resolve(null)
    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('holds while me is pending, then tracks the held page once when it resolves to no stores', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: true, isError: false, data: undefined as never }
    const view = mount()

    await waitFor(() => expect(state.meAsked).toBe(true))
    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])

    state.me = { isPending: false, isError: false, data: { stores: [] } }
    view.again()
    await waitFor(() => expect(pageViews()).toHaveLength(1))
    view.again()
    expect(pageViews()).toHaveLength(1)
  })

  it('holds, and sends nothing, while me has failed', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(MERCHANT)
    state.me = { isPending: false, isError: true, data: undefined as never }
    const view = mount()

    await waitFor(() => expect(state.meAsked).toBe(true))
    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])

    // A hold, not a skip: when the stores read succeeds with no stores, the held page is reported.
    state.me = { isPending: false, isError: false, data: { stores: [] } }
    view.again()
    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('holds, and sends nothing, when the session read itself fails', async () => {
    state.api = true
    state.sessionUser = () => Promise.reject(new Error('offline'))
    const view = mount()

    await waitFor(() => expect(view.client.getQueryState(SESSION_KEY)?.status).toBe('error'))
    expect(isTrackAllowed()).toBe(false)
    expect(fake.events).toEqual([])

    // A hold, not a skip: when the read works again, the held page is reported.
    state.sessionUser = () => Promise.resolve(null)
    await view.client.refetchQueries({ queryKey: SESSION_KEY })
    await waitFor(() => expect(pageViews()).toHaveLength(1))
  })

  it('with the API on and the sender off, makes no session or stores lookup', async () => {
    state.api = true
    state.on = false
    const lookup = vi.fn(() => Promise.resolve(null))

    state.sessionUser = lookup
    mount()
    await gateOpen()
    expect(lookup).not.toHaveBeenCalled()
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
