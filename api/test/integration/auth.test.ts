import type { MailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import type { GoogleConfig } from '../../src/platform/config.ts'
import { randomUUID } from 'node:crypto'
import { linkOAuthAccount } from 'better-auth/oauth2'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { makeEnsureGuestProfile } from '../../src/modules/identity/index.ts'
import { createMailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import { createSentMailRepository } from '../../src/modules/notifications/adapters/sent-mail-repository.ts'
import { makeQueueMail } from '../../src/modules/notifications/application/queue-mail.ts'
import { createAuth, createSessionReader, disabledAuthPaths } from '../../src/platform/auth.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { startMain } from '../support/process.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>

const origin = 'http://localhost:5173'
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

// The same wiring as main.ts, on a mail queue of this file's own, so no worker takes its jobs.
async function setup({ google, baseUrl = origin }: { google?: GoogleConfig, baseUrl?: string } = {}) {
  const queues: MailQueues = { send: `mail-e2-2-${randomUUID().slice(0, 8)}`, failed: `mail-failed-e2-2-${randomUUID().slice(0, 8)}` }
  await createMailQueues(jobs.boss, queues)
  const uow = createUnitOfWork(db)
  const queueMail = makeQueueMail({ sentMail: createSentMailRepository(), jobs: createJobQueue(jobs.boss), clock: systemClock, queue: queues.send })
  const auth = createAuth({
    db,
    baseUrl,
    secret,
    google,
    sendSignInCode: async ({ email, code, language }) => {
      await uow.run(tx => queueMail(tx, { template: 'N01', to: email, language, storeId: null, params: { shop: 'Swiss Keepsakes', code } }))
    },
    logger: silentLogger,
  })
  const app = createApp(silentLogger, async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    readSession: createSessionReader(auth),
    ensureGuestProfile: makeEnsureGuestProfile({ uow, profiles: createGuestProfileRepository() }),
  })

  // Each call gets its own client address unless it names one, because the code routes allow 3 calls a minute per address.
  async function call(path: string, init: { method?: string, body?: object, headers?: Record<string, string>, ip?: string | null } = {}) {
    const headers: Record<string, string> = { ...(init.ip === null ? {} : { 'fly-client-ip': init.ip ?? randomIp() }), ...init.headers }
    if (init.method && init.method !== 'GET')
      headers.Origin = headers.Origin ?? baseUrl
    if (init.body)
      headers['Content-Type'] = 'application/json'
    return app.request(`${baseUrl}${path}`, { method: init.method ?? 'GET', headers, body: init.body ? JSON.stringify(init.body) : undefined })
  }

  const email = () => `guest-${randomUUID().slice(0, 8)}@example.ch`

  async function requestCode(address: string, headers: Record<string, string> = {}) {
    const response = await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type: 'sign-in' }, headers })
    const { rows } = await pool.query<{ id: string, data: { template: string, language: string, to: string, params: { code: string, shop: string } }, deletion_seconds: number, retention_seconds: number }>(
      `select id, data, deletion_seconds, extract(epoch from keep_until - created_on)::int as retention_seconds from pgboss.job where name = $1 and data->>'to' = $2`,
      [queues.send, address],
    )
    return { response, job: rows[0] }
  }

  async function signIn(address: string) {
    const { job } = await requestCode(address)
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })
    const cookie = response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ')
    return { response, cookie }
  }

  return { auth, call, email, requestCode, signIn, queues, uow }
}

function randomIp() {
  const octet = () => Math.floor(Math.random() * 250) + 1
  return `198.51.${octet()}.${octet()}`
}

