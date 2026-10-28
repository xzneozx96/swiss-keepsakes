import type { AuthenticateDeps, SessionReader } from '../../../src/platform/http/authenticate.ts'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { authenticate, requireGuest } from '../../../src/platform/http/authenticate.ts'

type Access = Awaited<ReturnType<AuthenticateDeps['loadIdentity']>>['access']
const noAccess: Access = { platformAdmin: false, memberships: [] }

function setup(readSession: SessionReader, loadAccess: (userId: string) => Promise<Access> = async () => noAccess) {
  const ensured: string[] = []
  const app = new Hono<{ Variables: { actor: unknown } }>()
  app.use('/api/*', authenticate({
    readSession,
    loadIdentity: async (userId) => {
      ensured.push(userId)
      return { guestId: `guest-of-${userId}`, access: await loadAccess(userId) }
    },
  }) as never)
  app.get('/api/who', c => c.json(c.get('actor') ?? null))
  app.all('/api/public/anything', c => c.json(c.get('actor') ?? null))
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
      app.use('/api/*', authenticate({ readSession, loadIdentity: async userId => ({ guestId: `guest-of-${userId}`, access: noAccess }) }) as never)
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

describe('[E2.10] authenticate: the actor gains its roles', () => {
  const signedIn: SessionReader = async () => ({ headers: new Headers(), response: { user: { id: 'user-1' } } })
  const lucerne = '0190f0c2-0000-7000-8000-00000000000a'

  it('[E2.10] a user with memberships is staff, and keeps the guest profile id', async () => {
    const { app } = setup(signedIn, async () => ({ platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] }))

    expect(await (await app.request('/api/who')).json()).toMatchObject({ kind: 'staff', userId: 'user-1', guestId: 'guest-of-user-1' })
  })

  it('[E2.10] a platform_admins row makes the Super Admin', async () => {
    const { app } = setup(signedIn, async () => ({ platformAdmin: true, memberships: [] }))

    expect(await (await app.request('/api/who')).json()).toEqual({ kind: 'super_admin', userId: 'user-1', guestId: 'guest-of-user-1' })
  })

  it('[E2.10] the roles are read for the session\'s user, and not for an anonymous request or a Better Auth route', async () => {
    const asked: string[] = []
    const loadAccess = async (userId: string) => {
      asked.push(userId)
      return { platformAdmin: false, memberships: [] }
    }

    await setup(signedIn, loadAccess).app.request('/api/who')
    await setup(signedOut, loadAccess).app.request('/api/who')
    await setup(signedIn, loadAccess).app.request('/api/auth/ping')

    expect(asked).toEqual(['user-1'])
  })

  it('[E2.10] requireGuest lets staff and the Super Admin through, as the signed-in users they are', async () => {
    for (const access of [{ platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' as const }] }, { platformAdmin: true, memberships: [] }]) {
      const app = new Hono<{ Variables: { actor: unknown, requestId: string, guest: unknown } }>()
      app.use('/api/*', async (c, next) => {
        c.set('requestId', 'req-1')
        await next()
      })
      app.use('/api/*', authenticate({ readSession: signedIn, loadIdentity: async userId => ({ guestId: `guest-of-${userId}`, access }) }) as never)
      app.use('/api/private', requireGuest as never)
      app.get('/api/private', c => c.json(c.get('guest')))

      const response = await app.request('/api/private')

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ userId: 'user-1', guestId: 'guest-of-user-1' })
    }
  })
})

describe('[E2.12][G-S5-PUBLICAUTH] authenticate: a public read skips the session', () => {
  const renewed = new Headers()
  renewed.append('Set-Cookie', 'better-auth.session_token=renewed; Max-Age=604800; HttpOnly')

  it('[E2.12][G-S5-PUBLICAUTH] GET and HEAD of /api/public/* never call readSession, are anonymous and set no cookie', async () => {
    let reads = 0
    const { app, ensured } = setup(async () => {
      reads++
      return { headers: renewed, response: { user: { id: 'user-1' } } }
    })

    for (const method of ['GET', 'HEAD']) {
      const response = await app.request('/api/public/anything', { method, headers: { Cookie: 'better-auth.session_token=abc' } })
      expect(response.status, method).toBe(200)
      expect(response.headers.getSetCookie(), method).toEqual([])
      if (method === 'GET')
        expect(await response.json()).toEqual({ kind: 'anonymous' })
    }
    expect(reads).toBe(0)
    expect(ensured).toEqual([])
  })

  it('[E2.12][G-S5-PUBLICAUTH] a POST to /api/public/* still reads the session', async () => {
    let reads = 0
    const { app } = setup(async () => {
      reads++
      return { headers: new Headers(), response: { user: { id: 'user-1' } } }
    })

    const response = await app.request('/api/public/anything', { method: 'POST' })

    expect(reads).toBe(1)
    expect(await response.json()).toEqual({ kind: 'guest', userId: 'user-1', guestId: 'guest-of-user-1' })
  })

  it('[E2.12][G-S5-PUBLICAUTH] an authenticated route still renews the cookie and clears an expired one', async () => {
    const clearing = new Headers()
    clearing.append('Set-Cookie', 'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly')
    const signedIn = setup(async () => ({ headers: renewed, response: { user: { id: 'user-1' } } }))
    const expired = setup(async () => ({ headers: clearing, response: null }))

    const renewal = await signedIn.app.request('/api/who')
    const cleared = await expired.app.request('/api/who')

    expect(renewal.headers.getSetCookie()).toEqual(['better-auth.session_token=renewed; Max-Age=604800; HttpOnly'])
    expect(cleared.headers.getSetCookie()).toEqual(['better-auth.session_token=; Max-Age=0; Path=/; HttpOnly'])
  })
})
