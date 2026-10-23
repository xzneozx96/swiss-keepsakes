import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useSignIn } from '@/features/auth/hooks/use-sign-in'
import { takeGoogleReturn } from '@/features/auth/lib/google-return'
import { followSession } from '@/features/auth/lib/session-sync'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { demoGuest } from '@/features/orders/seed'

// The real Better Auth client and the real hook, with the HTTP answered here. The error bodies copy what
// the API sends (api/test/integration/auth.test.ts).

interface Call { path: string, method: string, headers: Headers }

let calls: Call[]
let answer: (path: string) => Response
// The client keeps the `fetch` it first saw, so every test goes through this one stub.
let fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  answer = () => Response.json({})
  fetchImpl = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)

    calls.push({
      path: new URL(request.url).pathname,
      method: request.method,
      headers: request.headers,
    })

    return answer(new URL(request.url).pathname)
  }
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init))
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

  it('sends one call for a code that completes twice in the same tick, and ignores an expired code', async () => {
    const { result } = await codeStep()
    const before = calls.length

    answer = () => problem(400, 'OTP_EXPIRED')
    act(() => {
      result.current.verify('123456')
      result.current.verify('123456')
    })
    await waitFor(() => expect(result.current.status).toBe('expired'))
    act(() => result.current.verify('123456'))

    expect(calls.length - before).toBe(1)
    expect(result.current.status).toBe('expired')
  })

  it('reads an unknown code as expired once 5 minutes have passed since it was sent', async () => {
    const { result } = await codeStep()
    const now = Date.now()

    answer = () => problem(400, 'INVALID_OTP')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 5 * 60_000 + 1000)
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.status).toBe('expired'))
    clock.mockRestore()

    expect(result.current.attemptsLeft).toBe(3)
  })

  it.each(['anna..keller@gmail.com', 'anna.@gmail.com', 'anna@x.c', '.anna@gmail.com', 'anna@gmail', 'anna keller@gmail.com'])(
    'refuses %s in the form, as the API would',
    (address) => {
      const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

      act(() => hook.result.current.onEmailChange(address))
      act(() => hook.result.current.submitEmail())

      expect(hook.result.current.emailError).toBe(true)
      expect(calls).toEqual([])
    },
  )

  it('shows the email field error, not "unavailable", when the API answers INVALID_EMAIL', async () => {
    const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

    answer = () => problem(400, 'INVALID_EMAIL')
    act(() => hook.result.current.onEmailChange('guest@example.ch'))
    act(() => hook.result.current.submitEmail())
    await waitFor(() => expect(hook.result.current.emailError).toBe(true))

    expect(hook.result.current.problem).toBeNull()
    expect(hook.result.current.step).toBe('start')
  })

  it('ends a call that never answers, says unavailable, and lets the guest send again', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const controller = new AbortController()

      setTimeout(() => controller.abort(), 30)

      return controller.signal
    })
    let sent = 0

    fetchImpl = (input, init) => {
      sent++
      const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('The operation timed out.', 'TimeoutError')))
      })
    }
    const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

    act(() => hook.result.current.onEmailChange('guest@example.ch'))
    act(() => hook.result.current.submitEmail())
    await waitFor(() => expect(hook.result.current.problem).toBe('unavailable'))
    expect(hook.result.current.sending).toBe(false)
    expect(sent).toBe(1)

    act(() => hook.result.current.submitEmail())
    await waitFor(() => expect(sent).toBe(2))
    timeout.mockRestore()
  })

  it('tells the guest how long to wait on 429 and keeps the code in the field', async () => {
    const { result } = await codeStep()

    act(() => result.current.onCodeChange('123456'))
    answer = () => Response.json({ message: 'Too many requests.' }, { status: 429, headers: { 'X-Retry-After': '42' } })
    act(() => result.current.verify('123456'))
    await waitFor(() => expect(result.current.problem).toBe('rateLimited'))

    expect(result.current.retryAfter).toBe(42)
    expect(result.current.code).toBe('123456')
    expect(result.current.attemptsLeft).toBe(3)
    expect(result.current.status).toBe('idle')
  })

  it('still shows the Google failure when the screen mounts again after the error left the address', () => {
    window.history.pushState(null, '', '/sign-in?error=access_denied')
    takeGoogleReturn()
    const hook = renderHook(() => useSignIn('/account', false), { wrapper: Providers })

    expect(hook.result.current.problem).toBe('google')
    act(() => hook.result.current.onEmailChange('guest@example.ch'))
    answer = () => problem(500)
    act(() => hook.result.current.submitEmail())
    expect(hook.result.current.problem).toBeNull()
    window.history.pushState(null, '', '/')
  })

  it('sends a Google failure back to /sign-in with the return path', async () => {
    const hook = renderHook(() => useSignIn('/cart/review', false), { wrapper: Providers })
    let body = ''

    fetchImpl = async (input, init) => {
      body = await new Request(input, init).text()

      return Response.json({ message: 'no provider' }, { status: 404 })
    }
    act(() => hook.result.current.continueWithGoogle())
    await waitFor(() => expect(hook.result.current.problem).toBe('unavailable'))

    expect(JSON.parse(body)).toMatchObject({
      provider: 'google',
      errorCallbackURL: `${window.location.origin}/sign-in?returnTo=%2Fcart%2Freview`,
    })
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
    demo.store.update(s => ({
      ...s,
      data: { ...s.data, signedInGuestId: 'someone', orders: [], favouriteProductIds: ['p-saved'] },
    }))
    let signedIn = true

    answer = path =>
      path === '/api/auth/get-session' && signedIn
        ? Response.json({
            session: { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 1e7).toISOString() },
            user: { id: 'u1', email: 'guest@example.ch' },
          })
        : Response.json(null)
    followSession(demo.store, demo.queryClient)
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).toBe(demoGuest.id))

    expect(calls.some(call => call.path === '/api/auth/get-session')).toBe(true)
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })

    expect(stored).not.toMatch(/"token"/)
    const saved = JSON.parse(localStorage.getItem('sk.demo') ?? '{}')

    expect(saved.data?.signedInGuestId ?? null).toBeNull()

    signedIn = false
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'better-auth.message',
      newValue: JSON.stringify({ event: 'session', data: { trigger: 'signout' } }),
    }))
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).toBeNull())

    const { orders, favouriteProductIds } = demo.store.getState().data

    expect(orders.length).toBeGreaterThan(0)
    expect(favouriteProductIds).toEqual([])
  })

  it('[E2.3] forgets the stores feature when the session ends or another user takes it over, and only then', async () => {
    let user: string | null = 'u1'
    const sessionOf = (id: string) => Response.json({
      session: { id: `s-${id}`, userId: id, expiresAt: new Date(Date.now() + 1e7).toISOString() },
      user: { id, email: `${id}@example.ch` },
    })
    const message = () => window.dispatchEvent(new StorageEvent('storage', {
      key: 'better-auth.message',
      newValue: JSON.stringify({ event: 'session', data: { trigger: 'signout' } }),
    }))

    answer = path => path === '/api/auth/get-session' && user ? sessionOf(user) : Response.json(null)
    demo.queryClient.setQueryData(['stores', 'onboarding', 'store-of-u1'], { name: 'u1 shop' })
    demo.queryClient.setQueryData(['orders', 'orders'], ['kept'])
    followSession(demo.store, demo.queryClient)
    // The client is shared with the test before this one, which left it with no session, so it reads again.
    message()
    await waitFor(() => expect(demo.store.getState().data.signedInGuestId).toBe(demoGuest.id))

    expect(demo.queryClient.getQueryData(['stores', 'onboarding', 'store-of-u1'])).toBeDefined()

    user = 'u2'
    message()
    await waitFor(() => expect(demo.queryClient.getQueryData(['stores', 'onboarding', 'store-of-u1'])).toBeUndefined())
    expect(demo.queryClient.getQueryData(['orders', 'orders'])).toEqual(['kept'])

    demo.queryClient.setQueryData(['stores', 'adminStores'], { pages: [] })
    user = null
    message()
    await waitFor(() => expect(demo.queryClient.getQueryData(['stores', 'adminStores'])).toBeUndefined())
  })
})
