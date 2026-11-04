import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnboardingAudience } from '@/features/onboarding/hooks/use-onboarding-audience'

const state = vi.hoisted(() => ({
  api: false,
  sessionUser: (): Promise<unknown> => Promise.resolve(null),
  me: { isPending: false, isError: false, data: { platformAdmin: false, stores: [] as unknown[] } },
  meAsked: false,
}))

vi.mock('@/lib/api-mode', () => ({
  get apiEnabled() {
    return state.api
  },
}))
vi.mock('@/features/stores/api/queries', () => ({
  sessionUserQuery: { queryKey: ['test', 'session-user'], queryFn: () => state.sessionUser() },
  useMe: (enabled: boolean) => {
    if (enabled)
      state.meAsked = true

    return state.me
  },
}))

const USER = { id: 'u1' }

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return renderHook(() => useOnboardingAudience(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
}

beforeEach(() => {
  state.api = false
  state.meAsked = false
  state.sessionUser = () => Promise.resolve(null)
  state.me = { isPending: false, isError: false, data: { platformAdmin: false, stores: [] } }
})

describe('[E4.5][AC92] useOnboardingAudience: who the visitor is', () => {
  it('with the API off nobody is staff, and no lookup is made', () => {
    const view = mount()

    expect(view.result.current).toBe('guest')
    expect(state.meAsked).toBe(false)
  })

  it('is unknown while the session is pending', () => {
    state.api = true
    state.sessionUser = () => new Promise(() => {})

    expect(mount().result.current).toBe('unknown')
  })

  it('is unknown when the session read failed', async () => {
    state.api = true
    state.sessionUser = () => Promise.reject(new Error('down'))
    const view = mount()

    await new Promise(resolve => setTimeout(resolve, 20))

    expect(view.result.current).toBe('unknown')
  })

  it('a signed-out visitor is a guest, and the stores are not asked', async () => {
    state.api = true
    const view = mount()

    await waitFor(() => expect(view.result.current).toBe('guest'))
    expect(state.meAsked).toBe(false)
  })

  it('is unknown while the stores of a signed-in user are pending or failed', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(USER)
    state.me = { isPending: true, isError: false, data: undefined as never }
    const pending = mount()

    await waitFor(() => expect(state.meAsked).toBe(true))
    expect(pending.result.current).toBe('unknown')

    state.me = { isPending: false, isError: true, data: undefined as never }

    expect(mount().result.current).toBe('unknown')
  })

  it('a signed-in user with a store is staff, and so is a platform admin', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(USER)
    state.me = { isPending: false, isError: false, data: { platformAdmin: false, stores: [{}] } }
    const merchant = mount()

    await waitFor(() => expect(merchant.result.current).toBe('staff'))

    state.me = { isPending: false, isError: false, data: { platformAdmin: true, stores: [] } }
    const admin = mount()

    await waitFor(() => expect(admin.result.current).toBe('staff'))
  })

  it('a signed-in user with no store is a guest', async () => {
    state.api = true
    state.sessionUser = () => Promise.resolve(USER)
    const view = mount()

    await waitFor(() => expect(view.result.current).toBe('guest'))
  })
})
