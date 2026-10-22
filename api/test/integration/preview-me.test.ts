import type { Tx } from '../../src/platform/db/client.ts'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAccessRepository } from '../../src/modules/identity/adapters/access-repository.ts'
import { createGuestProfileRepository } from '../../src/modules/identity/adapters/guest-profile-repository.ts'
import { createInvitationRepository } from '../../src/modules/identity/adapters/invitation-repository.ts'
import { createMembershipRepository } from '../../src/modules/identity/adapters/membership-repository.ts'
import { invitationPreviewPath, registerIdentityRoutes } from '../../src/modules/identity/adapters/routes.ts'
import { createUserDirectory } from '../../src/modules/identity/adapters/user-directory.ts'
import { hashInvitationToken } from '../../src/modules/identity/application/invitation-token.ts'
import { makeInviteManager, makeListMyStores, makeLoadIdentity, newInvitationToken } from '../../src/modules/identity/index.ts'
import { OpenManagerInvitationExists } from '../../src/modules/identity/ports.ts'
import { createAuth, createSessionReader, ownOrigin } from '../../src/platform/auth.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createApp } from '../../src/platform/http/app.ts'
import { idempotency, idempotencyActor } from '../../src/platform/http/idempotency.ts'
import { createIdentityWiring, insertStore } from '../support/identity-wiring.ts'
import { sessionCookie } from '../support/session-cookie.ts'
import { openTestDatabase, silentLogger } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
let env: Awaited<ReturnType<typeof setup>>

const baseUrl = 'http://localhost:5173'
const origin = ownOrigin(baseUrl)
// A placeholder of the right length, not a secret.
const secret = 'test-only-secret-0123456789-abcdefghij'

beforeAll(async () => {
  env = await setup()
})

afterAll(async () => {
  await pool.end()
})

async function setup() {
  const uow = createUnitOfWork(db)
  const queued: { template: string, to: string }[] = []
  const queueMail = async (_tx: Tx, request: { template: string, to: string }) => {
    queued.push(request)
    return randomUUID()
  }
  const auth = createAuth({ db, baseUrl, secret, sendSignInCode: async () => {}, logger: silentLogger })
  const wiring = createIdentityWiring({ db, queueMail: queueMail as never })
  const app = createApp(silentLogger, async () => ({ database: true, jobs: true }), {
    authHandler: auth.handler,
    origin,
    readSession: createSessionReader(auth),
    loadIdentity: makeLoadIdentity({ uow, profiles: createGuestProfileRepository(), access: createAccessRepository() }),
    listMyStores: makeListMyStores({ uow, memberships: createMembershipRepository() }),
  }, {
    idempotency: idempotency({ db, clock: systemClock, actorId: idempotencyActor }),
    withoutIdempotencyKey: [invitationPreviewPath],
    routes: [routes => registerIdentityRoutes(routes, wiring.useCases)],
  })

  async function call(path: string, init: { method?: string, headers?: Record<string, string>, body?: object, key?: string | null } = {}) {
    const method = init.method ?? 'GET'
    const headers: Record<string, string> = { ...(method === 'GET' ? {} : { Origin: origin }), ...init.headers }
    if (method !== 'GET' && init.key !== null && init.key !== undefined)
      headers['Idempotency-Key'] = init.key
    if (init.body)
      headers['Content-Type'] = 'application/json'
    return app.request(`${baseUrl}${path}`, { method, headers, body: init.body ? JSON.stringify(init.body) : undefined })
  }

  async function person(name = '') {
    const email = `person-${randomUUID().slice(0, 8)}@example.ch`
    const { rows } = await pool.query<{ id: string }>(`insert into identity."user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, email])
    return { userId: rows[0]!.id, email, headers: { Cookie: await sessionCookie(auth, rows[0]!.id, secret) } }
  }

  async function storeOf(owner: { userId: string }, status = 'live') {
    const storeId = randomUUID()
    await insertStore(pool, storeId, status, 'Lucerne Andenken')
    await pool.query(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, 'owner', now())`, [owner.userId, storeId])
    return storeId
  }

  // An invitation row with a known token, as the mail attempt leaves it after minting the link.
  async function sentInvitation(storeId: string, email: string, options: { role?: string, invitedBy?: string | null, expiresIn?: number } = {}) {
    const token = newInvitationToken()
    await pool.query(
      `insert into identity.store_invitations (store_id, email, role, token_hash, expires_at, invited_by) values ($1, $2, $3, $4, now() + ($5 || ' milliseconds')::interval, $6)`,
      [storeId, email, options.role ?? 'manager', hashInvitationToken(token), String(options.expiresIn ?? 7 * 24 * 60 * 60 * 1000), options.invitedBy ?? null],
    )
    return token
  }

  const preview = (token: string) => call(invitationPreviewPath, { method: 'POST', body: { token } })
  const accept = (who: { headers: Record<string, string> }, token: string) => call('/api/me/invitations/accept', { method: 'POST', headers: who.headers, body: { token }, key: randomUUID() })
  const me = async (who: { headers: Record<string, string> }) => (await call('/api/me', { headers: who.headers })).json() as Promise<{ guestId: string, stores: { storeId: string, role: string, status: string }[] }>

  return { uow, app, call, person, storeOf, sentInvitation, preview, accept, me, queued, wiring, auth }
}

