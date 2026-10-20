import type { Page, Request, Route } from '@playwright/test'
import type { MessageKey } from '../../src/i18n/en'

import { Buffer } from 'node:buffer'
import { test as base, expect } from '@playwright/test'
import { de } from '../../src/i18n/de'
import { en } from '../../src/i18n/en'
import { NEON_AUTH_URL } from './neon-auth-url'

export const GOOGLE_URL = 'https://accounts.google.e2e.test/o/oauth2/v2/auth'
const COOKIE = '__Secure-neon-auth.session_token'
const VARIABLE = /\{(\w+)\}/g
const SECRET_LIKE = /eyJ[\w+/=-]*\.[\w+/=-]+\.[\w+/=-]+|opaque-[\w-]+/g

export type Language = 'en' | 'de'

export interface AuthCall {
  method: string
  path: string
  search: string
  body: Record<string, unknown> | null
  /** The request's `Cookie` header. Always empty in WebKit, whose routes do not show it. */
  cookie: string
}

function jwt(sub: string): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64')
  const now = Math.floor(Date.now() / 1000)

  return `${part({ alg: 'EdDSA', kid: 'e2e' })}.${part({ sub, iat: now, exp: now + 900 })}.e2e-signature`
}

/**
 * The parts of Neon Auth (Better Auth) the sign-in sheet uses, with the answers SP6 measured: email
 * codes that last 5 minutes and allow 3 wrong tries, the session in a `SameSite=None; Partitioned`
 * cookie on the auth host, and the JWT in the `set-auth-jwt` header of `get-session`.
 *
 * A session exists only while the browser's own cookie jar holds the session cookie for the auth
 * host. WebKit's routes never show the request's `Cookie` header, so the jar is the one record both
 * engines give.
 */
export class NeonAuthStub {
  readonly calls: AuthCall[] = []
  /** Every JWT and opaque session token handed out, to look for them in storage. */
  readonly secrets: string[] = []
  readonly code = '246810'
  private codeExpired = false
  private wrongTries = 0
  private sessions = new Set<string>()
  private verifier: string | undefined
  private failing = false
  private page: Page | undefined

  /** Neon Auth's clock passes 5 minutes: the code sent last no longer works. */
  expireCode() {
    this.codeExpired = true
  }

  /** The session ends on the server (expired or revoked); the browser still has its cookie. */
  endSessions() {
    this.sessions.clear()
  }

  /** Neon Auth cannot be reached. */
  goOffline() {
    this.failing = true
  }

  /** Google's consent finished: Neon Auth hands the app a verifier to exchange for the session. */
  googleFinished(): string {
    this.verifier = 'e2e-verifier'

    return this.verifier
  }

  /** The JWT the stub handed out last. */
  get lastJwt(): string {
    return this.secrets.findLast(secret => secret.split('.').length === 3) ?? ''
  }

  calledAt(path: string): AuthCall[] {
    return this.calls.filter(call => call.path === path)
  }

  /** The session cookie the browser keeps for the auth host, if any. */
  async storedCookie(): Promise<string | undefined> {
    const jar = await this.page!.context().cookies(new URL(NEON_AUTH_URL).origin)

    return jar.find(cookie => cookie.name === COOKIE)?.value
  }

  async attach(page: Page) {
    this.page = page
    await page.route(`${new URL(NEON_AUTH_URL).origin}/**`, route => this.answer(route))
  }

