import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { usePartnerAccess, WRONG_CODE } from '@/features/partners/hooks/use-partner-access'

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
