import type { InvitationRole } from '../../../src/modules/identity/ports.ts'
import { invitationLifetimeMs } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { makeAcceptInvitation } from '../../../src/modules/identity/application/accept-invitation.ts'
import { hashInvitationToken } from '../../../src/modules/identity/application/invitation-token.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const token = 'T0ken-of-the-owner-link-0123456789abcdef'
const start = new Date('2026-10-20T08:00:00Z')

function setup(options: { role?: InvitationRole, status?: 'invited' | 'onboarding' } = {}) {
  const fake = createFakeIdentity()
  const clock = createManualClock(start)
  const store = fake.addStore({ slug: 'lucerne', status: options.status ?? 'invited' })
  const invitation = fake.invitations.insert({ id: 0 }, { storeId: store.id, email: 'ngoc.tran@example.ch', role: options.role ?? 'owner', expiresAt: new Date(start.getTime() + invitationLifetimeMs) })
  fake.addUser('user-ngoc', 'ngoc.tran@example.ch')
  fake.addUser('user-other', 'someone.else@example.ch')
  const accept = makeAcceptInvitation({ uow: fake.uow, invitations: fake.invitations, stores: fake.stores, memberships: fake.memberships, users: fake.users, admins: fake.admins, audit: fake.audit, clock })
  const mint = async () => {
    const { id } = await invitation
    await fake.invitations.setTokenHash({ id: 0 }, id, hashInvitationToken(token))
    return id
  }
  return { fake, clock, store, accept, mint }
}

describe('[E2.3][S8] a signed-in user accepts an invitation', () => {
  it('[E2.3][S8] the user with the invited address becomes the Owner, and the store moves from invited to onboarding', async () => {
    const { fake, store, accept, mint } = setup()
    const invitationId = await mint()

    const result = await accept({ userId: 'user-ngoc' }, token, 'request-1')

    expect(result).toEqual({ ok: true, storeId: store.id, role: 'owner', storeStatus: 'onboarding' })
    expect(fake.state.memberships).toEqual([{ id: expect.any(String), userId: 'user-ngoc', storeId: store.id, role: 'owner', acceptedAt: start }])
    expect(fake.state.invitations.get(invitationId)?.acceptedBy).toBe('user-ngoc')
    expect(fake.state.stores.get(store.id)?.status).toBe('onboarding')
    expect(fake.state.audit.map(({ entity, action }) => `${entity}:${action}`)).toEqual(['store_invitation:accepted', 'store:status-changed'])
  })

  it('[E2.3][S8] the addresses are compared in one form: case and surrounding spaces do not matter', async () => {
    const { fake, accept, mint } = setup()
    await mint()
    fake.addUser('user-ngoc', ' Ngoc.Tran@EXAMPLE.ch ')

    expect((await accept({ userId: 'user-ngoc' }, token, null)).ok).toBe(true)
  })

  it('[E2.3][S8] a signed-in user with another address is refused, and the invitation stays open for the right one', async () => {
    const { fake, store, accept, mint } = setup()
    const invitationId = await mint()

    const refused = await accept({ userId: 'user-other' }, token, null)

    expect(refused).toEqual({ ok: false, reason: 'invitation-email-mismatch' })
    expect(JSON.stringify(refused)).not.toContain('example.ch')
    expect(fake.state.memberships).toEqual([])
    expect(fake.state.invitations.get(invitationId)?.acceptedBy).toBeNull()
    expect(fake.state.stores.get(store.id)?.status).toBe('invited')
    expect((await accept({ userId: 'user-ngoc' }, token, null)).ok).toBe(true)
  })

  it('[E2.3][S8] an address that is a prefix, a suffix or a plus-variant of the invited one is another address', async () => {
    const { fake, accept, mint } = setup()
    await mint()
    for (const [index, email] of ['ngoc.tran@example.c', 'ngoc.tran+shop@example.ch', 'xngoc.tran@example.ch', 'ngoc.tran@example.ch.evil.example'].entries())
      fake.addUser(`user-${index}`, email)

    for (let index = 0; index < 4; index++)
      expect(await accept({ userId: `user-${index}` }, token, null)).toEqual({ ok: false, reason: 'invitation-email-mismatch' })
    expect(fake.state.memberships).toEqual([])
  })

  it('[E2.3][S8] a user whose address Better Auth did not verify is refused, though it matches', async () => {
    const { fake, accept, mint } = setup()
    await mint()
    fake.addUser('user-ngoc', 'ngoc.tran@example.ch', false)

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-email-unverified' })
    expect(fake.state.memberships).toEqual([])
  })

  it('[E2.3] a user that has no account row is refused like another address', async () => {
    const { accept, mint } = setup()
    await mint()

    expect(await accept({ userId: 'user-unknown' }, token, null)).toEqual({ ok: false, reason: 'invitation-email-mismatch' })
  })

  it('[E2.3] an unknown token is refused, and says nothing else', async () => {
    const { fake, accept, mint } = setup()
    await mint()

    expect(await accept({ userId: 'user-ngoc' }, 'a-token-nobody-was-given-0123456789', null)).toEqual({ ok: false, reason: 'invitation-not-found' })
    expect(fake.state.memberships).toEqual([])
  })

  it('[E2.3] the raw token is not what is stored: a row that holds only the token itself is not found', async () => {
    const { fake, accept, mint } = setup()
    const invitationId = await mint()
    fake.state.invitations.get(invitationId)!.tokenHash = token

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-not-found' })
  })

  it('[E2.3] an invitation is single use: the second accept fails, from the same user or another, and adds nothing', async () => {
    const { fake, accept, mint } = setup()
    await mint()

    expect((await accept({ userId: 'user-ngoc' }, token, null)).ok).toBe(true)

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-already-accepted' })
    // Someone else holding the link is told it is the wrong address, which reveals nothing about the invitation.
    expect(await accept({ userId: 'user-other' }, token, null)).toEqual({ ok: false, reason: 'invitation-email-mismatch' })
    expect(fake.state.memberships).toHaveLength(1)
  })

  it('[E2.3] an expired invitation is refused from the second it expires, and nothing changes', async () => {
    const { fake, clock, store, accept, mint } = setup()
    await mint()
    clock.advance(invitationLifetimeMs - 1)
    expect((await accept({ userId: 'user-other' }, token, null)).ok).toBe(false)
    clock.advance(1)

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-expired' })
    expect(fake.state.memberships).toEqual([])
    expect(fake.state.stores.get(store.id)?.status).toBe('invited')
  })

  it('[E2.3] an invitation that expires one millisecond later is still open', async () => {
    const { clock, accept, mint } = setup()
    await mint()
    clock.advance(invitationLifetimeMs - 1)

    expect((await accept({ userId: 'user-ngoc' }, token, null)).ok).toBe(true)
  })

  it('[E2.3] a user who already belongs to the store is refused, and the acceptance is undone', async () => {
    const { fake, store, accept, mint } = setup()
    const invitationId = await mint()
    fake.state.memberships.push({ id: 'membership-1', userId: 'user-ngoc', storeId: store.id, role: 'manager', acceptedAt: start })

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'already-a-member' })
    expect(fake.state.invitations.get(invitationId)?.acceptedBy).toBeNull()
    expect(fake.state.stores.get(store.id)?.status).toBe('invited')
    expect(fake.state.memberships).toHaveLength(1)
  })

  it('[E2.3] a manager invitation adds a manager and leaves the store\'s status alone', async () => {
    const { fake, store, accept, mint } = setup({ role: 'manager', status: 'onboarding' })
    await mint()

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: true, storeId: store.id, role: 'manager', storeStatus: 'onboarding' })
    expect(fake.state.memberships[0]).toMatchObject({ role: 'manager' })
    expect(fake.state.audit.map(({ action }) => action)).toEqual(['accepted'])
  })

  it('[E2.3] an Owner accepting for a suspended store leaves it suspended', async () => {
    const { fake, store, accept, mint } = setup({ status: 'onboarding' })
    await mint()
    fake.state.stores.get(store.id)!.status = 'suspended'

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toMatchObject({ ok: true, storeStatus: 'suspended' })
  })
})

