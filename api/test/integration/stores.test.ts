import type { Pool } from 'pg'
import type { MailJob } from '../../src/modules/notifications/application/queue-mail.ts'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { createAccessRepository } from '../../src/modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { createInvitationRepository } from '../../src/modules/identity/adapters/invitation-repository.ts'
import { createPlatformAdminRepository } from '../../src/modules/identity/adapters/platform-admin-repository.ts'
import { registerIdentityRoutes } from '../../src/modules/identity/adapters/routes.ts'
import { createUserDirectory } from '../../src/modules/identity/adapters/user-directory.ts'
import { makeGrantSuperAdmin, makeInvitationLink, makeLoadIdentity, newInvitationToken } from '../../src/modules/identity/index.ts'
import { createMailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import { createSentMailRepository } from '../../src/modules/notifications/adapters/sent-mail-repository.ts'
import { makeQueueMail } from '../../src/modules/notifications/application/queue-mail.ts'
import { makeSendMail } from '../../src/modules/notifications/application/send-mail.ts'
import { createAuth, createSessionReader, ownOrigin } from '../../src/platform/auth.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency, idempotencyActor } from '../../src/platform/http/idempotency.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { createIdentityWiring } from '../support/identity-wiring.ts'
import { createMemoryMailer } from '../support/memory-mailer.ts'
import { openTestDatabase, silentLogger } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>
// One app, one mail queue and one Super Admin for the tests that need nothing special.
let shared: Awaited<ReturnType<typeof setup>>
let sharedAdmin: Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['superAdmin']>>

const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
const appUrl = 'https://shop.example'
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'
const apiDir = fileURLToPath(new URL('../..', import.meta.url))

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  shared = await setup()
  sharedAdmin = await shared.superAdmin()
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

function randomIp() {
  const octet = () => Math.floor(Math.random() * 250) + 1
  return `198.51.${octet()}.${octet()}`
}

const slugFor = () => `store-${randomUUID().slice(0, 8)}`
const laterMet = { 'payment-account': 'met', 'catalogue': 'met', 'policies': 'met' } as const

interface SetupOptions {
  conditions?: Parameters<typeof createIdentityWiring>[0]['conditions']
  memory?: ReturnType<typeof createMemoryMailer>
}

// The wiring of main.ts over a real database, with its own mail queue, a memory Mailer, and a log that a test reads.
async function setup(options: SetupOptions = {}) {
  const queues = { send: `mail-e2-3-${randomUUID().slice(0, 8)}`, failed: `mail-failed-e2-3-${randomUUID().slice(0, 8)}` }
  await createMailQueues(jobs.boss, queues)
  const logs: string[] = []
  const logger = createLogger('debug', { write: line => logs.push(line) })
  const uow = createUnitOfWork(db)
  const sentMail = createSentMailRepository()
  const queueMail = makeQueueMail({ sentMail, jobs: createJobQueue(jobs.boss), clock: systemClock, queue: queues.send })
  const auth = createAuth({
    db,
    baseUrl,
    secret,
    sendSignInCode: async ({ email, code, language }) => {
      await uow.run(tx => queueMail(tx, { template: 'N01', to: email, language, storeId: null, params: { shop: 'Swiss Keepsakes', code } }))
    },
    logger,
  })
  const wiring = createIdentityWiring({ db, queueMail, conditions: options.conditions })
  const app = createApp(logger, async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin,
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    routes: [routes => registerIdentityRoutes(routes, wiring.useCases)],
  })
  const memory = options.memory ?? createMemoryMailer()
  const sendMail = makeSendMail({
    uow,
    sentMail,
    mailer: memory.mailer,
    invitationLink: makeInvitationLink({ invitations: createInvitationRepository(), clock: systemClock, newToken: newInvitationToken, appUrl, screens: { N20: '/store/onboarding' } }),
    clock: systemClock,
  })

  async function call(path: string, init: { method?: string, headers?: Record<string, string>, body?: object, key?: string | null } = {}) {
    const method = init.method ?? 'GET'
    const headers: Record<string, string> = { 'fly-client-ip': randomIp(), ...(method === 'GET' ? {} : { Origin: origin }), ...init.headers }
    if (method !== 'GET' && init.key !== null)
      headers['Idempotency-Key'] = init.key ?? randomUUID()
    if (init.body)
      headers['Content-Type'] = 'application/json'
    return app.request(`${baseUrl}${path}`, { method, headers, body: init.body ? JSON.stringify(init.body) : undefined })
  }

  // The real sign-in of E2.2: the code from the queued N01 job, then Better Auth's session cookie.
  async function signIn(address = `person-${randomUUID().slice(0, 8)}@example.ch`) {
    await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type: 'sign-in' }, key: null })
    const { rows } = await pool.query<{ data: { params: { code: string } } }>(`select data from pgboss.job where name = $1 and lower(data->>'to') = lower($2)`, [queues.send, address])
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: rows[0]?.data.params.code }, key: null })
    const { user } = await response.json() as { user: { id: string } }
    const cookie = response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ')
    return { userId: user.id, email: address.toLowerCase(), headers: { Cookie: cookie } }
  }

  async function superAdmin() {
    const person = await signIn()
    const grant = makeGrantSuperAdmin({ uow, users: createUserDirectory(), admins: createPlatformAdminRepository() })
    expect(await grant(person.email)).toEqual({ ok: true, userId: person.userId })
    return person
  }

  async function createStore(admin: { headers: Record<string, string> }, ownerEmail: string, extra: object = {}) {
    const response = await call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { slug: slugFor(), name: 'Lucerne Andenken', ownerEmail, ...extra } })
    return { response, body: JSON.parse(await response.text()) as { id: string, status: string, invitation: { email: string, state: string, expiresAt: string } } }
  }

  // The newest N20 job for an address, as the worker would receive it, and one attempt of the mail job on it.
  async function newestJob(address: string): Promise<MailJob> {
    const { rows } = await pool.query<{ data: MailJob }>(`select data from pgboss.job where name = $1 and data->>'to' = $2 order by created_on desc limit 1`, [queues.send, address])
    return rows[0]!.data
  }
  async function sendNewestMail(address: string) {
    await sendMail(await newestJob(address))
    const mail = memory.sent.at(-1)!
    const link = /https:\/\/\S+/.exec(mail.text)?.[0]
    return { mail, link, token: link ? new URL(link).hash.split('invitation=')[1] : undefined }
  }

  return { app, call, signIn, superAdmin, createStore, newestJob, sendNewestMail, memory, queues, logs, uow, sendMail }
}

