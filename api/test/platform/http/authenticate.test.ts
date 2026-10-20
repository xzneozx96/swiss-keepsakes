import type { SessionReader } from '../../../src/platform/http/authenticate.ts'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { authenticate, requireGuest } from '../../../src/platform/http/authenticate.ts'

function setup(readSession: SessionReader) {
  const ensured: string[] = []
  const app = new Hono<{ Variables: { actor: unknown } }>()
  app.use('/api/*', authenticate({
    readSession,
    ensureGuestProfile: async (userId) => {
      ensured.push(userId)
      return `guest-of-${userId}`
    },
  }) as never)
  app.get('/api/who', c => c.json(c.get('actor') ?? null))
  app.get('/api/auth/ping', c => c.json(c.get('actor') ?? null))
  return { app, ensured }
}

const signedOut: SessionReader = async () => ({ headers: new Headers(), response: null })

describe('[E2.2] authenticate: the session becomes the actor', () => {
  it('[E2.2] a request without a session is anonymous and creates no profile', async () => {
    const { app, ensured } = setup(signedOut)

    const response = await app.request('/api/who')

    expect(await response.json()).toEqual({ kind: 'anonymous' })
    expect(ensured).toEqual([])
  })

  it('[E2.2] a session makes a guest actor with the guest profile id, and the cookie header is passed to Better Auth', async () => {
    let seen: string | null = null
    const { app, ensured } = setup(async (headers) => {
      seen = headers.get('cookie')
      return { headers: new Headers(), response: { user: { id: 'user-1' } } }
    })

    const response = await app.request('/api/who', { headers: { Cookie: 'better-auth.session_token=abc' } })

    expect(await response.json()).toEqual({ kind: 'guest', userId: 'user-1', guestId: 'guest-of-user-1' })
    expect(seen).toBe('better-auth.session_token=abc')
    expect(ensured).toEqual(['user-1'])
  })

  it('[E2.2] a renewed session cookie from Better Auth reaches the browser', async () => {
    const renewed = new Headers()
    renewed.append('Set-Cookie', 'better-auth.session_token=renewed; Max-Age=604800; HttpOnly; SameSite=Lax')
    const { app } = setup(async () => ({ headers: renewed, response: { user: { id: 'user-1' } } }))

    const response = await app.request('/api/who')

    expect(response.headers.getSetCookie()).toEqual(['better-auth.session_token=renewed; Max-Age=604800; HttpOnly; SameSite=Lax'])
  })

  it('[E2.2] Better Auth\'s own routes are not read for a session', async () => {
    let reads = 0
    const { app } = setup(async () => {
      reads++
      return { headers: new Headers(), response: null }
    })

    const response = await app.request('/api/auth/ping')

    expect(await response.json()).toBeNull()
    expect(reads).toBe(0)
  })
})

describe('[E2.2] authenticate: stale cookies and the default deny', () => {
  it('[E2.2] the cookie-clearing header of an expired session passes on with the anonymous response', async () => {
    const clearing = new Headers()
    clearing.append('Set-Cookie', 'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly')
    const { app } = setup(async () => ({ headers: clearing, response: null }))

    const response = await app.request('/api/who', { headers: { Cookie: 'better-auth.session_token=stale' } })

    expect(await response.json()).toEqual({ kind: 'anonymous' })
    expect(response.headers.getSetCookie()).toEqual(['better-auth.session_token=; Max-Age=0; Path=/; HttpOnly'])
  })

  it('[E2.2] requireGuest refuses an anonymous request with the 401 problem before the handler runs, and lets a guest through', async () => {
    let handled = 0
    const build = (readSession: SessionReader) => {
      const app = new Hono<{ Variables: { actor: unknown, requestId: string } }>()
      app.use('/api/*', async (c, next) => {
        c.set('requestId', 'req-1')
        await next()
      })
      app.use('/api/*', authenticate({ readSession, ensureGuestProfile: async userId => `guest-of-${userId}` }) as never)
      app.use('/api/private', requireGuest as never)
      app.get('/api/private', (c) => {
        handled++
        return c.json({ ok: true })
      })
      return app
    }

    const anonymous = await build(signedOut).request('/api/private')
    const guest = await build(async () => ({ headers: new Headers(), response: { user: { id: 'user-1' } } })).request('/api/private')

    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toMatchObject({ type: 'unauthenticated', status: 401, instance: '/api/private', requestId: 'req-1' })
    expect(guest.status).toBe(200)
    expect(handled).toBe(1)
  })
})