describe('[E2.2] sign-in with an emailed code, on the real Better Auth handler', () => {
  it('[E2.2] a code request queues N01 in the language the SPA sent, without sending the mail, and the code signs the guest in', async () => {
    const { call, email, requestCode } = await setup()
    const address = email()
    const { response, job } = await requestCode(address, { 'Accept-Language': 'de' })

    expect(response.status).toBe(200)
    expect(job?.data).toMatchObject({ template: 'N01', language: 'de', to: address, storeId: null, params: { shop: 'Swiss Keepsakes' } })
    expect(job?.data.params.code).toMatch(/^\d{6}$/)
    expect(await count(pool, `select count(*) from notifications.sent_mail where recipient = $1 and status = 'queued' and template = 'N01' and language = 'de'`, [address])).toBe(1)

    const signedIn = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })
    expect(signedIn.status).toBe(200)
    expect(await count(pool, 'select count(*) from identity."user" where email = $1 and email_verified', [address])).toBe(1)
  })

  it('[E2.2] a code request without a language is English, and "de-CH,en;q=0.8" is German', async () => {
    const { email, requestCode } = await setup()
    const english = await requestCode(email())
    const swiss = await requestCode(email(), { 'Accept-Language': 'de-CH,en;q=0.8' })
    const french = await requestCode(email(), { 'Accept-Language': 'fr' })

    expect(english.job?.data.language).toBe('en')
    expect(swiss.job?.data.language).toBe('de')
    expect(french.job?.data.language).toBe('en')
  })

  it('[E2.2] the N01 job cannot outlive its code: 2 retries 20 seconds apart, dropped after 5 minutes, deleted an hour after it finishes', async () => {
    const { email, requestCode, queues } = await setup()
    const address = email()
    await requestCode(address)
    const { rows } = await pool.query(
      `select retry_limit, retry_delay, retry_backoff, expire_seconds, deletion_seconds, extract(epoch from keep_until - created_on)::int as retention_seconds from pgboss.job where name = $1 and data->>'to' = $2`,
      [queues.send, address],
    )

    expect(rows).toEqual([{ retry_limit: 2, retry_delay: 20, retry_backoff: false, expire_seconds: 60, deletion_seconds: 3600, retention_seconds: 300 }])
  })

  it('[E2.2] only a sign-in code is mailed: the other code types of a known user queue nothing', async () => {
    const { call, email, signIn, queues } = await setup()
    const address = email()
    await signIn(address)
    for (const type of ['email-verification', 'forget-password'])
      await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type } })

    expect(await count(pool, `select count(*) from pgboss.job where name = $1 and data->>'to' = $2`, [queues.send, address])).toBe(1)
  })

  it('[E2.2] the code is valid for 5 minutes and stored hashed', async () => {
    const { email, requestCode } = await setup()
    const address = email()
    const { job } = await requestCode(address)
    const { rows } = await pool.query<{ value: string, seconds: number }>(
      `select value, extract(epoch from expires_at - created_at)::int as seconds from identity.verification where identifier = $1`,
      [`sign-in-otp-${address}`],
    )

    expect(rows[0]?.seconds).toBe(300)
    expect(rows[0]?.value).not.toContain(job?.data.params.code)
  })

  it('[E2.2][AC01] three wrong codes use the code up, and the right one is then refused', async () => {
    const { call, email, requestCode } = await setup()
    const address = email()
    const { job } = await requestCode(address)
    const wrong = job?.data.params.code === '000000' ? '111111' : '000000'
    const tries = []
    for (let i = 0; i < 3; i++)
      tries.push((await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: wrong } })).status)
    const right = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })

    expect(tries).toEqual([400, 400, 400])
    expect(right.status).toBe(403)
    expect(await right.json()).toMatchObject({ code: 'TOO_MANY_ATTEMPTS' })
  })

  it('[E2.2] an expired code is refused', async () => {
    const { call, email, requestCode } = await setup()
    const address = email()
    const { job } = await requestCode(address)
    await pool.query(`update identity.verification set expires_at = now() - interval '1 second' where identifier = $1`, [`sign-in-otp-${address}`])
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'OTP_EXPIRED' })
  })
})