describe('[E2.4][AC02] the invitation preview over HTTP', () => {
  it('[E2.4][AC02] shows the store, the role, the inviter and the state without a session or a key, and never the address, for open, expired, revoked and accepted', async () => {
    const owner = await env.person('Ngoc Tran')
    const invitee = await env.person()
    const storeId = await env.storeOf(owner)
    const token = await env.sentInvitation(storeId, invitee.email, { invitedBy: owner.userId })
    const texts: string[] = []
    const state = async () => {
      const response = await env.preview(token)
      texts.push(await response.clone().text())
      return { status: response.status, body: await response.json() }
    }

    expect(await state()).toEqual({ status: 200, body: { storeName: 'Lucerne Andenken', role: 'manager', inviterName: 'Ngoc Tran', state: 'open' } })
    await pool.query(`update identity.store_invitations set expires_at = now() - interval '1 second' where store_id = $1`, [storeId])
    expect((await state()).body).toMatchObject({ state: 'expired' })
    await pool.query(`update identity.store_invitations set revoked_at = now() where store_id = $1`, [storeId])
    expect((await state()).body).toMatchObject({ state: 'revoked' })
    await pool.query(`update identity.store_invitations set revoked_at = null, expires_at = now() + interval '1 day', accepted_by = $2 where store_id = $1`, [storeId, invitee.userId])
    expect((await state()).body).toMatchObject({ state: 'accepted' })
    for (const text of texts)
      expect(text.toLowerCase()).not.toContain(invitee.email.split('@')[0])
  })

  it('[E2.4][AC02] a user with no name gives a null inviter, never their address, and an unknown token is a plain not-found', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const token = await env.sentInvitation(storeId, 'someone@example.ch', { invitedBy: owner.userId })

    const response = await env.preview(token)
    expect(await response.json()).toMatchObject({ inviterName: null })
    expect(await env.sentInvitation(storeId, 'old@example.ch').then(env.preview).then(answer => answer.json())).toMatchObject({ inviterName: null })

    const unknown = await env.preview(newInvitationToken())
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toMatchObject({ type: 'invitation-not-found' })
  })

  it('[E2.4][AC02] a token in the query string is not accepted, and a write route still needs a key', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const token = await env.sentInvitation(storeId, 'someone@example.ch')

    const inQuery = await env.call(`${invitationPreviewPath}?token=${token}`, { method: 'POST' })
    expect(inQuery.status).toBe(400)
    expect(await env.call('/api/me/invitations/accept', { method: 'POST', headers: owner.headers, body: { token } })).toHaveProperty('status', 400)
  })

  it('[E2.4][AC02] a preview does not lock or change the invitation, so a parallel accept still succeeds', async () => {
    const owner = await env.person()
    const invitee = await env.person()
    const storeId = await env.storeOf(owner)
    const token = await env.sentInvitation(storeId, invitee.email, { invitedBy: owner.userId })

    const answers = await Promise.all([env.preview(token), env.accept(invitee, token), env.preview(token)])

    expect(answers.map(answer => answer.status)).toEqual([200, 200, 200])
  })
})

