import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useSignIn } from '@/features/auth/hooks/use-sign-in'
import { followSession } from '@/features/auth/lib/session-sync'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'

// The real Better Auth client and the real hook, with the HTTP answered here. The error bodies copy what
// the API sends (api/test/integration/auth.test.ts).
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { path: string, method: string, headers: Headers }

let calls: Call[]
let answer: (path: string) => Response
let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  answer = () => Response.json({})
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)

    calls.push({
      path: new URL(request.url).pathname,
      method: request.method,
      headers: request.headers,
    })

    return answer(new URL(request.url).pathname)
  })
  demo = startDemo()
  await demo.ready
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

function problem(status: number, code?: string) {
  return Response.json({ code, message: code ?? 'x' }, { status })
}

async function codeStep() {
  const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

  act(() => hook.result.current.onEmailChange('guest@example.ch'))
  act(() => hook.result.current.submitEmail())
  await waitFor(() => expect(hook.result.current.step).toBe('code'))

  return hook
}

describe('[E2.1][AC01] sign-in through the real Better Auth client', () => {
  it('requests a code in the SPA\'s language and sends no Authorization header', async () => {
    const { result } = await codeStep()

    const send = calls.find(call => call.path === '/api/auth/email-otp/send-verification-otp')

    expect(send?.method).toBe('POST')
    expect(send?.headers.get('accept-language')).toBe('en')
    expect(calls.every(call => !call.headers.has('authorization'))).toBe(true)
    expect(result.current.codeMinutes).toBe(5)
  })

  it('signs in with signIn.emailOtp only and never calls a check-only route', async () => {
    const { result } = await codeStep()

    act(() => result.current.verify('123456'))
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).not.toBeNull())

    expect(calls.map(call => call.path)).toContain('/api/auth/sign-in/email-otp')
    expect(calls.some(call => /check-verification-otp|verify-email/.test(call.path))).toBe(false)
  })

  it.each([
    [400, 'INVALID_OTP', 'wrong'],
    [400, 'OTP_EXPIRED', 'expired'],
    [403, 'TOO_MANY_ATTEMPTS', 'locked'],
  ])('maps %i %s to the %s state', async (status, code, expected) => {
    const { result } = await codeStep()

    answer = () => problem(status, code)
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.status).toBe(expected))

    expect(result.current.problem).toBeNull()
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })

  it('locks after the third wrong code', async () => {
    const { result } = await codeStep()

    answer = () => problem(400, 'INVALID_OTP')
    for (const left of [2, 1]) {
      act(() => result.current.verify('123456'))
      await waitFor(() => expect(result.current.attemptsLeft).toBe(left))
    }
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.status).toBe('locked'))
  })

  it('maps 429 to rate limited and a failure without a code to unavailable', async () => {
    const { result } = await codeStep()

    answer = () => problem(429)
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.problem).toBe('rateLimited'))

    answer = () => problem(500)
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.problem).toBe('unavailable'))
    expect(result.current.status).toBe('idle')
  })

  it('reports a failed resend even when the code is expired', async () => {
    const { result } = await codeStep()

    answer = () => problem(400, 'OTP_EXPIRED')
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.status).toBe('expired'))

    answer = () => problem(500)
    act(() => result.current.resend())
    await waitFor(() => expect(result.current.problem).toBe('unavailable'))
    expect(result.current.status).toBe('expired')
  })

  it('keeps the guest on the start step when the code request fails', async () => {
    const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

    answer = () => problem(429)
    act(() => hook.result.current.onEmailChange('guest@example.ch'))
    act(() => hook.result.current.submitEmail())
    await waitFor(() => expect(hook.result.current.problem).toBe('rateLimited'))

    expect(hook.result.current.step).toBe('start')
  })

  it('starts signed out, follows the session, and keeps nothing of it in storage', async () => {
    demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'someone' } }))
    let signedIn = true

    answer = path =>
      path === '/api/auth/get-session' && signedIn
        ? Response.json({
            session: { id: 's1', token: 'secret-session-token', userId: 'u1', expiresAt: new Date(Date.now() + 1e7).toISOString() },
            user: { id: 'u1', email: 'guest@example.ch' },
          })
        : Response.json(null)
    followSession(demo.store)
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).not.toBeNull())

    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })

    expect(stored).not.toContain('secret-session-token')
    const saved = JSON.parse(localStorage.getItem('sk.demo') ?? '{}')

    expect(saved.data?.signedInGuestId ?? null).toBeNull()

    signedIn = false
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'better-auth.message',
      newValue: JSON.stringify({ event: 'session', data: { trigger: 'signout' } }),
    }))
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).toBeNull())
  })
})
