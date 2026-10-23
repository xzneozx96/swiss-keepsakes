import type { Actor } from '@sk/domain/identity'
import { invitationLifetimeMs } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { makeInviteManager } from '../../../src/modules/identity/application/invite-manager.ts'
import { makeListMembers } from '../../../src/modules/identity/application/list-members.ts'
import { makeRemoveMember } from '../../../src/modules/identity/application/remove-member.ts'
import { makeResendManagerInvitation } from '../../../src/modules/identity/application/resend-manager-invitation.ts'
import { makeRevokeInvitation } from '../../../src/modules/identity/application/revoke-invitation.ts'
import { OpenManagerInvitationExists } from '../../../src/modules/identity/ports.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const start = new Date('2026-10-22T08:00:00Z')
const tx = { id: 0 }

function setup() {
  const fake = createFakeIdentity()
  const clock = createManualClock(start)
  const store = fake.addStore({ slug: 'lucerne', name: 'Lucerne Andenken', status: 'live', defaultLanguage: 'de' })
  const other = fake.addStore({ slug: 'zug' })
  fake.addUser('user-ngoc', 'ngoc.tran@example.ch', true, 'Ngoc Tran')
  fake.addUser('user-lena', 'lena.meier@example.ch')
  fake.addUser('user-zug', 'owner@zug.example.ch')
  fake.addUser('user-admin', 'admin@example.ch')
  void fake.admins.insertFirst(tx, 'user-admin')
  const staff = (userId: string, storeId: string, role: 'owner' | 'manager'): Actor => ({ kind: 'staff', userId, guestId: `guest-${userId}`, stores: new Map([[storeId, role]]) })
  const owner = staff('user-ngoc', store.id, 'owner')
  const manager = staff('user-lena', store.id, 'manager')
  const elsewhere = staff('user-zug', other.id, 'owner')
  void fake.memberships.insertIfAbsent(tx, { userId: 'user-ngoc', storeId: store.id, role: 'owner', acceptedAt: start })
  const deps = { uow: fake.uow, stores: fake.stores, invitations: fake.invitations, memberships: fake.memberships, users: fake.users, admins: fake.admins, queueMail: fake.queueMail, audit: fake.audit, clock }
  return {
    fake,
    clock,
    store,
    other,
    owner,
    manager,
    elsewhere,
    invite: makeInviteManager(deps),
    resend: makeResendManagerInvitation(deps),
    revoke: makeRevokeInvitation(deps),
    remove: makeRemoveMember(deps),
    list: makeListMembers(deps),
  }
}