describe('[E2.2] sessions and the actor', () => {
  it('[E2.2] the session cookie is HttpOnly, SameSite=Lax and lasts 7 days, and it opens a guarded route', async () => {
    const { call, email, signIn } = await setup()
    const { response, cookie } = await signIn(email())
    const setCookie = response.headers.getSetCookie().join('\n')

    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Max-Age=604800/i)
    expect(setCookie).not.toMatch(/Secure/i)
    const me = await call('/api/me', { headers: { Cookie: cookie } })
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual({ guestId: expect.stringMatching(/^[0-9a-f-]{36}$/) })
  })

  it('[E2.1] no response body of sign-in, get-session or sign-out holds the session token, and the cookie still carries it', async () => {
    const { call, email, requestCode } = await setup()
    const address = email()
    const { job } = await requestCode(address)
    const signedIn = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })
    const cookie = signedIn.headers.getSetCookie().map(line => line.split(';')[0]).join('; ')
    const token = decodeURIComponent(cookie.split('=')[1] ?? '').split('.')[0] ?? ''
    const signInBody = await signedIn.text()
    const sessionBody = await (await call('/api/auth/get-session', { headers: { Cookie: cookie } })).text()
    const signOutBody = await (await call('/api/auth/sign-out', { method: 'POST', headers: { Cookie: cookie } })).text()

    expect(token.length).toBeGreaterThan(10)
    for (const body of [signInBody, sessionBody, signOutBody]) {
      expect(body).not.toContain(token)
      expect(body).not.toMatch(/"token"\s*:/)
    }
    expect(JSON.parse(signInBody)).toMatchObject({ user: { email: address } })
    expect(JSON.parse(sessionBody)).toMatchObject({ user: { email: address }, session: { userId: expect.any(String) } })
    expect(signedIn.headers.getSetCookie().join('\n')).toMatch(/session_token=/)
  })

  it('[E2.2] on an https base URL the cookie is Secure', async () => {
    const { email, signIn } = await setup({ baseUrl: 'https://keepsakes.example' })
    const { response } = await signIn(email())

    expect(response.headers.getSetCookie().join('\n')).toMatch(/Secure/i)
  })

  it('[E2.2] a request without a session is anonymous and gets 401 as a problem on a guarded route', async () => {
    const { call } = await setup()
    const response = await call('/api/me')

    expect(response.status).toBe(401)
    expect(response.headers.get('content-type')).toContain('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'unauthenticated', status: 401, instance: '/api/me' })
  })

  it('[E2.2] a revoked session gets 401: after sign-out, and after its row is deleted', async () => {
    const { call, email, signIn } = await setup()
    const first = await signIn(email())
    const signOut = await call('/api/auth/sign-out', { method: 'POST', body: {}, headers: { Cookie: first.cookie } })
    const kept = await signIn(email())
    const deletedAddress = email()
    const deleted = await signIn(deletedAddress)
    await pool.query(`delete from identity.session where user_id = (select id from identity."user" where email = $1)`, [deletedAddress])

    expect(signOut.status).toBe(200)
    expect((await call('/api/me', { headers: { Cookie: first.cookie } })).status).toBe(401)
    expect((await call('/api/me', { headers: { Cookie: kept.cookie } })).status).toBe(200)
    expect((await call('/api/me', { headers: { Cookie: deleted.cookie } })).status).toBe(401)
  })

  it('[E2.2] an expired session gets 401', async () => {
    const { call, email, signIn } = await setup()
    const address = email()
    const { cookie } = await signIn(address)
    await pool.query(`update identity.session set expires_at = now() - interval '1 second' where user_id = (select id from identity."user" where email = $1)`, [address])

    expect((await call('/api/me', { headers: { Cookie: cookie } })).status).toBe(401)
  })

  it('[E2.2] a session older than a day is renewed, and the new cookie reaches the browser', async () => {
    const { call, email, signIn } = await setup()
    const address = email()
    const { cookie } = await signIn(address)
    await pool.query(`update identity.session set updated_at = now() - interval '2 days', expires_at = now() + interval '5 days' where user_id = (select id from identity."user" where email = $1)`, [address])
    const me = await call('/api/me', { headers: { Cookie: cookie } })

    expect(me.status).toBe(200)
    expect(me.headers.getSetCookie().join('\n')).toMatch(/Max-Age=604800/i)
    const { rows } = await pool.query<{ seconds: number }>(`select extract(epoch from expires_at - now())::int as seconds from identity.session where user_id = (select id from identity."user" where email = $1)`, [address])
    // Renewed from 5 days left to 7, less the time the request took, which is longer against a remote database.
    expect(rows[0]?.seconds).toBeGreaterThan(6 * 86400 + 86000)
    expect(rows[0]?.seconds).toBeLessThanOrEqual(7 * 86400)
  })

  it('[E2.2] the guest profile is created on the first authenticated call, and ten parallel first calls create one', async () => {
    const { call, email, signIn } = await setup()
    const address = email()
    const { cookie } = await signIn(address)
    const profiles = () => count(pool, 'select count(*) from identity.guest_profiles where auth_user_id = (select id from identity."user" where email = $1)', [address])

    expect(await profiles()).toBe(0)
    const firstCalls: Promise<{ guestId: string }>[] = []
    for (let i = 0; i < 10; i++)
      firstCalls.push(call('/api/me', { headers: { Cookie: cookie } }).then(async response => response.json() as Promise<{ guestId: string }>))
    const answers = await Promise.all(firstCalls)

    expect(new Set(answers.map(answer => answer.guestId)).size).toBe(1)
    expect(await profiles()).toBe(1)
  })

  it('[E2.2] when five first calls all find no profile before any inserts, the unique key still leaves one row and the same id', async () => {
    const real = createGuestProfileRepository()
    const uow = createUnitOfWork(db)
    let missed = 0
    let release = () => {}
    const everyoneMissed = new Promise<void>((resolve) => {
      release = resolve
    })
    const ensure = makeEnsureGuestProfile({
      uow,
      profiles: {
        ...real,
        async find(tx, authUserId) {
          const found = await real.find(tx, authUserId)
          if (found === undefined) {
            if (++missed === 5)
              release()
            await everyoneMissed
          }
          return found
        },
      },
    })
    const authUserId = randomUUID()
    const ids = await Promise.all([ensure(authUserId), ensure(authUserId), ensure(authUserId), ensure(authUserId), ensure(authUserId)])

    expect(new Set(ids).size).toBe(1)
    expect(await count(pool, 'select count(*) from identity.guest_profiles where auth_user_id = $1', [authUserId])).toBe(1)
  })

  it('[E2.2] a request from a foreign origin with a session cookie is refused by Better Auth', async () => {
    const { call, email, signIn } = await setup()
    const { cookie } = await signIn(email())
    const response = await call('/api/auth/sign-out', { method: 'POST', body: {}, headers: { Cookie: cookie, Origin: 'https://evil.example' } })

    expect(response.status).toBe(403)
  })
})

