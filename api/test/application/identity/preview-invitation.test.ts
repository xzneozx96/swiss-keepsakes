import { invitationLifetimeMs } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { hashInvitationToken } from '../../../src/modules/identity/application/invitation-token.ts'
import { makeListMyStores } from '../../../src/modules/identity/application/list-my-stores.ts'
import { makePreviewInvitation } from '../../../src/modules/identity/application/preview-invitation.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const start = new Date('2026-10-22T08:00:00Z')
const tx = { id: 0 }
const token = 'T0ken-of-the-preview-link-0123456789abcdef'

async function setup(options: { inviterName?: string, role?: 'owner' | 'manager', invitedBy?: string | null } = {}) {
  const fake = createFakeIdentity()
  const clock = createManualClock(start)
  const store = fake.addStore({ slug: 'lucerne', name: 'Lucerne Andenken' })
  fake.addUser('user-ngoc', 'ngoc.tran@example.ch', true, options.inviterName ?? 'Ngoc Tran')
  const invitation = await fake.invitations.insert(tx, { storeId: store.id, email: 'lena.meier@example.ch', role: options.role ?? 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs), invitedBy: options.invitedBy === undefined ? 'user-ngoc' : options.invitedBy as string })
  await fake.invitations.setTokenHash(tx, invitation.id, hashInvitationToken(token))
  return { fake, clock, store, invitation, preview: makePreviewInvitation({ uow: fake.uow, invitations: fake.invitations, clock }) }
}

describe('[E2.4][AC02] the invitation preview', () => {
  it('[E2.4][AC02] answers the store, the role, the inviter\'s name and the state, and never the invited address', async () => {
    const { preview } = await setup()

    const result = await preview(token)

    expect(result).toEqual({ ok: true, preview: { storeName: 'Lucerne Andenken', role: 'manager', inviterName: 'Ngoc Tran', state: 'open' } })
    expect(JSON.stringify(result)).not.toMatch(/lena|meier|example\.ch|@/i)
  })

  it('[E2.4][AC02] the inviter is null when the user has no name or no inviter is known, and never falls back to an address', async () => {
    for (const options of [{ inviterName: '   ' }, { invitedBy: null }]) {
      const { preview } = await setup(options)

      const result = await preview(token)

      expect(result).toMatchObject({ ok: true, preview: { inviterName: null } })
      expect(JSON.stringify(result)).not.toContain('@')
    }
  })

  it('[E2.4][AC02] an Owner invitation answers the owner role and never names the inviter, who is platform staff', async () => {
    const { preview } = await setup({ role: 'owner' })

    expect(await preview(token)).toEqual({ ok: true, preview: { storeName: 'Lucerne Andenken', role: 'owner', inviterName: null, state: 'open' } })
  })

  it('[E2.4][AC02] an unknown token is not found', async () => {
    const { preview } = await setup()

    expect(await preview('some-other-token-0123456789abcdef')).toEqual({ ok: false, reason: 'invitation-not-found' })
  })

  it('[E2.4][AC02] the state follows the invitation: open, expired from the second it expires, revoked and accepted', async () => {
    const { fake, clock, invitation, store, preview } = await setup()
    const state = async () => (await preview(token) as { ok: true, preview: { state: string } }).preview.state

    expect(await state()).toBe('open')
    clock.advance(invitationLifetimeMs - 1)
    expect(await state()).toBe('open')
    clock.advance(1)
    expect(await state()).toBe('expired')
    await fake.invitations.revoke(tx, store.id, invitation.id, clock.now())
    expect(await state()).toBe('revoked')
    fake.state.invitations.get(invitation.id)!.acceptedBy = 'user-lena'
    expect(await state()).toBe('accepted')
  })

  it('[E2.4][AC02] it changes nothing: no row, no audit entry and no mail', async () => {
    const { fake, preview } = await setup()
    const before = JSON.stringify([...fake.state.invitations.values()])

    await preview(token)
    await preview(token)

    expect(JSON.stringify([...fake.state.invitations.values()])).toBe(before)
    expect(fake.state.audit).toEqual([])
    expect(fake.state.mail).toEqual([])
  })
})

describe('[E2.4] the stores of the signed-in user', () => {
  it('[E2.4] lists only the caller\'s memberships with the role and the store\'s status', async () => {
    const { fake, store } = await setup()
    const zug = fake.addStore({ slug: 'zug', status: 'live' })
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-ngoc', storeId: store.id, role: 'owner', acceptedAt: start })
    await fake.memberships.insertIfAbsent(tx, { userId: 'user-lena', storeId: zug.id, role: 'manager', acceptedAt: start })
    const list = makeListMyStores({ uow: fake.uow, memberships: fake.memberships })

    expect(await list('user-ngoc')).toEqual([{ storeId: store.id, role: 'owner', status: 'invited' }])
    expect(await list('user-lena')).toEqual([{ storeId: zug.id, role: 'manager', status: 'live' }])
    expect(await list('user-nobody')).toEqual([])
  })
})
