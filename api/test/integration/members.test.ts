import type { MailJob } from '../../src/modules/notifications/application/queue-mail.ts'
import { randomUUID } from 'node:crypto'
import { serve } from '@hono/node-server'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { createAccessRepository } from '../../src/modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { createInvitationRepository } from '../../src/modules/identity/adapters/invitation-repository.ts'
import { createMembershipRepository } from '../../src/modules/identity/adapters/membership-repository.ts'
import { registerIdentityRoutes } from '../../src/modules/identity/adapters/routes.ts'
import { hashInvitationToken } from '../../src/modules/identity/application/invitation-token.ts'
import { invitationScreens, makeInvitationLink, makeListMyStores, makeLoadIdentity, newInvitationToken } from '../../src/modules/identity/index.ts'
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
import { createIdentityWiring, insertStore } from '../support/identity-wiring.ts'
import { createMemoryMailer } from '../support/memory-mailer.ts'
import { sessionCookie } from '../support/session-cookie.ts'
import { openTestDatabase, silentLogger } from './support.ts'

// A real sign-in is two round trips against a Neon branch and took most of this file's time. One test signs in with
// the emailed code, as the Owner. Everyone else is a user row with a session from Better Auth's own adapter
// (`env.person`), and the stores, memberships and a Super Admin are written directly, because the sign-in is not
// what the other tests prove.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>
let env: Awaited<ReturnType<typeof setup>>

const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
const appUrl = 'https://shop.example'
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
  env = await setup()
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

const randomIp = () => `198.51.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`