describe('[E2.2] only the emailOTP plugin and Google are on', () => {
  it('[E2.2] the plugin list is the emailOTP plugin alone, and trustedProviders is empty', async () => {
    const { auth } = await setup()

    expect(auth.options.plugins?.map(plugin => plugin.id)).toEqual(['email-otp'])
    expect(auth.options.account?.accountLinking?.trustedProviders).toEqual([])
    expect(auth.options.trustedOrigins).toEqual([origin])
    expect(auth.options.session).toMatchObject({ expiresIn: 604800, updateAge: 86400, cookieCache: { enabled: false } })
  })

  it.each([
    ['/api/auth/sign-up/email', { email: 'a@example.ch', password: 'correct horse battery', name: 'A' }],
    ['/api/auth/sign-in/email', { email: 'a@example.ch', password: 'correct horse battery' }],
    ['/api/auth/sign-in/magic-link', { email: 'a@example.ch' }],
    ['/api/auth/device/code', { client_id: 'x' }],
    ['/api/auth/oauth-proxy-callback', {}],
  ])('[E2.2] POST %s is not offered', async (path, body) => {
    const { call } = await setup()
    const response = await call(path, { method: 'POST', body })

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  })

  it('[E2.2] Google is not registered without credentials, and registered with them', async () => {
    const without = await setup()
    const withGoogle = await setup({ google: { clientId: 'client-id.apps.googleusercontent.com', clientSecret: 'client-secret-for-tests' } })
    const body = { provider: 'google', callbackURL: `${origin}/` }
    const missing = await without.call('/api/auth/sign-in/social', { method: 'POST', body })
    const present = await withGoogle.call('/api/auth/sign-in/social', { method: 'POST', body })

    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ code: 'PROVIDER_NOT_FOUND' })
    expect(present.status).toBe(200)
    const { url } = await present.json() as { url: string }
    expect(new URL(url).origin).toBe('https://accounts.google.com')
    expect(new URL(url).searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/google`)
  })
})

describe('[E2.2] rate limits keep their counters in Postgres, per client address from Fly-Client-IP', () => {
  it('[E2.2] the fourth code request from one address in a minute gets 429, and the counter is a row in identity.rate_limit', async () => {
    const { call, email } = await setup()
    const ip = randomIp()
    const statuses = []
    for (let i = 0; i < 4; i++)
      statuses.push((await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email(), type: 'sign-in' }, ip })).status)
    const { rows } = await pool.query<{ key: string, count: number }>('select key, count from identity.rate_limit where key like $1', [`${ip}|%`])

    expect(statuses).toEqual([200, 200, 200, 429])
    expect(rows).toEqual([{ key: `${ip}|/email-otp/send-verification-otp`, count: 3 }])
  })

  it('[E2.2] X-Forwarded-For is not read: a changing one does not give a new allowance', async () => {
    const { call, email } = await setup()
    const ip = randomIp()
    const statuses = []
    for (let i = 0; i < 4; i++)
      statuses.push((await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email(), type: 'sign-in' }, ip, headers: { 'X-Forwarded-For': randomIp() } })).status)

    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it('[E2.2] another address has its own allowance', async () => {
    const { call, email } = await setup()
    const statuses = []
    for (let i = 0; i < 4; i++)
      statuses.push((await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: email(), type: 'sign-in' } })).status)

    expect(statuses).toEqual([200, 200, 200, 200])
  })
})

describe('[E2.2] review fixes', () => {
  it.each(disabledAuthPaths)('[E2.2] POST %s answers 404, so only sign-in can consume a code and its 3 tries hold', async (path) => {
    const { call } = await setup()
    const response = await call(`/api/auth/${path.slice(1)}`, { method: 'POST', body: { email: 'a@example.ch', otp: '123456', type: 'sign-in' } })

    expect(response.status).toBe(404)
  })

  it('[E2.2] concurrent wrong guesses are never counted past 3, and the code is dead after them', async () => {
    const { call, email, requestCode } = await setup()
    const address = email()
    const { job } = await requestCode(address)
    const wrong = job?.data.params.code === '000000' ? '111111' : '000000'
    const guesses: Promise<Response>[] = []
    for (let i = 0; i < 8; i++)
      guesses.push(call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: wrong } }))
    const answers = await Promise.all(guesses)
    const { rows } = await pool.query<{ value: string }>('select value from identity.verification where identifier = $1', [`sign-in-otp-${address}`])
    // A row that is gone means the code was used up: the fourth look at a spent code consumes it for good.
    const counted = rows[0] ? Number(rows[0].value.split(':').pop()) : 3
    const right = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: job?.data.params.code } })

    expect(answers.every(answer => answer.status === 400 || answer.status === 403)).toBe(true)
    expect(counted).toBeLessThanOrEqual(3)
    if (counted === 3)
      expect([400, 403]).toContain(right.status)
  })

  it('[E2.2] an expired session gets 401 and the response clears its cookie', async () => {
    const { call, email, signIn } = await setup()
    const address = email()
    const { cookie } = await signIn(address)
    await pool.query(`update identity.session set expires_at = now() - interval '1 second' where user_id = (select id from identity."user" where email = $1)`, [address])
    const response = await call('/api/me', { headers: { Cookie: cookie } })

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().join('\n')).toMatch(/session_token=;.*Max-Age=0/i)
  })

  it('[E2.2] in production without Fly-Client-IP every caller shares one rate limit bucket, so the header must be present on Fly (E2.9)', async () => {
    const productionUrl = 'https://keepsakes.example'
    const run = startMain({ ROLE: 'api', HOST: '127.0.0.1', PORT: '0', DATABASE_URL: inject('databaseUrl'), DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled'), NODE_ENV: 'production', BETTER_AUTH_URL: productionUrl })
    await run.waitFor('started')
    const port = run.find('api listening')?.port
    const statuses = []
    const addresses = []
    for (let i = 0; i < 4; i++) {
      const address = `shared-bucket-${randomUUID().slice(0, 8)}@example.ch`
      addresses.push(address)
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/email-otp/send-verification-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': productionUrl }, body: JSON.stringify({ email: address, type: 'sign-in' }) })
      statuses.push(response.status)
    }
    const { rows } = await pool.query(`select key, count from identity.rate_limit where key like 'no-trusted-ip%'`)
    run.child.kill('SIGTERM')
    await run.exited

    expect(statuses).toEqual([200, 200, 200, 429])
    expect(rows).toEqual([{ key: 'no-trusted-ip|/email-otp/send-verification-otp', count: 3 }])
  }, 60_000)

  it('[E2.2] a stored Google token is encrypted', async () => {
    const { auth, email, signIn } = await setup()
    const address = email()
    await signIn(address)
    const { rows: [found] } = await pool.query<{ id: string }>('select id from identity."user" where email = $1', [address])
    const linked = await linkOAuthAccount({ context: await auth.$context } as never, {
      link: { userId: found?.id ?? '', email: address },
      userInfo: { id: 'google-account-1', email: address, name: 'Anna', emailVerified: true },
      account: { providerId: 'google', accountId: 'google-account-1', accessToken: 'plain-access-token', refreshToken: 'plain-refresh-token' },
      profile: {},
      scopes: ['openid'],
    } as never)
    const { rows: [stored] } = await pool.query<{ access_token: string, refresh_token: string }>('select access_token, refresh_token from identity.account where account_id = $1', ['google-account-1'])

    expect(linked).toEqual({ linked: true })
    expect(stored?.access_token).toBeTruthy()
    expect(stored?.access_token).not.toBe('plain-access-token')
    expect(stored?.refresh_token).not.toBe('plain-refresh-token')
  })

  it('[E2.2] an OAuth error redirects to the SPA sign-in page with the error code, not to Better Auth\'s error page', async () => {
    const { call } = await setup({ google: { clientId: 'client-id.apps.googleusercontent.com', clientSecret: 'client-secret-for-tests' } })
    const response = await call('/api/auth/callback/google?error=access_denied&state=x')

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location') ?? '')
    expect(`${location.origin}${location.pathname}`).toBe(`${origin}/sign-in`)
    expect(location.searchParams.get('error')).toBeTruthy()
  })
})
