import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useStaffAccount } from '@/features/stores/hooks/use-staff-account'

const session = vi.hoisted(() => ({ user: null as { name: string, email: string } | null }))
const me = vi.hoisted(() => ({ value: { data: undefined, isPending: false } as { data: unknown, isPending: boolean } }))

vi.mock('@/features/stores/api/queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')

  return {
    sessionUserQuery: queryOptions({ queryKey: ['session-user-test'], queryFn: async () => session.user, retry: false }),
    useMe: () => me.value,
  }
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => {
  session.user = { name: 'Anna Keller', email: 'anna@shop.ch' }
  me.value = { data: { stores: [{ storeId: 's1', role: 'manager' }] }, isPending: false }
})

describe('useStaffAccount', () => {
  it('is loading until the session answers', async () => {
    const hook = renderHook(() => useStaffAccount(), { wrapper })

    expect(hook.result.current.loading).toBe(true)
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
  })

  it('gives the account name and the role in the store', async () => {
    const hook = renderHook(() => useStaffAccount(), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    expect(hook.result.current.name).toBe('Anna Keller')
    expect(hook.result.current.role).toBe('manager')
  })

  it('falls back to the email local part when the name is empty', async () => {
    session.user = { name: '  ', email: 'lukas@shop.ch' }
    const hook = renderHook(() => useStaffAccount(), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    expect(hook.result.current.name).toBe('lukas')
  })

  it('prefers the Owner entry, as the store pages do', async () => {
    me.value = { data: { stores: [{ storeId: 's1', role: 'manager' }, { storeId: 's2', role: 'owner' }] }, isPending: false }
    const hook = renderHook(() => useStaffAccount(), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    expect(hook.result.current.role).toBe('owner')
  })
})