async function invitationRow(storeId: string) {
  const { rows } = await pool.query<{ id: string, email: string, role: string, token_hash: string | null, expires_at: Date, accepted_by: string | null }>('select id, email, role, token_hash, expires_at, accepted_by from identity.store_invitations where store_id = $1 order by id', [storeId])
  return rows
}

const storeStatus = async (storeId: string) => (await pool.query<{ status: string }>('select status from identity.stores where id = $1', [storeId])).rows[0]?.status

async function memberships(storeId: string) {
  return (await pool.query<{ user_id: string, role: string, accepted_at: Date }>('select user_id, role, accepted_at from identity.store_memberships where store_id = $1', [storeId])).rows
}

describe('[E2.3] migration 0004: stores and store_invitations', () => {
  const insertStore = (columns: string, values: unknown[]) => pool.query(`insert into identity.stores (${columns}) values (${values.map((_, index) => `$${index + 1}`).join(', ')})`, values)

  it('[E2.3] a store has the columns of section 5, starts as invited with English, and gets a UUIDv7 id', async () => {
    const slug = slugFor()
    await insertStore('slug, name', [slug, 'Lucerne Andenken'])
    const { rows } = await pool.query(`select *, uuid_extract_version(id) as version from identity.stores where slug = $1`, [slug])
    const { rows: columns } = await pool.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'identity' and table_name = 'stores' order by column_name`)

    expect(rows[0]).toMatchObject({ status: 'invited', default_language: 'en', stripe_account_id: null, stripe_charges_enabled: false, stripe_payouts_enabled: false, twint_capability: null, version: 7 })
    expect(columns.map(column => column.column_name)).toEqual(['created_at', 'default_language', 'id', 'name', 'slug', 'status', 'stripe_account_id', 'stripe_charges_enabled', 'stripe_payouts_enabled', 'twint_capability', 'updated_at'])
  })

  it.each([
    ['a status outside the four', 'slug, name, status', [slugFor(), 'Name', 'open'], 'stores_status_check'],
    ['a language outside en and de', 'slug, name, default_language', [slugFor(), 'Name', 'fr'], 'stores_default_language_check'],
    ['a blank name', 'slug, name', [slugFor(), '   '], 'stores_name_check'],
    ['a slug with capitals', 'slug, name', ['Lucerne', 'Name'], 'stores_slug_check'],
    ['a slug with a trailing dash', 'slug, name', ['lucerne-', 'Name'], 'stores_slug_check'],
  ])('[E2.3] refuses %s', async (_, columns, values, constraint) => {
    await expect(insertStore(columns, values)).rejects.toMatchObject({ code: '23514', constraint })
  })

  it('[E2.3] accepts each of the four statuses, and a slug is unique', async () => {
    for (const status of ['invited', 'onboarding', 'live', 'suspended'])
      await insertStore('slug, name, status', [slugFor(), 'Name', status])
    const slug = slugFor()
    await insertStore('slug, name', [slug, 'Name'])

    await expect(insertStore('slug, name', [slug, 'Other'])).rejects.toMatchObject({ code: '23505', constraint: 'stores_slug_unique' })
  })

  it('[E2.3] a membership of a store that does not exist is refused by the foreign key, and one of a real store is accepted', async () => {
    const insert = (storeId: string) => pool.query(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, 'owner', now())`, [randomUUID(), storeId])

    await expect(insert(randomUUID())).rejects.toMatchObject({ code: '23503', constraint: 'store_memberships_store_id_stores_id_fk' })
    const { rows } = await pool.query<{ id: string }>(`insert into identity.stores (slug, name) values ($1, 'Name') returning id`, [slugFor()])
    await insert(rows[0]!.id)
  })

  it('[E2.3] an invitation has exactly the columns of section 5 and belongs to a store', async () => {
    const { rows: columns } = await pool.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'identity' and table_name = 'store_invitations' order by column_name`)
    const insert = (storeId: string, email = 'a@example.ch', role = 'owner') => pool.query(`insert into identity.store_invitations (store_id, email, role, expires_at) values ($1, $2, $3, now())`, [storeId, email, role])
    const { rows } = await pool.query<{ id: string }>(`insert into identity.stores (slug, name) values ($1, 'Name') returning id`, [slugFor()])

    expect(columns.map(column => column.column_name)).toEqual(['accepted_by', 'created_at', 'email', 'expires_at', 'id', 'role', 'store_id', 'token_hash'])
    await expect(insert(randomUUID())).rejects.toMatchObject({ code: '23503', constraint: 'store_invitations_store_id_stores_id_fk' })
    await expect(insert(rows[0]!.id, 'a@example.ch', 'admin')).rejects.toMatchObject({ code: '23514', constraint: 'store_invitations_role_check' })
    await expect(insert(rows[0]!.id, 'Anna@Example.ch')).rejects.toMatchObject({ code: '23514', constraint: 'store_invitations_email_check' })
    await expect(insert(rows[0]!.id, ' anna@example.ch')).rejects.toMatchObject({ code: '23514', constraint: 'store_invitations_email_check' })
    await insert(rows[0]!.id, 'anna@example.ch', 'manager')
  })

  it('[E2.3] two invitations never share a token hash, and many have none', async () => {
    const { rows } = await pool.query<{ id: string }>(`insert into identity.stores (slug, name) values ($1, 'Name') returning id`, [slugFor()])
    const insert = (hash: string | null) => pool.query(`insert into identity.store_invitations (store_id, email, role, expires_at, token_hash) values ($1, 'a@example.ch', 'manager', now(), $2)`, [rows[0]!.id, hash])

    await insert(null)
    await insert(null)
    await insert('same-hash')
    await expect(insert('same-hash')).rejects.toMatchObject({ code: '23505', constraint: 'store_invitations_token_hash_unique' })
  })
})

describe('[E2.3][S8] the Super Admin invites the Owner, the Owner accepts, and the store stays closed until A02 is done', () => {
  it('[E2.3][S8][AC03] the whole path over HTTP: invite, mail, wrong address refused, right address accepts once, opening refused', async () => {
    const env = shared
    const admin = sharedAdmin
    const [owner, stranger] = await Promise.all([env.signIn(), env.signIn()])

    // The Super Admin creates the store and its Owner invitation.
    const created = await env.createStore(admin, owner.email)
    expect(created.response.status).toBe(201)
    expect(created.body).toMatchObject({ status: 'invited', invitation: { email: owner.email, state: 'open' } })
    const storeId = created.body.id
    const [invitation] = await invitationRow(storeId)
    expect(invitation).toMatchObject({ role: 'owner', token_hash: null, accepted_by: null })
    expect(invitation!.expires_at.getTime() - Date.now()).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60_000)
    expect(await storeStatus(storeId)).toBe('invited')

    // The queued N20 job holds the invitation id and no link or token.
    const job = await env.newestJob(owner.email)
    expect(job).toMatchObject({ template: 'N20', to: owner.email, storeId, params: { store: 'Lucerne Andenken', invitationId: invitation!.id } })
    expect(JSON.stringify(job)).not.toMatch(/token|http|invitation=/i)

    // The mail attempt builds the link with the real InvitationLink, in the attempt's own transaction.
    const { mail, link, token } = await env.sendNewestMail(owner.email)
    expect(link).toMatch(/^https:\/\/shop\.example\/#\/store\/onboarding\?invitation=[\w-]{43}/)
    expect(mail.to).toBe(owner.email)
    expect((await invitationRow(storeId))[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/)

    // Another signed-in address is refused and the invitation stays open.
    const wrong = await env.call('/api/me/invitations/accept', { method: 'POST', headers: stranger.headers, body: { token } })
    expect(wrong.status).toBe(403)
    const refusal = await wrong.text()
    expect(JSON.parse(refusal)).toMatchObject({ type: 'invitation-email-mismatch' })
    expect(refusal).not.toContain(owner.email)
    expect((await invitationRow(storeId))[0]?.accepted_by).toBeNull()
    expect(await memberships(storeId)).toEqual([])

    // Nobody signed in cannot accept either.
    expect((await env.call('/api/me/invitations/accept', { method: 'POST', body: { token } })).status).toBe(401)

    // The right address accepts: the membership exists and the store is onboarding.
    const accepted = await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({ storeId, role: 'owner', storeStatus: 'onboarding' })
    expect(await memberships(storeId)).toEqual([{ user_id: owner.userId, role: 'owner', accepted_at: expect.any(Date) }])
    expect(await storeStatus(storeId)).toBe('onboarding')
    expect((await invitationRow(storeId))[0]?.accepted_by).toBe(owner.userId)

    // A second accept fails, and the Owner is now staff of the store.
    const again = await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ type: 'invitation-already-accepted' })
    expect(await memberships(storeId)).toHaveLength(1)

    // A02: four conditions, only the store information met, and opening is refused with a 409.
    const onboarding = await env.call(`/api/store/${storeId}/onboarding`, { headers: owner.headers })
    expect(await onboarding.json()).toMatchObject({
      store: { id: storeId, status: 'onboarding' },
      conditions: [{ key: 'store-information', state: 'met' }, { key: 'payment-account', state: 'pending' }, { key: 'catalogue', state: 'pending' }, { key: 'policies', state: 'pending' }],
      mayOpenForSale: false,
    })
    const open = await env.call(`/api/store/${storeId}/open-for-sale`, { method: 'POST', headers: owner.headers })
    expect(open.status).toBe(409)
    expect(await open.json()).toMatchObject({ type: 'onboarding-incomplete' })
    expect(await storeStatus(storeId)).toBe('onboarding')

    // The audit trail has the creation, the acceptance and the status change.
    const { rows } = await pool.query<{ entity: string, action: string }>(`select entity, action from platform.audit_log where store_id = $1 order by at, id`, [storeId])
    expect(rows.map(row => `${row.entity}:${row.action}`)).toEqual(expect.arrayContaining(['store:created', 'store_invitation:created', 'store_invitation:accepted', 'store:status-changed']))

    // The raw token is nowhere in the database or in the logs.
    for (const [table, column] of [['pgboss.job', 'data::text'], ['notifications.sent_mail', 'to_jsonb(sent_mail)::text'], ['platform.idempotency_keys', 'to_jsonb(idempotency_keys)::text'], ['platform.audit_log', 'to_jsonb(audit_log)::text'], ['identity.store_invitations', 'to_jsonb(store_invitations)::text']] as const) {
      const { rows: found } = await pool.query<{ count: string }>(`select count(*) from ${table} where ${column} like $1`, [`%${token}%`])
      expect(Number(found[0]?.count), table).toBe(0)
    }
    expect(env.logs.join('\n')).not.toContain(token)
  })

  it('[E2.3][S8] the Owner signs in with the address in other letters and still matches', async () => {
    const env = shared
    const admin = sharedAdmin
    const local = `Ngoc.${randomUUID().slice(0, 8)}`
    const owner = await env.signIn(`${local}@Example.CH`)

    const created = await env.createStore(admin, `${local}@EXAMPLE.ch`)
    const { token } = await env.sendNewestMail(`${local.toLowerCase()}@example.ch`)

    expect(created.response.status).toBe(201)
    expect((await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })).status).toBe(200)
  })

  it('[E2.3] a link for another invitation is not an invitation, and neither is a token nobody was given', async () => {
    const env = shared
    const person = await env.signIn()

    const response = await env.call('/api/me/invitations/accept', { method: 'POST', headers: person.headers, body: { token: newInvitationToken() } })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'invitation-not-found' })
  })

  it('[E2.3][S8] two parallel accepts with different keys give one 200 and one 409, and one membership', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)

    const answers = await Promise.all(['a', 'b', 'c', 'd'].map(key => env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token }, key: `${key}-${randomUUID()}` })))

    expect(answers.map(answer => answer.status).sort()).toEqual([200, 409, 409, 409])
    // The invitation's lock and its conditional update refuse the losers, not the membership's unique key.
    const refusals = await Promise.all(answers.filter(answer => answer.status === 409).map(async answer => (await answer.json() as { type: string }).type))
    expect(refusals).toEqual(['invitation-already-accepted', 'invitation-already-accepted', 'invitation-already-accepted'])
    expect(await memberships(body.id)).toHaveLength(1)
    expect(await storeStatus(body.id)).toBe('onboarding')
  })

  it('[E2.3] an expired invitation is refused with 410, and a resend opens it again', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)
    await pool.query(`update identity.store_invitations set expires_at = now() - interval '1 second' where store_id = $1`, [body.id])

    const expired = await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })
    expect(expired.status).toBe(410)
    expect(await expired.json()).toMatchObject({ type: 'invitation-expired' })
    expect(await memberships(body.id)).toEqual([])

    const resent = await env.call(`/api/admin/stores/${body.id}/owner-invitation/resend`, { method: 'POST', headers: admin.headers })
    expect(resent.status).toBe(200)
    expect(await resent.json()).toMatchObject({ invitation: { state: 'open' } })
    const fresh = await env.sendNewestMail(owner.email)
    expect((await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token: fresh.token } })).status).toBe(200)
  })

  it('[E2.3] the mail of an invitation that expired before it was sent gets no link, fails at once, and stores no token', async () => {
    const env = shared
    const owner = await env.signIn()
    const { body } = await env.createStore(sharedAdmin, owner.email)
    await pool.query(`update identity.store_invitations set expires_at = now() - interval '1 second' where store_id = $1`, [body.id])

    await expect(env.sendNewestMail(owner.email)).rejects.toMatchObject({ permanent: true })

    expect((await invitationRow(body.id))[0]?.token_hash).toBeNull()
    expect(env.memory.sent.some(mail => mail.to === owner.email)).toBe(false)
  })

  it('[E2.3][S8] a resend gives a new link and only the newest one works', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const first = await env.sendNewestMail(owner.email)

    const resend = () => env.call(`/api/admin/stores/${body.id}/owner-invitation/resend`, { method: 'POST', headers: admin.headers, body: { language: 'de' } })
    expect((await resend()).status).toBe(200)
    // The old link stops working at the resend, before the new mail is sent.
    expect((await invitationRow(body.id))[0]?.token_hash).toBeNull()
    expect((await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token: first.token } })).status).toBe(404)
    const second = await env.sendNewestMail(owner.email)
    expect((await resend()).status).toBe(200)
    const third = await env.sendNewestMail(owner.email)

    expect(new Set([first.token, second.token, third.token]).size).toBe(3)
    expect(await invitationRow(body.id)).toHaveLength(1)
    expect((await env.newestJob(owner.email)).language).toBe('de')
    for (const stale of [first.token, second.token])
      expect((await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token: stale } })).status).toBe(404)
    expect((await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token: third.token } })).status).toBe(200)
  })

  it('[E2.3] a resend after the Owner accepted is a 409', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)
    await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })

    const response = await env.call(`/api/admin/stores/${body.id}/owner-invitation/resend`, { method: 'POST', headers: admin.headers })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'invitation-already-accepted' })
  })

  it('[E2.3] a failed mail attempt rolls the token hash back, and the next attempt gets a new token', async () => {
    const memory = createMemoryMailer()
    const env = await setup({ memory })
    const admin = await env.superAdmin()
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    memory.failWith(new Error('smtp is down'))

    await expect(env.sendNewestMail(owner.email)).rejects.toBeInstanceOf(Error)
    expect((await invitationRow(body.id))[0]?.token_hash).toBeNull()

    memory.failWith(undefined)
    expect((await env.sendNewestMail(owner.email)).token).toBeDefined()
    expect((await invitationRow(body.id))[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('[E2.3] an address Better Auth did not verify cannot accept', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)
    await pool.query('update identity."user" set email_verified = false where id = $1', [owner.userId])

    const response = await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'invitation-email-unverified' })
    expect(await memberships(body.id)).toEqual([])
  })
})

describe('[E2.3] the Super Admin\'s routes over real sessions', () => {
  it('[E2.3] only the Super Admin creates and lists stores: anonymous 401, a guest and a store owner 403', async () => {
    const env = shared
    const guest = await env.signIn()
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)
    await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })
    const attempt = (headers: Record<string, string>) => env.call('/api/admin/stores', { method: 'POST', headers, body: { slug: slugFor(), name: 'Another', ownerEmail: 'x@example.ch' } })

    expect((await attempt({})).status).toBe(401)
    expect((await attempt(guest.headers)).status).toBe(403)
    expect((await attempt(owner.headers)).status).toBe(403)
    expect((await env.call('/api/admin/stores')).status).toBe(401)
    expect((await env.call('/api/admin/stores', { headers: owner.headers })).status).toBe(403)
    expect((await env.call(`/api/admin/stores/${body.id}/owner-invitation/resend`, { method: 'POST', headers: owner.headers })).status).toBe(403)
    expect((await env.call('/api/admin/stores', { headers: admin.headers })).status).toBe(200)
  })

  it('[E2.3] a taken slug is a 409, and creates no second store, invitation or mail', async () => {
    const env = shared
    const admin = sharedAdmin
    const slug = slugFor()
    const first = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { slug, name: 'First', ownerEmail: `one-${slug}@example.ch` } })
    const second = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { slug, name: 'Second', ownerEmail: `two-${slug}@example.ch` } })

    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ type: 'store-slug-taken' })
    const { rows } = await pool.query<{ count: string }>(`select count(*) from identity.store_invitations where email like $1`, [`%-${slug}@example.ch`])
    const { rows: mails } = await pool.query<{ count: string }>(`select count(*) from pgboss.job where name = $1 and data->>'to' like $2`, [env.queues.send, `%-${slug}@example.ch`])
    expect([Number(rows[0]?.count), Number(mails[0]?.count)]).toEqual([1, 1])
  })

  it('[E2.3] a store and its invitation are made together: a mail that cannot be queued leaves neither', async () => {
    const env = await setup()
    const admin = await env.superAdmin()
    await jobs.boss.deleteQueue(env.queues.send)
    const slug = slugFor()

    const response = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { slug, name: 'Half made', ownerEmail: `half-${slug}@example.ch` } })

    expect(response.status).toBe(500)
    expect((await pool.query('select 1 from identity.stores where slug = $1', [slug])).rowCount).toBe(0)
    expect((await pool.query('select 1 from identity.store_invitations where email = $1', [`half-${slug}@example.ch`])).rowCount).toBe(0)
  })

  it('[E2.3] the Idempotency-Key makes a command run once: a replay gets the first answer, a changed body gets 422, no key gets 400', async () => {
    const env = shared
    const admin = sharedAdmin
    const key = randomUUID()
    const body = { slug: slugFor(), name: 'Once', ownerEmail: `once-${randomUUID().slice(0, 8)}@example.ch` }

    const first = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body, key })
    const replay = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body, key })
    const changed = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { ...body, name: 'Changed' }, key })
    const noKey = await env.call('/api/admin/stores', { method: 'POST', headers: admin.headers, body: { ...body, slug: slugFor() }, key: null })

    expect(first.status).toBe(201)
    expect(replay.status).toBe(201)
    expect(replay.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await replay.text()).toBe(await first.text())
    expect(changed.status).toBe(422)
    expect(await changed.json()).toMatchObject({ type: 'idempotency-key-reused' })
    expect(noKey.status).toBe(400)
    expect(await noKey.json()).toMatchObject({ type: 'idempotency-key-required' })
    expect((await pool.query('select 1 from identity.store_invitations where email = $1', [body.ownerEmail])).rowCount).toBe(1)
    expect((await pool.query(`select 1 from pgboss.job where name = $1 and data->>'to' = $2`, [env.queues.send, body.ownerEmail])).rowCount).toBe(1)
  })

  it('[E2.3] the same key from two people is two commands', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const { token } = await (async () => {
      await env.createStore(admin, owner.email)
      return env.sendNewestMail(owner.email)
    })()
    const stranger = await env.signIn()
    const key = randomUUID()

    const refused = await env.call('/api/me/invitations/accept', { method: 'POST', headers: stranger.headers, body: { token }, key })
    const accepted = await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token }, key })

    expect(refused.status).toBe(403)
    expect(accepted.status).toBe(200)
  })

  it('[E2.3] A01\'s list shows each store with its invitation and payment state, and pages with a cursor', async () => {
    const env = shared
    const admin = sharedAdmin
    const owner = await env.signIn()
    const slugs: string[] = []
    for (let index = 0; index < 3; index++) {
      const created = await env.createStore(admin, index === 0 ? owner.email : `list-${randomUUID().slice(0, 8)}@example.ch`)
      slugs.push(created.body.id)
    }
    interface Page { items: { id: string, slug: string, status: string, paymentAccount: string, invitation: { state: string } | null }[], nextCursor: string | null }

    // Other test files add stores to the same database at the same time, so the pages are walked, not counted.
    const first = await (await env.call('/api/admin/stores?limit=2', { headers: admin.headers })).json() as Page
    const second = await (await env.call(`/api/admin/stores?limit=2&cursor=${first.nextCursor}`, { headers: admin.headers })).json() as Page
    const everything: Page['items'] = []
    for (let cursor: string | null = null, guard = 0; guard < 50; guard++) {
      const page = await (await env.call(`/api/admin/stores?limit=100${cursor ? `&cursor=${cursor}` : ''}`, { headers: admin.headers })).json() as Page
      everything.push(...page.items)
      cursor = page.nextCursor
      if (!cursor)
        break
    }

    expect(first.items).toHaveLength(2)
    expect(first.nextCursor).toBe(first.items[1]!.id)
    expect(second.items.map(item => item.id)).not.toContain(first.items[0]!.id)
    const ids = everything.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter(id => slugs.includes(id))).toEqual([...slugs].reverse())
    expect(everything.find(item => item.id === slugs[0])).toMatchObject({ status: 'invited', paymentAccount: 'pending', invitation: { state: 'open' } })
  })
})

describe('[E2.3][AC03] the Owner\'s onboarding routes on a real store', () => {
  async function onboardingStore(options: SetupOptions = {}) {
    const env = options.conditions ? await setup(options) : shared
    const admin = options.conditions ? await env.superAdmin() : sharedAdmin
    const [owner, manager] = await Promise.all([env.signIn(), env.signIn()])
    const { body } = await env.createStore(admin, owner.email)
    const { token } = await env.sendNewestMail(owner.email)
    await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })
    await pool.query(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, 'manager', now())`, [manager.userId, body.id])
    return { env, admin, owner, manager, storeId: body.id }
  }

  it('[E2.3][AC03] with the later conditions replaced by doubles that are met, the Owner opens the store and it goes live', async () => {
    const { env, owner, storeId } = await onboardingStore({ conditions: { laterConditions: async () => ({ ...laterMet }) } })

    const before = await (await env.call(`/api/store/${storeId}/onboarding`, { headers: owner.headers })).json()
    const open = await env.call(`/api/store/${storeId}/open-for-sale`, { method: 'POST', headers: owner.headers })

    expect(before).toMatchObject({ mayOpenForSale: true })
    expect(open.status).toBe(200)
    expect(await open.json()).toMatchObject({ id: storeId, status: 'live' })
    expect(await storeStatus(storeId)).toBe('live')
    const { rows } = await pool.query(`select before, after, actor from platform.audit_log where store_id = $1 and action = 'status-changed' order by at desc, id desc limit 1`, [storeId])
    expect(rows[0]).toMatchObject({ before: { status: 'onboarding' }, after: { status: 'live' }, actor: `staff:${owner.userId}` })
    // A store that is live cannot be opened again.
    const again = await env.call(`/api/store/${storeId}/open-for-sale`, { method: 'POST', headers: owner.headers })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ type: 'store-not-onboarding' })
  })

  it('[E2.3][AC03] each later condition that is not met keeps the store out of live', async () => {
    for (const key of ['payment-account', 'catalogue', 'policies'] as const) {
      const { env, owner, storeId } = await onboardingStore({ conditions: { laterConditions: async () => ({ ...laterMet, [key]: 'unmet' }) } })

      const open = await env.call(`/api/store/${storeId}/open-for-sale`, { method: 'POST', headers: owner.headers })

      expect(open.status, key).toBe(409)
      expect(await storeStatus(storeId), key).toBe('onboarding')
    }
  })

  it('[E2.3][AC03] only the Owner opens the store or edits its information, a Manager only reads', async () => {
    const { env, manager, owner, storeId } = await onboardingStore({ conditions: { laterConditions: async () => ({ ...laterMet }) } })

    const open = await env.call(`/api/store/${storeId}/open-for-sale`, { method: 'POST', headers: manager.headers })
    const edit = await env.call(`/api/store/${storeId}/information`, { method: 'PATCH', headers: manager.headers, body: { name: 'Mine now' } })
    const read = await env.call(`/api/store/${storeId}/onboarding`, { headers: manager.headers })

    expect(open.status).toBe(403)
    expect(await open.json()).toMatchObject({ type: 'forbidden' })
    expect(edit.status).toBe(403)
    expect(read.status).toBe(200)
    expect(await storeStatus(storeId)).toBe('onboarding')
    expect((await env.call(`/api/store/${storeId}/information`, { method: 'PATCH', headers: owner.headers, body: { name: 'Lucerne Souvenirs' } })).status).toBe(200)
  })

  it('[E2.3] the Owner edits the name and the default language, and the Owner of another store cannot', async () => {
    const { env, admin, owner, storeId } = await onboardingStore()
    const otherOwner = await env.signIn()
    const other = await env.createStore(admin, otherOwner.email)
    const { token } = await env.sendNewestMail(otherOwner.email)
    await env.call('/api/me/invitations/accept', { method: 'POST', headers: otherOwner.headers, body: { token } })

    const edit = await env.call(`/api/store/${storeId}/information`, { method: 'PATCH', headers: owner.headers, body: { name: 'Lucerne Souvenirs', defaultLanguage: 'de' } })
    const foreign = await env.call(`/api/store/${storeId}/information`, { method: 'PATCH', headers: otherOwner.headers, body: { name: 'Taken over' } })

    expect(edit.status).toBe(200)
    expect(await edit.json()).toMatchObject({ id: storeId, name: 'Lucerne Souvenirs', defaultLanguage: 'de' })
    expect(foreign.status).toBe(403)
    expect((await pool.query<{ name: string }>('select name from identity.stores where id = $1', [other.body.id])).rows[0]?.name).toBe('Lucerne Andenken')
    expect((await pool.query<{ name: string }>('select name from identity.stores where id = $1', [storeId])).rows[0]?.name).toBe('Lucerne Souvenirs')
  })

  it('[E2.3] the store information reads as unmet when the name is blank, and the store cannot open', async () => {
    const { env, owner, storeId } = await onboardingStore({ conditions: { laterConditions: async () => ({ ...laterMet }) } })
    await expect(pool.query(`update identity.stores set name = ' ' where id = $1`, [storeId])).rejects.toMatchObject({ constraint: 'stores_name_check' })

    expect((await env.call(`/api/store/${storeId}/information`, { method: 'PATCH', headers: owner.headers, body: { name: '   ' } })).status).toBe(400)
    expect(await storeStatus(storeId)).toBe('onboarding')
  })
})

