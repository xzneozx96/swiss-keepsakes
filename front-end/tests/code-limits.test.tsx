import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useSignIn, WRONG_CODE } from '@/features/auth/hooks/use-sign-in'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { usePartnerAccess } from '@/features/partners/hooks/use-partner-access'

const MINUTE = 60_000
const PARTNER_TOKEN = 'r7Kq2mVx'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.localStorage.clear()
  vi.useFakeTimers()
  demo = startDemo()
  await demo.ready
})

afterEach(() => {
  vi.useRealTimers()
})

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>{children}</DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>
  )
}

function renderGuestSignIn() {
  const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

  act(() => hook.result.current.submitEmail())

  return hook
}

function renderPartnerAccess() {
  const hook = renderHook(() => usePartnerAccess(PARTNER_TOKEN), { wrapper: Providers })

  act(() => {
    if (hook.result.current.kind === 'code')
      hook.result.current.send()
  })

  return hook
}

function partnerCode(hook: ReturnType<typeof renderPartnerAccess>) {
  const access = hook.result.current

  if (access.kind !== 'code')
    throw new Error(`Expected the code step, got ${access.kind}`)

  return access
}

describe('[E2.1] guest sign-in codes: 5 minutes and 3 tries', () => {
  it('locks the code after the 3rd wrong try', () => {
    const { result } = renderGuestSignIn()

    act(() => result.current.verify(WRONG_CODE))
    expect(result.current.status).toBe('wrong')
    expect(result.current.attemptsLeft).toBe(2)

    act(() => result.current.verify(WRONG_CODE))
    expect(result.current.attemptsLeft).toBe(1)

    act(() => result.current.verify(WRONG_CODE))
    expect(result.current.status).toBe('locked')
    expect(result.current.attemptsLeft).toBe(0)
  })

  it('takes a code until 5 minutes have passed', () => {
    const { result } = renderGuestSignIn()

    expect(result.current.codeMinutes).toBe(5)
    vi.setSystemTime(Date.now() + 5 * MINUTE - 1_000)
    act(() => result.current.verify('123456'))

    expect(demo.store.getState().data.signedInGuestId).not.toBeNull()
  })

  it('refuses a code after 5 minutes', () => {
    const { result } = renderGuestSignIn()

    vi.setSystemTime(Date.now() + 5 * MINUTE + 1_000)
    act(() => result.current.verify('123456'))

    expect(result.current.status).toBe('expired')
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })
})

describe('[E2.1] partner report codes keep 10 minutes and 5 tries (Q8)', () => {
  it('locks the code after the 5th wrong try, not the 3rd', () => {
    const hook = renderPartnerAccess()

    for (const left of [4, 3, 2, 1]) {
      act(() => partnerCode(hook).verify(WRONG_CODE))
      expect(partnerCode(hook).status).toBe('wrong')
      expect(partnerCode(hook).attemptsLeft).toBe(left)
    }
    act(() => partnerCode(hook).verify(WRONG_CODE))
    expect(partnerCode(hook).status).toBe('locked')
  })

  it('takes a code after 5 minutes and until 10 minutes have passed', () => {
    const hook = renderPartnerAccess()

    expect(partnerCode(hook).codeMinutes).toBe(10)
    vi.setSystemTime(Date.now() + 10 * MINUTE - 1_000)
    act(() => partnerCode(hook).verify('123456'))

    expect(hook.result.current.kind).toBe('report')
  })

  it('refuses a code after 10 minutes', () => {
    const hook = renderPartnerAccess()

    vi.setSystemTime(Date.now() + 10 * MINUTE + 1_000)
    act(() => partnerCode(hook).verify('123456'))

    expect(partnerCode(hook).status).toBe('expired')
  })
})