describe('[E2.4] GET /api/me lists the caller\'s stores', () => {
  it('[E2.4] is empty for a guest, shows only the caller\'s memberships, and gains the store when an invitation is accepted', async () => {
    const owner = await env.person()
    const stranger = await env.person()
    const invitee = await env.person()
    const storeId = await env.storeOf(owner, 'onboarding')
    const elsewhere = await env.storeOf(stranger)
    const token = await env.sentInvitation(storeId, invitee.email)

    expect((await env.me(invitee)).stores).toEqual([])
    expect((await env.me(owner)).stores).toEqual([{ storeId, role: 'owner', status: 'onboarding' }])
    expect((await env.me(stranger)).stores).toEqual([{ storeId: elsewhere, role: 'owner', status: 'live' }])

    expect((await env.accept(invitee, token)).status).toBe(200)

    expect((await env.me(invitee)).stores).toEqual([{ storeId, role: 'manager', status: 'onboarding' }])
    expect((await env.me(stranger)).stores).toEqual([{ storeId: elsewhere, role: 'owner', status: 'live' }])
  })

  it('[E2.4] is empty for a Super Admin who holds no membership', async () => {
    const admin = await env.person()
    await pool.query('insert into identity.platform_admins (user_id) values ($1)', [admin.userId])

    expect((await env.me(admin)).stores).toEqual([])
  })
})

describe('[E2.4][AC02] a repeated accept', () => {
  it('[E2.4][AC02] by the same user answers the first answer again, by another user is refused, and after removal is refused', async () => {
    const owner = await env.person()
    const invitee = await env.person()
    const stranger = await env.person()
    const storeId = await env.storeOf(owner)
    const token = await env.sentInvitation(storeId, invitee.email)

    const first = await env.accept(invitee, token)
    const again = await env.accept(invitee, token)

    expect(first.status).toBe(200)
    expect(await again.json()).toEqual(await first.json())
    expect(Number((await pool.query('select count(*) from identity.store_memberships where store_id = $1', [storeId])).rows[0].count)).toBe(2)
    const other = await env.accept(stranger, token)
    expect(other.status).toBe(403)
    expect(await other.json()).toMatchObject({ type: 'invitation-email-mismatch' })

    await pool.query('delete from identity.store_memberships where user_id = $1 and store_id = $2', [invitee.userId, storeId])
    const removed = await env.accept(invitee, token)
    expect(removed.status).toBe(409)
    expect(await removed.json()).toMatchObject({ type: 'invitation-already-accepted' })
  })
})