async function setup() {
  const queues = { send: `mail-e2-4-${randomUUID().slice(0, 8)}`, failed: `mail-failed-e2-4-${randomUUID().slice(0, 8)}` }
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
  const wiring = createIdentityWiring({ db, queueMail })
  const app = createApp(logger, async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin,
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
    listMyStores: makeListMyStores({ uow, memberships: createMembershipRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    routes: [routes => registerIdentityRoutes(routes, wiring.useCases)],
  })
  const memory = createMemoryMailer()
  const sendMail = makeSendMail({
    uow,
    sentMail,
    mailer: memory.mailer,
    invitationLink: makeInvitationLink({ invitations: createInvitationRepository(), clock: systemClock, newToken: newInvitationToken, appUrl, screens: invitationScreens }),
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
  async function signIn() {
    const address = `person-${randomUUID().slice(0, 8)}@example.ch`
    await call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email: address, type: 'sign-in' }, key: null })
    const { rows } = await pool.query<{ data: { params: { code: string } } }>(`select data from pgboss.job where name = $1 and lower(data->>'to') = lower($2)`, [queues.send, address])
    const response = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email: address, otp: rows[0]?.data.params.code }, key: null })
    const { user } = await response.json() as { user: { id: string } }
    const cookie = response.headers.getSetCookie().map(line => line.split(';')[0]).join('; ')
    return { userId: user.id, email: address, headers: { Cookie: cookie } }
  }

  // A verified user and a session cookie for it, without the emailed code. It is the cookie the real sign-in sets.
  async function person() {
    const email = `person-${randomUUID().slice(0, 8)}@example.ch`
    const { rows } = await pool.query<{ id: string }>(`insert into identity."user" (name, email, email_verified) values ('', $1, true) returning id`, [email])
    return { userId: rows[0]!.id, email, headers: { Cookie: await sessionCookie(auth, rows[0]!.id, secret) } }
  }

  // A store in the given status and the person as its member, written directly.
  async function storeOf(person: { userId: string }, role: 'owner' | 'manager' = 'owner', status = 'live') {
    const storeId = randomUUID()
    await insertStore(pool, storeId, status, 'Lucerne Andenken')
    await addMember(storeId, person.userId, role)
    return storeId
  }

  async function addMember(storeId: string, userId: string, role: 'owner' | 'manager') {
    const { rows } = await pool.query<{ id: string }>(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, $3, now()) returning id`, [userId, storeId, role])
    return rows[0]!.id
  }

  const invite = (storeId: string, owner: { headers: Record<string, string> }, body: object) => call(`/api/store/${storeId}/member-invitations`, { method: 'POST', headers: owner.headers, body })

  async function newestJob(address: string): Promise<MailJob> {
    const { rows } = await pool.query<{ data: MailJob }>(`select data from pgboss.job where name = $1 and data->>'to' = $2 order by created_on desc limit 1`, [queues.send, address])
    return rows[0]!.data
  }

  async function sendNewestMail(address: string) {
    await sendMail(await newestJob(address))
    const mail = memory.sent.at(-1)!
    const link = /https:\/\/\S+/.exec(mail.text)?.[0]
    return { mail, link, token: link ? new URL(link).hash.split('invitation=')[1]! : undefined }
  }

  const accept = (person: { headers: Record<string, string> }, token: string) => call('/api/me/invitations/accept', { method: 'POST', headers: person.headers, body: { token } })

  return { sendMail, app, call, signIn, person, storeOf, addMember, invite, newestJob, sendNewestMail, accept, memory, queues, logs, uow }
}

async function invitationRows(storeId: string) {
  const { rows } = await pool.query<{ id: string, email: string, role: string, token_hash: string | null, expires_at: Date, accepted_by: string | null, revoked_at: Date | null }>('select id, email, role, token_hash, expires_at, accepted_by, revoked_at from identity.store_invitations where store_id = $1 order by id', [storeId])
  return rows
}

async function memberRows(storeId: string) {
  return (await pool.query<{ id: string, user_id: string, role: string }>('select id, user_id, role from identity.store_memberships where store_id = $1 order by id', [storeId])).rows
}

const storeStatus = async (storeId: string) => (await pool.query<{ status: string }>('select status from identity.stores where id = $1', [storeId])).rows[0]?.status

async function insertUser(email: string, verified = true) {
  const { rows } = await pool.query<{ id: string }>(`insert into identity."user" (name, email, email_verified) values ('', $1, $2) returning id`, [email, verified])
  return rows[0]!.id
}

describe('[E2.4][AC02] the Owner invites a Store Manager, who accepts and sees only that store', () => {
  // ~85 sequential Neon round trips plus 17 HTTP calls: ~60 s at ~0.3 s per query (measured 2026-10-29: origin/main bacbf7c timed out at 60 s twice, the same 85 queries passed at 59.6 s on another tree)
  it('[E2.4][AC02] the whole path over HTTP: invite, queued job without a token, M01 link, wrong address refused, right address accepts once, removal closes the store at once', async () => {
    const [owner, invitee, stranger] = await Promise.all([env.signIn(), env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const otherStore = await env.storeOf(stranger)

    const created = await env.invite(storeId, owner, { email: invitee.email.toUpperCase(), language: 'de' })
    expect(created.status).toBe(201)
    const body = await created.json() as { id: string, email: string, state: string }
    expect(body).toMatchObject({ email: invitee.email, state: 'open' })
    const [row] = await invitationRows(storeId)
    expect(row).toMatchObject({ id: body.id, role: 'manager', email: invitee.email, token_hash: null, accepted_by: null })
    expect(row!.expires_at.getTime() - Date.now()).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60_000)

    const job = await env.newestJob(invitee.email)
    expect(job).toMatchObject({ template: 'N18', to: invitee.email, language: 'de', storeId, params: { store: 'Lucerne Andenken', invitationId: body.id } })
    expect(JSON.stringify(job)).not.toMatch(/token|http|invitation=/i)

    const { mail, link, token } = await env.sendNewestMail(invitee.email)
    expect(link).toMatch(/^https:\/\/shop\.example\/invitation#invitation=[\w-]{43}/)
    expect(mail.to).toBe(invitee.email)
    expect((await invitationRows(storeId))[0]?.token_hash).toBe(hashInvitationToken(token!))

    const wrong = await env.accept(stranger, token!)
    expect(wrong.status).toBe(403)
    expect(await wrong.json()).toMatchObject({ type: 'invitation-email-mismatch' })
    expect((await invitationRows(storeId))[0]?.accepted_by).toBeNull()
    expect(await memberRows(storeId)).toHaveLength(1)

    const accepted = await env.accept(invitee, token!)
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({ storeId, role: 'manager', storeStatus: 'live' })
    expect(await storeStatus(storeId)).toBe('live')
    expect((await memberRows(storeId)).map(member => member.role).sort()).toEqual(['manager', 'owner'])
    expect((await invitationRows(storeId))[0]?.accepted_by).toBe(invitee.userId)
    const again = await env.accept(invitee, token!)
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ storeId, role: 'manager', storeStatus: 'live' })
    const other = await env.accept(stranger, token!)
    expect(other.status).toBe(403)
    expect(await memberRows(storeId)).toHaveLength(2)

    // The Manager sees only that store, and not the members tab.
    expect((await env.call(`/api/store/${storeId}/onboarding`, { headers: invitee.headers })).status).toBe(200)
    expect((await env.call(`/api/store/${otherStore}/onboarding`, { headers: invitee.headers })).status).toBe(403)
    expect((await env.call(`/api/store/${storeId}/members`, { headers: invitee.headers })).status).toBe(403)
    const managerInvites = await env.invite(storeId, invitee, { email: 'someone@example.ch' })
    expect(managerInvites.status).toBe(403)
    expect(await managerInvites.json()).toMatchObject({ type: 'forbidden' })

    // The Owner sees both people, and no pending invitation once it was accepted.
    const listed = await (await env.call(`/api/store/${storeId}/members`, { headers: owner.headers })).json() as { members: { id: string, email: string, role: string }[], invitations: unknown[] }
    expect(listed.members.map(({ email, role }) => `${role}:${email}`).sort()).toEqual([`manager:${invitee.email}`, `owner:${owner.email}`])
    expect(listed.invitations).toEqual([])

    // Removing the Manager takes effect on the Manager's next request.
    const manager = listed.members.find(member => member.role === 'manager')!
    const removed = await env.call(`/api/store/${storeId}/members/${manager.id}`, { method: 'DELETE', headers: owner.headers })
    expect(removed.status).toBe(204)
    expect((await env.call(`/api/store/${storeId}/onboarding`, { headers: invitee.headers })).status).toBe(403)
    expect(await memberRows(storeId)).toHaveLength(1)

    // The Owner cannot be removed through this route, not even by themselves, so the last Owner stays.
    const ownerMembership = listed.members.find(member => member.role === 'owner')!
    const refusal = await env.call(`/api/store/${storeId}/members/${ownerMembership.id}`, { method: 'DELETE', headers: owner.headers })
    expect(refusal.status).toBe(409)
    expect(await refusal.json()).toMatchObject({ type: 'cannot-remove-owner' })
    expect(await memberRows(storeId)).toHaveLength(1)
    expect((await env.call(`/api/store/${storeId}/members`, { headers: owner.headers })).status).toBe(200)

    // The raw token is nowhere in the database or in the logs.
    for (const [table, column] of [['pgboss.job', 'data::text'], ['notifications.sent_mail', 'to_jsonb(sent_mail)::text'], ['platform.idempotency_keys', 'to_jsonb(idempotency_keys)::text'], ['platform.audit_log', 'to_jsonb(audit_log)::text'], ['identity.store_invitations', 'to_jsonb(store_invitations)::text']] as const) {
      const { rows } = await pool.query<{ count: string }>(`select count(*) from ${table} where ${column} like $1`, [`%${token}%`])
      expect(Number(rows[0]?.count), table).toBe(0)
    }
    expect(env.logs.join('\n')).not.toContain(token)

    const { rows: audit } = await pool.query<{ entity: string, action: string }>(`select entity, action from platform.audit_log where store_id = $1 order by at, id`, [storeId])
    expect(audit.map(entry => `${entry.entity}:${entry.action}`)).toEqual(expect.arrayContaining(['store_invitation:created', 'store_invitation:accepted', 'store_membership:removed']))
  }, 120_000)

  it('[E2.4][AC02] a resend kills the old link at once, and only the newest mail\'s link works', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const { id } = await (await env.invite(storeId, owner, { email: invitee.email })).json() as { id: string }
    const first = await env.sendNewestMail(invitee.email)

    const resent = await env.call(`/api/store/${storeId}/member-invitations/${id}/resend`, { method: 'POST', headers: owner.headers })

    expect(resent.status).toBe(200)
    expect((await invitationRows(storeId))[0]?.token_hash).toBeNull()
    expect(await (await env.accept(invitee, first.token!)).json()).toMatchObject({ type: 'invitation-not-found' })
    const second = await env.sendNewestMail(invitee.email)
    expect(second.token).not.toBe(first.token)
    expect(await (await env.accept(invitee, first.token!)).json()).toMatchObject({ type: 'invitation-not-found' })
    expect((await env.accept(invitee, second.token!)).status).toBe(200)
    expect((await invitationRows(storeId))).toHaveLength(1)
    expect((await env.newestJob(invitee.email))).toMatchObject({ template: 'N18', params: { invitationId: id } })
  })

  it('[E2.4][AC02] a revoked invitation stops working at once, and no mail can mint a link for it', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const { id } = await (await env.invite(storeId, owner, { email: invitee.email })).json() as { id: string }
    const { token } = await env.sendNewestMail(invitee.email)
    const url = `/api/store/${storeId}/member-invitations/${id}`

    const revoked = await env.call(`${url}/revoke`, { method: 'POST', headers: owner.headers })

    expect(revoked.status).toBe(200)
    expect(await revoked.json()).toMatchObject({ id, state: 'revoked' })
    expect((await invitationRows(storeId))[0]?.revoked_at).toBeInstanceOf(Date)
    const refused = await env.accept(invitee, token!)
    expect(refused.status).toBe(410)
    expect(await refused.json()).toMatchObject({ type: 'invitation-revoked' })
    expect(await memberRows(storeId)).toHaveLength(1)
    const unsent = await (await env.invite(storeId, owner, { email: 'unsent@example.ch' })).json() as { id: string }
    await env.call(`/api/store/${storeId}/member-invitations/${unsent.id}/revoke`, { method: 'POST', headers: owner.headers })
    const mailsSent = env.memory.sent.length
    await env.sendMail(await env.newestJob('unsent@example.ch'))
    expect(env.memory.sent).toHaveLength(mailsSent)
    expect((await invitationRows(storeId)).find(row => row.id === unsent.id)?.token_hash).toBeNull()
    const { rows: cancelled } = await pool.query<{ status: string, last_error: string }>(`select status, last_error from notifications.sent_mail where recipient = 'unsent@example.ch'`)
    expect(cancelled).toEqual([{ status: 'failed', last_error: 'InvitationRevoked' }])
    expect((await env.call(`${url}/resend`, { method: 'POST', headers: owner.headers })).status).toBe(409)
    expect(await (await env.call(`${url}/revoke`, { method: 'POST', headers: owner.headers })).json()).toMatchObject({ type: 'invitation-revoked' })
    const listed = await (await env.call(`/api/store/${storeId}/members`, { headers: owner.headers })).json() as { invitations: unknown[] }
    expect(listed.invitations).toEqual([])
    // The Owner may invite the same address anew.
    expect((await env.invite(storeId, owner, { email: invitee.email })).status).toBe(201)
  })

  it('[E2.4][AC02] another store\'s Owner sees nothing and changes nothing: the guard refuses the store, and the store\'s own ids are not found under another store', async () => {
    const [owner, other, invitee] = await Promise.all([env.person(), env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const otherStore = await env.storeOf(other)
    const managerMembership = await env.addMember(storeId, invitee.userId, 'manager')
    const { id } = await (await env.invite(storeId, owner, { email: 'pending@example.ch' })).json() as { id: string }

    expect((await env.call(`/api/store/${storeId}/members`, { headers: other.headers })).status).toBe(403)
    expect((await env.invite(storeId, other, { email: 'x@example.ch' })).status).toBe(403)
    expect((await env.call(`/api/store/${storeId}/member-invitations/${id}/revoke`, { method: 'POST', headers: other.headers })).status).toBe(403)
    expect((await env.call(`/api/store/${storeId}/members/${managerMembership}`, { method: 'DELETE', headers: other.headers })).status).toBe(403)
    expect((await env.call(`/api/store/${storeId}/members`)).status).toBe(401)

    // The ids of this store, asked for under the Owner's own store, are not found.
    for (const [method, path] of [['POST', `member-invitations/${id}/resend`], ['POST', `member-invitations/${id}/revoke`]] as const) {
      const response = await env.call(`/api/store/${otherStore}/${path}`, { method, headers: other.headers })
      expect(response.status, path).toBe(404)
      expect(await response.json()).toMatchObject({ type: 'invitation-not-found' })
    }
    expect((await env.call(`/api/store/${otherStore}/members/${managerMembership}`, { method: 'DELETE', headers: other.headers })).status).toBe(404)

    expect((await invitationRows(storeId))[0]).toMatchObject({ id, revoked_at: null })
    expect(await memberRows(storeId)).toHaveLength(2)
    const own = await (await env.call(`/api/store/${otherStore}/members`, { headers: other.headers })).json() as { members: unknown[], invitations: unknown[] }
    expect([own.members.length, own.invitations.length]).toEqual([1, 0])
  })
})

describe('[E2.4] what the Owner may invite, and what the invitation may become', () => {
  it('[E2.4] refuses an address that is already a member, the Owner\'s own address, a Super Admin\'s address, and one with an open invitation, whatever its letters', async () => {
    const [owner, member] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    await env.addMember(storeId, member.userId, 'manager')
    const adminEmail = `admin-${randomUUID().slice(0, 8)}@example.ch`
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [await insertUser(adminEmail)])
    const outcome = async (email: string) => {
      const response = await env.invite(storeId, owner, { email })
      return [response.status, ((await response.json()) as { type?: string }).type]
    }

    expect(await outcome(member.email.toUpperCase())).toEqual([409, 'already-a-member'])
    expect(await outcome(owner.email)).toEqual([409, 'already-a-member'])
    expect(await outcome(adminEmail)).toEqual([409, 'manager-is-super-admin'])
    expect((await env.invite(storeId, owner, { email: 'New.Person@Example.CH' })).status).toBe(201)
    expect(await outcome('NEW.person@example.ch')).toEqual([409, 'invitation-already-open'])
    expect((await invitationRows(storeId)).map(row => row.email)).toEqual(['new.person@example.ch'])
    expect((await pool.query(`select 1 from pgboss.job where name = $1 and data->>'template' = 'N18' and data->>'to' in ($2, $3, $4)`, [env.queues.send, member.email, owner.email, adminEmail])).rowCount).toBe(0)
  })

  it('[E2.4] an expired invitation still blocks a new one, so the Owner sends it again, and a resend reopens it', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const { id } = await (await env.invite(storeId, owner, { email: 'late@example.ch' })).json() as { id: string }
    await pool.query(`update identity.store_invitations set expires_at = now() - interval '1 minute' where id = $1`, [id])

    const listed = await (await env.call(`/api/store/${storeId}/members`, { headers: owner.headers })).json() as { invitations: { state: string }[] }
    expect(listed.invitations.map(entry => entry.state)).toEqual(['expired'])
    const again = await env.invite(storeId, owner, { email: 'late@example.ch' })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ type: 'invitation-already-open' })
    expect(await invitationRows(storeId)).toHaveLength(1)

    expect((await env.call(`/api/store/${storeId}/member-invitations/${id}/resend`, { method: 'POST', headers: owner.headers })).status).toBe(200)
    expect((await invitationRows(storeId))[0]!.expires_at.getTime()).toBeGreaterThan(Date.now())
  })

  it('[E2.4] two invitations for one address meet one after the other: the store\'s row lock makes the second see the first', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    // The first invitation is in flight: it holds the store's row and has written its row, and has not committed.
    const first = await pool.connect()
    try {
      await first.query('begin')
      await first.query('select id from identity.stores where id = $1 for update', [storeId])
      await first.query(`insert into identity.store_invitations (store_id, email, role, expires_at) values ($1, 'race@example.ch', 'manager', now() + interval '7 days')`, [storeId])

      const second = env.invite(storeId, owner, { email: 'race@example.ch' })
      // The second one waits for the store's row. Without the lock it would not wait, and would answer 201.
      await vi.waitFor(async () => {
        const { rows } = await pool.query(`select 1 from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query ilike '%stores%for update%'`)
        expect(rows.length).toBeGreaterThan(0)
      }, { timeout: 15_000, interval: 100 })
      await first.query('commit')

      const response = await second
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ type: 'invitation-already-open' })
    }
    finally {
      await first.query('rollback').catch(() => undefined)
      first.release()
    }
    expect((await invitationRows(storeId)).filter(row => row.email === 'race@example.ch')).toHaveLength(1)
  })

  it('[E2.4] a resend of an old row is refused once its address belongs to the store, and once the member was removed the old row is revoked', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const old = await (await env.invite(storeId, owner, { email: invitee.email })).json() as { id: string }
    // A newer invitation for the same address was accepted: the person is a member now.
    const memberId = await env.addMember(storeId, invitee.userId, 'manager')
    await pool.query(`insert into identity.store_invitations (store_id, email, role, expires_at, accepted_by) values ($1, $2, 'manager', now() + interval '7 days', $3)`, [storeId, invitee.email, invitee.userId])
    const mails = (await pool.query(`select 1 from pgboss.job where name = $1 and data->>'to' = $2`, [env.queues.send, invitee.email])).rowCount
    const resend = () => env.call(`/api/store/${storeId}/member-invitations/${old.id}/resend`, { method: 'POST', headers: owner.headers })

    const refused = await resend()
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'already-a-member' })
    expect((await pool.query(`select 1 from pgboss.job where name = $1 and data->>'to' = $2`, [env.queues.send, invitee.email])).rowCount).toBe(mails)

    expect((await env.call(`/api/store/${storeId}/members/${memberId}`, { method: 'DELETE', headers: owner.headers })).status).toBe(204)
    expect((await invitationRows(storeId)).find(row => row.id === old.id)?.revoked_at).toBeInstanceOf(Date)
    const afterRemoval = await resend()
    expect(afterRemoval.status).toBe(409)
    expect(await afterRemoval.json()).toMatchObject({ type: 'invitation-revoked' })
  })

  it('[E2.4] a removed Manager cannot rejoin through an older invitation that is still valid', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const memberId = await env.addMember(storeId, invitee.userId, 'manager')
    const token = newInvitationToken()
    await pool.query(`insert into identity.store_invitations (store_id, email, role, token_hash, expires_at) values ($1, $2, 'manager', $3, now() + interval '1 day')`, [storeId, invitee.email, hashInvitationToken(token)])

    expect((await env.call(`/api/store/${storeId}/members/${memberId}`, { method: 'DELETE', headers: owner.headers })).status).toBe(204)
    const response = await env.accept(invitee, token)

    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ type: 'invitation-revoked' })
    expect(await memberRows(storeId)).toHaveLength(1)
  })

  it('[E2.4] the repository writes of renew and revoke carry the store id, so an invitation id of another store changes nothing', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const elsewhere = await env.storeOf(await env.person())
    const { id } = await (await env.invite(storeId, owner, { email: 'scoped@example.ch' })).json() as { id: string }
    const before = (await invitationRows(storeId))[0]!
    const repository = createInvitationRepository()

    await env.uow.run(async (tx) => {
      await repository.revoke(tx, elsewhere, id, new Date())
      await repository.renew(tx, elsewhere, id, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), randomUUID())
      await repository.revokeOpenManagersByEmail(tx, elsewhere, 'scoped@example.ch', new Date())
    })

    expect((await invitationRows(storeId))[0]).toEqual(before)
    await env.uow.run(tx => repository.revoke(tx, storeId, id, new Date()))
    expect((await invitationRows(storeId))[0]?.revoked_at).toBeInstanceOf(Date)
  })

  it('[E2.4] a resend with the JSON Content-Type and no body is a 200 through the production middleware on the node server, and a repeat of its key replays', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    const { id } = await (await env.invite(storeId, owner, { email: invitee.email })).json() as { id: string }
    const server = serve({ fetch: env.app.fetch, hostname: '127.0.0.1', port: 0 })
    await new Promise(resolve => server.once('listening', resolve))
    const { port } = server.address() as { port: number }
    try {
      const key = randomUUID()
      const resend = () => fetch(`http://127.0.0.1:${port}/api/store/${storeId}/member-invitations/${id}/resend`, { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json', 'Idempotency-Key': key, 'Cookie': owner.headers.Cookie, 'fly-client-ip': randomIp() } })

      const first = await resend()
      const replay = await resend()

      expect(first.status).toBe(200)
      expect(await first.json()).toMatchObject({ id, state: 'open' })
      expect(replay.status).toBe(200)
      expect(replay.headers.get('Idempotent-Replayed')).toBe('true')
    }
    finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  it('[E2.4] an Owner of the store who holds a Manager invitation is refused at accept: no role changes through invitations', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const token = newInvitationToken()
    await pool.query(`insert into identity.store_invitations (store_id, email, role, token_hash, expires_at) values ($1, $2, 'manager', $3, now() + interval '1 day')`, [storeId, owner.email, hashInvitationToken(token)])

    const response = await env.accept(owner, token)

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'already-a-member' })
    expect((await memberRows(storeId)).map(member => member.role)).toEqual(['owner'])
    expect((await invitationRows(storeId))[0]?.accepted_by).toBeNull()
  })

  it('[E2.4] a Super Admin who holds a Manager link is refused at accept', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const admin = await env.person()
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [admin.userId])
    const token = newInvitationToken()
    await pool.query(`insert into identity.store_invitations (store_id, email, role, token_hash, expires_at) values ($1, $2, 'manager', $3, now() + interval '1 day')`, [storeId, admin.email, hashInvitationToken(token)])

    const response = await env.accept(admin, token)

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'invitation-super-admin' })
    expect(await memberRows(storeId)).toHaveLength(1)
  })

  it('[E2.4] the Idempotency-Key makes an invitation run once: a replay gets the first answer and queues one mail', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const key = randomUUID()
    const request = { method: 'POST', headers: owner.headers, body: { email: 'once@example.ch' }, key }

    const first = await env.call(`/api/store/${storeId}/member-invitations`, request)
    const replay = await env.call(`/api/store/${storeId}/member-invitations`, request)

    expect(first.status).toBe(201)
    expect(replay.status).toBe(201)
    expect(replay.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await replay.text()).toBe(await first.text())
    expect(await invitationRows(storeId)).toHaveLength(1)
    expect((await pool.query(`select 1 from pgboss.job where name = $1 and data->>'to' = $2`, [env.queues.send, 'once@example.ch'])).rowCount).toBe(1)
  })

  it('[E2.4] an invitation and its mail are made together: a mail that cannot be queued leaves no invitation', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const isolated = await setup()
    await jobs.boss.deleteQueue(isolated.queues.send)

    const response = await isolated.invite(storeId, owner, { email: 'half@example.ch' })

    expect(response.status).toBe(500)
    expect(await invitationRows(storeId)).toEqual([])
  })

  it('[E2.4] the N18 mail names the inviter, the store and the M01 link, in the language of the request', async () => {
    const [owner, invitee] = await Promise.all([env.person(), env.person()])
    const storeId = await env.storeOf(owner)
    await env.invite(storeId, owner, { email: invitee.email, language: 'de' })

    const { mail, link } = await env.sendNewestMail(invitee.email)

    expect(mail.text).toContain('Lucerne Andenken')
    expect(mail.text).toContain(owner.email)
    expect(mail.text).toContain(link!)
  })
})