describe('[E2.4][AC02] the Owner invites a Store Manager', () => {
  it('[E2.4][AC02] writes a manager invitation for the address in lower case that lives 7 days, and queues N18 with the invitation id and no token', async () => {
    const { fake, store, owner, invite } = setup()

    const result = await invite(owner, store.id, { email: '  Lena.Meier@Example.CH ' }, 'request-1')

    expect(result).toMatchObject({ ok: true, invitation: { email: 'lena.meier@example.ch', state: 'open', expiresAt: '2026-10-29T08:00:00.000Z' } })
    const [invitation] = [...fake.state.invitations.values()]
    expect(invitation).toMatchObject({ storeId: store.id, role: 'manager', email: 'lena.meier@example.ch', tokenHash: null, acceptedBy: null, revokedAt: null })
    expect(invitation?.expiresAt.getTime()).toBe(start.getTime() + invitationLifetimeMs)
    expect(fake.state.mail).toEqual([{ template: 'N18', to: 'lena.meier@example.ch', language: 'de', storeId: store.id, params: { inviter: 'Ngoc Tran', store: 'Lucerne Andenken', invitationId: invitation?.id } }])
    expect(JSON.stringify(fake.state.mail)).not.toMatch(/token|http|#\//i)
    expect(fake.state.audit).toMatchObject([{ entity: 'store_invitation', action: 'created', actor: 'staff:user-ngoc', storeId: store.id, requestId: 'request-1' }])
  })

  it('[E2.4] the language comes from the request and defaults to the store\'s, and an inviter with no name is shown by address', async () => {
    const { fake, store, owner, invite } = setup()
    fake.addUser('user-ngoc', 'ngoc.tran@example.ch', true, '  ')

    await invite(owner, store.id, { email: 'a@example.ch', language: 'en' }, null)
    await invite(owner, store.id, { email: 'b@example.ch' }, null)

    expect(fake.state.mail.map(mail => mail.language)).toEqual(['en', 'de'])
    expect(fake.state.mail[0]?.template === 'N18' && fake.state.mail[0].params.inviter).toBe('ngoc.tran@example.ch')
  })

  it('[E2.4][AC02] a Manager, a member of another store, and a guest can never invite, and nothing is written', async () => {
    const { fake, store, manager, elsewhere, invite } = setup()
    const guest: Actor = { kind: 'guest', userId: 'user-guest', guestId: 'guest' }

    for (const actor of [manager, elsewhere, guest, { kind: 'anonymous' } as const, { kind: 'super_admin', userId: 'user-admin', guestId: 'guest' } as const])
      expect(await invite(actor, store.id, { email: 'a@example.ch' }, null)).toEqual({ ok: false, reason: 'forbidden' })

    expect(fake.state.invitations.size).toBe(0)
    expect(fake.state.mail).toEqual([])
  })

  it('[E2.4] refuses an address that already belongs to the store, the Owner\'s own included, in any letters', async () => {
    const { fake, store, owner, invite } = setup()
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-lena', storeId: store.id, role: 'manager', acceptedAt: start })

    expect(await invite(owner, store.id, { email: 'LENA.MEIER@example.ch' }, null)).toEqual({ ok: false, reason: 'already-a-member' })
    expect(await invite(owner, store.id, { email: 'ngoc.tran@example.ch' }, null)).toEqual({ ok: false, reason: 'already-a-member' })
    expect(fake.state.invitations.size).toBe(0)
  })

  it('[E2.4] a member of another store may be invited, because roles are per store', async () => {
    const { store, owner, invite } = setup()

    expect(await invite(owner, store.id, { email: 'owner@zug.example.ch' }, null)).toMatchObject({ ok: true })
  })

  it('[E2.4] refuses a Super Admin\'s address, and queues no mail', async () => {
    const { fake, store, owner, invite } = setup()

    expect(await invite(owner, store.id, { email: 'Admin@example.ch' }, null)).toEqual({ ok: false, reason: 'manager-is-super-admin' })
    expect(fake.state.invitations.size).toBe(0)
    expect(fake.state.mail).toEqual([])
  })

  it('[E2.4] refuses an address with an invitation that is neither accepted nor revoked, expired or not, and lets a revoked or accepted one be invited anew', async () => {
    const { fake, clock, store, owner, invite, revoke } = setup()
    const first = await invite(owner, store.id, { email: 'new@example.ch' }, null)
    expect(await invite(owner, store.id, { email: 'NEW@example.ch' }, null)).toEqual({ ok: false, reason: 'invitation-already-open' })

    clock.advance(invitationLifetimeMs)
    expect(await invite(owner, store.id, { email: 'new@example.ch' }, null)).toEqual({ ok: false, reason: 'invitation-already-open' })
    expect(fake.state.invitations.size).toBe(1)

    await revoke(owner, store.id, first.ok ? first.invitation.id : '', null)
    expect(await invite(owner, store.id, { email: 'new@example.ch' }, null)).toMatchObject({ ok: true })
    const second = [...fake.state.invitations.values()].at(-1)!
    second.acceptedBy = 'user-x'
    expect(await invite(owner, store.id, { email: 'new@example.ch' }, null)).toMatchObject({ ok: true })
    expect(fake.state.invitations.size).toBe(3)
  })

  it('[E2.4] an invitation of another store with the same address does not count as open here', async () => {
    const { fake, store, other, owner, invite } = setup()
    await fake.invitations.insert(tx, { storeId: other.id, email: 'shared@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })

    expect(await invite(owner, store.id, { email: 'shared@example.ch' }, null)).toMatchObject({ ok: true })
  })

  it('[E2.4] a store that does not exist is not found', async () => {
    const { owner, invite } = setup()
    const ghost: Actor = { ...owner as Extract<Actor, { kind: 'staff' }>, stores: new Map([['0190f0c2-0000-7000-8000-0000000000ff', 'owner']]) }

    expect(await invite(ghost, '0190f0c2-0000-7000-8000-0000000000ff', { email: 'a@example.ch' }, null)).toEqual({ ok: false, reason: 'store-not-found' })
  })
})

describe('[E2.4][AC02] the Owner lists, resends and revokes', () => {
  it('[E2.4][AC02] lists the members and the pending Manager invitations, and only an Owner sees them', async () => {
    const { store, owner, manager, elsewhere, invite, list, revoke, fake } = setup()
    await invite(owner, store.id, { email: 'one@example.ch' }, null)
    await invite(owner, store.id, { email: 'two@example.ch' }, null)
    const revoked = [...fake.state.invitations.values()][0]!
    await revoke(owner, store.id, revoked.id, null)
    const accepted = await fake.invitations.insert(tx, { storeId: store.id, email: 'done@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    fake.state.invitations.get(accepted.id)!.acceptedBy = 'user-x'

    const result = await list(owner, store.id)

    expect(result).toEqual({ ok: true, members: [{ id: expect.any(String), email: 'ngoc.tran@example.ch', role: 'owner', acceptedAt: start.toISOString() }], invitations: [{ id: expect.any(String), email: 'two@example.ch', state: 'open', expiresAt: expect.any(String) }] })
    expect(await list(manager, store.id)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await list(elsewhere, store.id)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('[E2.4] the list never holds a token hash, a link or the raw token', async () => {
    const { fake, store, owner, invite, list } = setup()
    const created = await invite(owner, store.id, { email: 'one@example.ch' }, null)
    await fake.invitations.setTokenHash(tx, created.ok ? created.invitation.id : '', 'hash-of-the-token')

    expect(JSON.stringify(await list(owner, store.id))).not.toMatch(/hash|token|http/i)
  })

  it('[E2.4] the invitation records who invited, and a resend records who sent it again', async () => {
    const { fake, clock, store, owner, invite, resend } = setup()
    const created = await invite(owner, store.id, { email: 'one@example.ch' }, null)
    const id = created.ok ? created.invitation.id : ''
    expect(fake.state.invitations.get(id)?.invitedBy).toBe('user-ngoc')
    fake.state.invitations.get(id)!.invitedBy = 'user-someone-else'
    clock.advance(1000)

    await resend(owner, store.id, id, undefined, null)

    expect(fake.state.invitations.get(id)?.invitedBy).toBe('user-ngoc')
  })

  it('[E2.4] a race past the check ends in the unique index, which answers invitation-already-open and queues nothing', async () => {
    const { fake, store, owner } = setup()
    const racing = makeInviteManager({
      uow: fake.uow,
      stores: fake.stores,
      invitations: {
        ...fake.invitations,
        findOpenManagerByEmail: async () => undefined,
        insert: async () => {
          throw new OpenManagerInvitationExists()
        },
      },
      memberships: fake.memberships,
      users: fake.users,
      admins: fake.admins,
      queueMail: fake.queueMail,
      audit: fake.audit,
      clock: createManualClock(start),
    })

    expect(await racing(owner, store.id, { email: 'one@example.ch' }, null)).toEqual({ ok: false, reason: 'invitation-already-open' })
    expect(fake.state.mail).toEqual([])
  })

  it('[E2.4] another failure of the insert is not hidden as an open invitation', async () => {
    const { fake, store, owner } = setup()
    const failing = makeInviteManager({ uow: fake.uow, stores: fake.stores, invitations: { ...fake.invitations, insert: async () => {
      throw new Error('connection lost')
    } }, memberships: fake.memberships, users: fake.users, admins: fake.admins, queueMail: fake.queueMail, audit: fake.audit, clock: createManualClock(start) })

    await expect(failing(owner, store.id, { email: 'one@example.ch' }, null)).rejects.toThrow('connection lost')
  })

  it('[E2.4] a resend moves the expiry 7 days ahead, clears the token and queues N18 again with the same invitation id', async () => {
    const { fake, clock, store, owner, invite, resend } = setup()
    const created = await invite(owner, store.id, { email: 'one@example.ch' }, null)
    const id = created.ok ? created.invitation.id : ''
    await fake.invitations.setTokenHash(tx, id, 'old-hash')
    clock.advance(invitationLifetimeMs + 1000)

    const result = await resend(owner, store.id, id, 'en', 'request-2')

    expect(result).toMatchObject({ ok: true, invitation: { id, state: 'open' } })
    expect(fake.state.invitations.get(id)).toMatchObject({ tokenHash: null, expiresAt: new Date(clock.now().getTime() + invitationLifetimeMs) })
    expect(fake.state.mail.map(mail => mail.template === 'N18' && [mail.language, mail.params.invitationId])).toEqual([['de', id], ['en', id]])
    expect(fake.state.audit.at(-1)).toMatchObject({ entity: 'store_invitation', action: 'resent', requestId: 'request-2' })
  })

  it('[E2.4] resending is refused for an accepted or a revoked invitation, and for a Manager and another store\'s Owner', async () => {
    const { fake, store, owner, manager, elsewhere, invite, resend, revoke } = setup()
    const first = await invite(owner, store.id, { email: 'one@example.ch' }, null)
    const second = await invite(owner, store.id, { email: 'two@example.ch' }, null)
    const [one, two] = [first, second].map(result => result.ok ? result.invitation.id : '') as [string, string]
    fake.state.invitations.get(one)!.acceptedBy = 'user-x'
    await revoke(owner, store.id, two, null)
    const mails = fake.state.mail.length

    expect(await resend(owner, store.id, one, undefined, null)).toEqual({ ok: false, reason: 'invitation-already-accepted' })
    expect(await resend(owner, store.id, two, undefined, null)).toEqual({ ok: false, reason: 'invitation-revoked' })
    expect(await resend(manager, store.id, one, undefined, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await resend(elsewhere, store.id, one, undefined, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(fake.state.mail).toHaveLength(mails)
  })

  it('[E2.4] a resend of an old row is refused when its address belongs to the store now, and queues nothing', async () => {
    const { fake, store, owner, invite, resend } = setup()
    const created = await invite(owner, store.id, { email: 'lena.meier@example.ch' }, null)
    const id = created.ok ? created.invitation.id : ''
    await fake.invitations.insert(tx, { storeId: store.id, email: 'lena.meier@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-lena', storeId: store.id, role: 'manager', acceptedAt: start })
    const mails = fake.state.mail.length

    expect(await resend(owner, store.id, id, undefined, null)).toEqual({ ok: false, reason: 'already-a-member' })

    expect(fake.state.mail).toHaveLength(mails)
  })

  it('[E2.4] a removed Manager\'s open invitations for the store are revoked in the removal, so neither a resend nor a link brings them back, and another store\'s are left alone', async () => {
    const { fake, store, other, owner, invite, resend, remove } = setup()
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-lena', storeId: store.id, role: 'manager', acceptedAt: start })
    const older = await fake.invitations.insert(tx, { storeId: store.id, email: 'lena.meier@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    const accepted = await fake.invitations.insert(tx, { storeId: store.id, email: 'lena.meier@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    fake.state.invitations.get(accepted.id)!.acceptedBy = 'user-lena'
    const elsewhere = await fake.invitations.insert(tx, { storeId: other.id, email: 'lena.meier@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    const member = (await fake.memberships.list(tx, store.id)).find(entry => entry.role === 'manager')!

    expect(await remove(owner, store.id, member.id, null)).toEqual({ ok: true })

    expect(fake.state.invitations.get(older.id)?.revokedAt).toEqual(start)
    expect(fake.state.invitations.get(accepted.id)?.revokedAt).toBeNull()
    expect(fake.state.invitations.get(elsewhere.id)?.revokedAt).toBeNull()
    expect(await resend(owner, store.id, older.id, undefined, null)).toEqual({ ok: false, reason: 'invitation-revoked' })
    expect(await invite(owner, store.id, { email: 'lena.meier@example.ch' }, null)).toMatchObject({ ok: true })
  })

  it('[E2.4][AC02] an invitation of another store, or an Owner invitation, is not found under this store, by resend and by revoke', async () => {
    const { fake, other, store, owner, resend, revoke } = setup()
    const foreign = await fake.invitations.insert(tx, { storeId: other.id, email: 'z@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })
    const ownerInvitation = await fake.invitations.insert(tx, { storeId: store.id, email: 'o@example.ch', role: 'owner', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: 'user-inviter' })

    for (const id of [foreign.id, ownerInvitation.id, '0190f0c2-0000-7000-8000-0000000000ff']) {
      expect(await resend(owner, store.id, id, undefined, null)).toEqual({ ok: false, reason: 'invitation-not-found' })
      expect(await revoke(owner, store.id, id, null)).toEqual({ ok: false, reason: 'invitation-not-found' })
    }
    expect(fake.state.invitations.get(foreign.id)?.revokedAt).toBeNull()
    expect(fake.state.invitations.get(ownerInvitation.id)?.revokedAt).toBeNull()
  })

  it('[E2.4][AC02] a revoke sets revoked_at, keeps the row, and refuses an accepted, a revoked one, a Manager and an outsider', async () => {
    const { fake, store, owner, manager, elsewhere, invite, revoke } = setup()
    const first = await invite(owner, store.id, { email: 'one@example.ch' }, null)
    const second = await invite(owner, store.id, { email: 'two@example.ch' }, null)
    const [one, two] = [first, second].map(result => result.ok ? result.invitation.id : '') as [string, string]

    expect(await revoke(manager, store.id, one, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await revoke(elsewhere, store.id, one, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(fake.state.invitations.get(one)?.revokedAt).toBeNull()

    expect(await revoke(owner, store.id, one, 'request-3')).toMatchObject({ ok: true, invitation: { id: one, state: 'revoked' } })
    expect(fake.state.invitations.get(one)?.revokedAt).toEqual(start)
    expect(fake.state.audit.at(-1)).toMatchObject({ entity: 'store_invitation', action: 'revoked', requestId: 'request-3' })
    expect(await revoke(owner, store.id, one, null)).toEqual({ ok: false, reason: 'invitation-revoked' })
    fake.state.invitations.get(two)!.acceptedBy = 'user-x'
    expect(await revoke(owner, store.id, two, null)).toEqual({ ok: false, reason: 'invitation-already-accepted' })
  })
})

describe('[E2.4][AC02] the Owner removes a Store Manager', () => {
  async function withManager() {
    const context = setup()
    await context.fake.memberships.insertIfAbsent(tx, { userId: 'user-lena', storeId: context.store.id, role: 'manager', acceptedAt: start })
    const members = await context.fake.memberships.list(tx, context.store.id)
    return { ...context, ownerMember: members.find(member => member.role === 'owner')!, managerMember: members.find(member => member.role === 'manager')! }
  }

  it('[E2.4][AC02] removes the membership and records who did it', async () => {
    const { fake, store, owner, managerMember, remove } = await withManager()

    expect(await remove(owner, store.id, managerMember.id, 'request-4')).toEqual({ ok: true })

    expect(await fake.memberships.has(tx, store.id, 'user-lena')).toBe(false)
    expect(fake.state.audit.at(-1)).toMatchObject({ entity: 'store_membership', action: 'removed', actor: 'staff:user-ngoc', before: { role: 'manager' }, requestId: 'request-4' })
  })

  it('[E2.4][AC02] an Owner is never removed here, so the last Owner and the caller stay', async () => {
    const { fake, store, owner, ownerMember, remove } = await withManager()

    expect(await remove(owner, store.id, ownerMember.id, null)).toEqual({ ok: false, reason: 'cannot-remove-owner' })

    expect(await fake.memberships.has(tx, store.id, 'user-ngoc')).toBe(true)
  })

  it('[E2.4][AC02] a Manager and another store\'s Owner cannot remove anyone', async () => {
    const { fake, store, manager, elsewhere, managerMember, remove } = await withManager()

    expect(await remove(manager, store.id, managerMember.id, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await remove(elsewhere, store.id, managerMember.id, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await fake.memberships.has(tx, store.id, 'user-lena')).toBe(true)
  })

  it('[E2.4][AC02] a membership of another store, or an unknown one, is not found under this store', async () => {
    const { fake, store, other, owner, remove } = await withManager()
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-x', storeId: other.id, role: 'manager', acceptedAt: start })
    const foreign = (await fake.memberships.list(tx, other.id))[0]!

    expect(await remove(owner, store.id, foreign.id, null)).toEqual({ ok: false, reason: 'member-not-found' })
    expect(await remove(owner, store.id, '0190f0c2-0000-7000-8000-0000000000ff', null)).toEqual({ ok: false, reason: 'member-not-found' })
    expect(await fake.memberships.has(tx, other.id, 'user-x')).toBe(true)
  })
})