describe('[E2.3][S8] a revoked invitation and a Super Admin', () => {
  it('[E2.3][S8] a revoked invitation is refused with its own code, with no membership and no status change', async () => {
    const { fake, store, accept, mint } = setup()
    const invitationId = await mint()
    fake.state.invitations.get(invitationId)!.revokedAt = new Date(start.getTime() - 1)

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-revoked' })

    expect(fake.state.memberships).toEqual([])
    expect(fake.state.invitations.get(invitationId)?.acceptedBy).toBeNull()
    expect(fake.state.stores.get(store.id)?.status).toBe('invited')
  })

  it('[E2.3][S8] a Super Admin is refused with its own code, even with the invited address, and the invitation stays open', async () => {
    const { fake, store, accept, mint } = setup()
    const invitationId = await mint()
    await fake.admins.insertFirst({ id: 0 }, 'user-ngoc')

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-super-admin' })

    expect(fake.state.memberships).toEqual([])
    expect(fake.state.invitations.get(invitationId)?.acceptedBy).toBeNull()
    expect(fake.state.stores.get(store.id)?.status).toBe('invited')
  })

  it('[E2.3][S8] a Super Admin with an unknown token learns nothing but that the link is not valid', async () => {
    const { fake, accept } = setup()
    await fake.admins.insertFirst({ id: 0 }, 'user-ngoc')

    expect(await accept({ userId: 'user-ngoc' }, token, null)).toEqual({ ok: false, reason: 'invitation-not-found' })
  })
})