describe('[E2.3] admin:grant, the script that makes the first Super Admin', () => {
  async function run(args: string[], env: Record<string, string>) {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/admin-grant.ts', ...args], { cwd: apiDir, env: { PATH: process.env.PATH ?? '', ...env } })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk
    })
    const [code] = await once(child, 'close') as [number]
    return { code, stdout, stderr, output: stdout + stderr }
  }

  async function userRow(pool: Pool, address: string) {
    const { rows } = await pool.query<{ id: string }>(`insert into identity."user" (name, email, email_verified) values ('Test', $1, true) returning id`, [address])
    return rows[0]!.id
  }

  it('[E2.3] grants a Super Admin by email, with no granting user, and prints no URL or secret', async () => {
    const address = `admin-${randomUUID().slice(0, 8)}@example.ch`
    const userId = await userRow(pool, address)
    const url = inject('databaseUrlUnpooled')

    const result = await run([address.toUpperCase()], { DATABASE_URL_UNPOOLED: url })

    expect(result.code).toBe(0)
    const { hostname, password } = new URL(url)
    expect(result.stdout).toBe(`Granted Super Admin to user ${userId}.\n`)
    expect(result.output).not.toContain(hostname)
    if (password)
      expect(result.output).not.toContain(password)
    expect(result.stdout).not.toMatch(/postgres|password|@/i)
    const { rows } = await pool.query<{ granted_by: string | null }>('select granted_by from identity.platform_admins where user_id = $1', [userId])
    expect(rows).toEqual([{ granted_by: null }])
  })

  it('[E2.3] refuses an address with no user, and a user who is already a Super Admin', async () => {
    const address = `again-${randomUUID().slice(0, 8)}@example.ch`
    await userRow(pool, address)
    const env = { DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled') }

    const missing = await run([`nobody-${randomUUID().slice(0, 8)}@example.ch`], env)
    expect(missing.code).toBe(1)
    expect(missing.output).toContain('No user has this email')
    expect((await run([address], env)).code).toBe(0)
    const twice = await run([address], env)

    expect(twice.code).toBe(1)
    expect(twice.output).toContain('already a Super Admin')
    expect((await pool.query(`select 1 from identity.platform_admins where user_id = (select id from identity."user" where email = $1)`, [address])).rowCount).toBe(1)
  })

  it('[E2.3] needs an address and DATABASE_URL_UNPOOLED from the shell, and reads no env file', async () => {
    const noAddress = await run([], { DATABASE_URL_UNPOOLED: inject('databaseUrlUnpooled') })
    const noDatabase = await run(['someone@example.ch'], {})

    expect(noAddress.code).toBe(2)
    expect(noAddress.output).toContain('Usage')
    expect(noDatabase.code).toBe(2)
    expect(noDatabase.output).toContain('DATABASE_URL_UNPOOLED is not set')
  })

  it('[E2.3] a database it cannot reach prints no connection string', async () => {
    const result = await run(['someone@example.ch'], { DATABASE_URL_UNPOOLED: 'postgres://user:hunter2@127.0.0.1:1/none' })

    expect(result.code).toBe(1)
    expect(result.output).not.toMatch(/hunter2|postgres:\/\//)
  })
})