describe('[E2.4] the one open Manager invitation per address', () => {
  const insertManager = (storeId: string, email: string, invitedBy: string) => env.uow.run(tx => createInvitationRepository().insert(tx, { storeId, email, role: 'manager', expiresAt: new Date(Date.now() + 60_000), invitedBy }))

  it('[E2.4] the database refuses a second open invitation for the address, and the repository names it', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    await insertManager(storeId, 'twice@example.ch', owner.userId)

    await expect(insertManager(storeId, 'twice@example.ch', owner.userId)).rejects.toBeInstanceOf(OpenManagerInvitationExists)
    await insertManager(await env.storeOf(owner), 'twice@example.ch', owner.userId)
    await pool.query(`update identity.store_invitations set revoked_at = now() where store_id = $1`, [storeId])
    await insertManager(storeId, 'twice@example.ch', owner.userId)
  })

  it('[E2.4] another failure is not named as an open invitation', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)

    await expect(env.uow.run(tx => createInvitationRepository().insert(tx, { storeId, email: 'Not Lower@example.ch', role: 'manager', expiresAt: new Date(), invitedBy: owner.userId }))).rejects.not.toBeInstanceOf(OpenManagerInvitationExists)
  })

  it('[E2.4] a race past the use case\'s own check answers invitation-already-open, and writes and queues nothing more', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const repository = createInvitationRepository()
    const queued: string[] = []
    const blind = makeInviteManager({
      uow: env.uow,
      stores: env.wiring.stores,
      invitations: { ...repository, findOpenManagerByEmail: async () => undefined },
      memberships: createMembershipRepository(),
      users: createUserDirectory(),
      admins: { has: async () => false, insertFirst: async () => {} },
      queueMail: async (_tx, request) => {
        queued.push(request.to)
        return randomUUID()
      },
      audit: { record: async () => {} },
      clock: systemClock,
    })
    const actor = { kind: 'staff' as const, userId: owner.userId, guestId: randomUUID(), stores: new Map([[storeId, 'owner' as const]]) }

    expect(await blind(actor, storeId, { email: 'race@example.ch' }, null)).toMatchObject({ ok: true })
    expect(await blind(actor, storeId, { email: 'race@example.ch' }, null)).toEqual({ ok: false, reason: 'invitation-already-open' })
    expect(queued).toEqual(['race@example.ch'])
    expect(Number((await pool.query(`select count(*) from identity.store_invitations where store_id = $1`, [storeId])).rows[0].count)).toBe(1)
  })

  it('[E2.4] the invite and the resend routes record who invited', async () => {
    const owner = await env.person('Ngoc Tran')
    const storeId = await env.storeOf(owner)

    const created = await env.call(`/api/store/${storeId}/member-invitations`, { method: 'POST', headers: owner.headers, body: { email: 'lena@example.ch' }, key: randomUUID() })
    const { id } = await created.json() as { id: string }
    await pool.query('update identity.store_invitations set invited_by = null where id = $1', [id])
    const invitedBy = async () => (await pool.query<{ invited_by: string | null }>('select invited_by from identity.store_invitations where id = $1', [id])).rows[0]?.invited_by

    expect(await invitedBy()).toBeNull()
    expect((await env.call(`/api/store/${storeId}/member-invitations/${id}/resend`, { method: 'POST', headers: owner.headers, key: randomUUID() })).status).toBe(200)
    expect(await invitedBy()).toBe(owner.userId)
    const fresh = await env.call(`/api/store/${storeId}/member-invitations`, { method: 'POST', headers: owner.headers, body: { email: 'other@example.ch' }, key: randomUUID() })
    const row = (await pool.query<{ invited_by: string }>('select invited_by from identity.store_invitations where id = $1', [(await fresh.json() as { id: string }).id])).rows[0]
    expect(row?.invited_by).toBe(owner.userId)
  })
})

describe('[E2.4] migration 0005 removes duplicate open Manager invitations before it adds the index', () => {
  it('[E2.4] keeps the newest open row per store and address, and leaves other rows alone', async () => {
    const owner = await env.person()
    const storeId = await env.storeOf(owner)
    const otherStore = await env.storeOf(owner)
    const statements = readFileSync(new URL('../../migrations/0005_preview_me.sql', import.meta.url), 'utf8').split('--> statement-breakpoint').map(statement => statement.trim())
    const cleanup = statements.find(statement => statement.startsWith('UPDATE'))
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('drop index identity.store_invitations_one_open_manager_idx')
      const insert = async (store: string, email: string, role = 'manager', revoked = false, accepted = false) => (await client.query<{ id: string }>(
        `insert into identity.store_invitations (store_id, email, role, expires_at, revoked_at, accepted_by) values ($1, $2, $3, now() + interval '1 day', ${revoked ? 'now()' : 'null'}, ${accepted ? `'${owner.userId}'` : 'null'}) returning id`,
        [store, email, role],
      )).rows[0]!.id
      const oldest = await insert(storeId, 'dup@example.ch')
      const middle = await insert(storeId, 'dup@example.ch')
      const newest = await insert(storeId, 'dup@example.ch')
      const revoked = await insert(storeId, 'dup@example.ch', 'manager', true)
      const accepted = await insert(storeId, 'dup@example.ch', 'manager', false, true)
      const single = await insert(storeId, 'single@example.ch')
      const elsewhere = await insert(otherStore, 'dup@example.ch')
      const ownerRow = await insert(storeId, 'dup@example.ch', 'owner')
      const open = async () => (await client.query<{ id: string, revoked_at: Date | null }>('select id, revoked_at from identity.store_invitations where store_id = any($1)', [[storeId, otherStore]])).rows.filter(row => row.revoked_at === null).map(row => row.id).sort()

      await client.query(cleanup!)

      expect(await open()).toEqual([newest, accepted, single, elsewhere, ownerRow].sort())
      expect(await open()).not.toContain(oldest)
      expect(await open()).not.toContain(middle)
      expect(await open()).not.toContain(revoked)
      await client.query(statements.find(statement => statement.startsWith('CREATE UNIQUE INDEX'))!)
    }
    finally {
      await client.query('rollback')
      client.release()
    }
  })
})