  private async answer(route: Route) {
    const request = route.request()

    if (this.failing)
      return route.abort('internetdisconnected')
    const cors = corsHeaders(request)

    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: cors })
    const url = new URL(request.url())
    const path = url.pathname.replace(new URL(NEON_AUTH_URL).pathname, '')
    const headers = await request.allHeaders()
    const call: AuthCall = {
      method: request.method(),
      path,
      search: url.search,
      body: request.postDataJSON() as Record<string, unknown> | null,
      cookie: headers.cookie ?? '',
    }

    this.calls.push(call)
    const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { ...cors, ...extra },
        body: JSON.stringify(body),
      })

    switch (path) {
      case '/email-otp/send-verification-otp':
        this.codeExpired = false
        this.wrongTries = 0

        return json(200, { success: true })
      case '/sign-in/email-otp':
        if (this.codeExpired)
          return json(400, { code: 'OTP_EXPIRED', message: 'OTP expired' })
        if (this.wrongTries >= 3)
          return json(403, { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts' })
        if (call.body?.otp !== this.code) {
          this.wrongTries += 1

          return json(400, { code: 'INVALID_OTP', message: 'Invalid OTP' })
        }

        return this.startSession(json)
      case '/sign-in/social':
        return json(200, {
          url: `${GOOGLE_URL}?client_id=e2e&redirect_uri=${encodeURIComponent(`${NEON_AUTH_URL}/callback/google`)}`,
          redirect: true,
        })
      case '/get-session': {
        const verifier = url.searchParams.get('neon_auth_session_verifier')

        if (verifier && verifier === this.verifier) {
          this.verifier = undefined

          return this.startSession(json, 'session')
        }
        const token = await this.storedCookie()

        if (!token || !this.sessions.has(token))
          return json(200, null)
        const fresh = jwt('user-e2e')

        this.secrets.push(fresh)

        return json(200, session(token), { 'set-auth-jwt': fresh })
      }
      case '/sign-out':
        this.sessions.delete((await this.storedCookie()) ?? '')

        return json(200, { success: true }, { 'set-cookie': `${COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None; Partitioned` })
      default:
        return json(404, { message: `The stub does not answer ${path}` })
    }
  }

  /** Sign-in answers `{ token, user }`; the verifier exchange answers like `get-session`, with the JWT. */
  private startSession(
    json: (status: number, body: unknown, extra?: Record<string, string>) => Promise<void>,
    shape: 'sign-in' | 'session' = 'sign-in',
  ) {
    const token = `opaque-${this.sessions.size + 1}-${Date.now()}`
    const cookie = `${COOKIE}=${token}; Max-Age=604800; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`

    this.sessions.add(token)
    this.secrets.push(token)
    if (shape === 'sign-in')
      return json(200, { token, user: user() }, { 'set-cookie': cookie })
    const fresh = jwt('user-e2e')

    this.secrets.push(fresh)

    return json(200, session(token), { 'set-cookie': cookie, 'set-auth-jwt': fresh })
  }
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'access-control-allow-origin': request.headers().origin ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, x-neon-client-info',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-expose-headers': 'set-auth-jwt',
  }
}

function user() {
  return { id: 'user-e2e', email: 'guest@example.com', name: '', emailVerified: true }
}

function session(token: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString()

  return { session: { id: 'session-e2e', token, userId: 'user-e2e', expiresAt }, user: user() }
}

const dictionaries = { en, de }

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

interface Fixtures {
  language: Language
  neonAuth: NeonAuthStub
  /** The app's copy in the project's language, so every check runs in English and in German. */
  t: Translate
  /** Every storage and cookie write the page made, recorded by an init script. */
  storageWrites: () => Promise<string[]>
}

export const test = base.extend<Fixtures>({
  language: ['en', { option: true }],

  t: async ({ language }, provide) => {
    await provide((key, vars = {}) =>
      dictionaries[language][key].replace(VARIABLE, (_, name: string) => String(vars[name])),
    )
  },

  // Automatic, so no spec can reach the network.
  neonAuth: [async ({ page }, provide) => {
    const stub = new NeonAuthStub()

    await stub.attach(page)
    await provide(stub)
  }, { auto: true }],

  storageWrites: async ({ page }, provide) => {
    await page.addInitScript((source) => {
      const secretLike = new RegExp(source, 'g')
      const setItem = Storage.prototype.setItem
      const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!
      const writes: string[] = JSON.parse(sessionStorage.getItem('e2e.writes') ?? '[]')
      // Only what looks like a JWT or a session token is kept: the demo data is too big to copy on every save.
      const record = (entry: string) => {
        const found = entry.match(secretLike)

        if (!found)
          return
        writes.push(...found)
        setItem.call(sessionStorage, 'e2e.writes', JSON.stringify(writes))
      }

      Storage.prototype.setItem = function (key: string, value: string) {
        record(`${key}=${value}`)

        return setItem.call(this, key, value)
      }
      Object.defineProperty(Document.prototype, 'cookie', {
        get: cookie.get,
        set(value: string) {
          record(`cookie:${value}`)
          cookie.set!.call(this, value)
        },
      })
    }, SECRET_LIKE.source)
    await provide(async () => {
      return page.evaluate(() => [
        ...JSON.parse(sessionStorage.getItem('e2e.writes') ?? '[]') as string[],
        ...Object.entries({ ...localStorage, ...sessionStorage })
          .filter(([key]) => key !== 'e2e.writes')
          .map(([key, value]) => `${key}=${value}`),
        `cookie:${document.cookie}`,
      ])
    })
  },

  page: async ({ page, language }, provide) => {
    const errors: string[] = []

    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript((lang) => {
      if (!localStorage.getItem('sk.language'))
        localStorage.setItem('sk.language', JSON.stringify(lang))
    }, language)
    await provide(page)
    expect(errors, 'the page threw errors').toEqual([])
  },
})

export { expect }
