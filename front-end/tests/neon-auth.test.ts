import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { codeErrorStatus } from '@/features/auth/lib/code-errors'

// The real Neon Auth SDK, with its HTTP calls answered here. The answers copy what SP6 measured on
// the development branch: Better Auth's error bodies and the JWT in the `set-auth-jwt` header.
const AUTH = 'https://auth.example.test/neondb/auth'

vi.stubEnv('VITE_NEON_AUTH_URL', AUTH)

const { getAccessToken, loadNeonAuth } = await import('@/features/auth/lib/neon-auth')

function jwt(sub: string, expiresInSeconds: number): string {
  const part = (value: object) => btoa(JSON.stringify(value))
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds

  return `${part({ alg: 'EdDSA' })}.${part({ sub, exp })}.signature`
}

let answer: (path: string) => Response

beforeAll(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))

    return answer(url.pathname.replace('/neondb/auth', ''))
  })
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

function session(token: string) {
  return Response.json(
    {
      session: { token: 'opaque-session-token', userId: 'user-1' },
      user: { id: 'user-1', email: 'guest@example.com' },
    },
    { headers: { 'set-auth-jwt': token } },
  )
}

async function refusal(status: number, body: object): Promise<unknown> {
  answer = () => Response.json(body, { status })
  const auth = await loadNeonAuth(AUTH)

  try {
    const { error } = await auth.signIn.emailOtp({
      email: 'guest@example.com',
      otp: '123456',
    })

    return error
  }
  catch (error) {
    return error
  }
}

describe('[E2.1][AC01] Neon Auth code sign-in', () => {
  it('reads Better Auth\'s refusals as a wrong, expired or used-up code', async () => {
    expect(codeErrorStatus(await refusal(400, { code: 'INVALID_OTP', message: 'Invalid OTP' }))).toBe('wrong')
    expect(codeErrorStatus(await refusal(400, { code: 'OTP_EXPIRED', message: 'OTP expired' }))).toBe('expired')
    expect(codeErrorStatus(await refusal(403, { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts' }))).toBe('locked')
  })

  it('does not blame the code for the rate limit or a lost connection', async () => {
    expect(codeErrorStatus(await refusal(429, { message: 'Too many requests. Please try again later.' }))).toBeUndefined()

    answer = () => {
      throw new TypeError('Failed to fetch')
    }
    const auth = await loadNeonAuth(AUTH)
    const lost = await auth.signIn
      .emailOtp({ email: 'guest@example.com', otp: '123456' })
      .catch((error: unknown) => error)

    expect(codeErrorStatus(lost)).toBeUndefined()
  })
})

describe('[E2.1][AC01] the JWT stays in memory', () => {
  it('gives the API the JWT from `set-auth-jwt`, not the opaque session token', async () => {
    const token = jwt('user-1', 900)

    answer = path => (path === '/get-session' ? session(token) : Response.json(null))

    await expect(getAccessToken()).resolves.toBe(token)
  })

  it('writes no token to storage when the SDK renews the JWT', async () => {
    // Past the token the previous test cached.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 3_600_000)
    const first = jwt('user-2', 11)

    answer = () => session(first)
    await expect(getAccessToken()).resolves.toBe(first)
    await getAccessToken()

    // The SDK keeps a token until 10 seconds before it expires, so 2 seconds later it fetches a new one.
    vi.setSystemTime(Date.now() + 2_000)
    const renewed = jwt('user-2', 900)

    answer = () => session(renewed)
    await expect(getAccessToken()).resolves.toBe(renewed)

    const stored = [
      ...Object.values({ ...localStorage }),
      ...Object.values({ ...sessionStorage }),
      document.cookie,
    ].join('\n')

    expect(stored).not.toContain(first)
    expect(stored).not.toContain(renewed)
    expect(stored).not.toContain('opaque-session-token')
  })
})
