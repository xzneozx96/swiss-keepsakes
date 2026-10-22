import type { FakeTx } from '../../support/fake-identity.ts'
import { invitationLifetimeMs } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { invitationScreens, makeInvitationLink } from '../../../src/modules/identity/application/invitation-link.ts'
import { hashInvitationToken, newInvitationToken } from '../../../src/modules/identity/application/invitation-token.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const start = new Date('2026-10-20T08:00:00Z')
const tx: FakeTx = { id: 0 }

async function setup() {
  const fake = createFakeIdentity()
  const clock = createManualClock(start)
  const store = fake.addStore({ slug: 'lucerne' })
  const owner = await fake.invitations.insert(tx, { storeId: store.id, email: 'ngoc.tran@example.ch', role: 'owner', expiresAt: new Date(start.getTime() + invitationLifetimeMs) })
  const manager = await fake.invitations.insert(tx, { storeId: store.id, email: 'lena.meier@example.ch', role: 'manager', expiresAt: new Date(start.getTime() + invitationLifetimeMs) })
  let counter = 0
  const link = makeInvitationLink({ invitations: fake.invitations, clock, newToken: () => `token-${++counter}`, appUrl: 'https://shop.example', screens: { N20: '/store/onboarding' } })
  return { fake, clock, owner, manager, link }
}

describe('[E2.3] the identity module\'s InvitationLink', () => {
  it('[E2.3] mints a token, stores only its hash, and returns the A02 link with the raw token after the #', async () => {
    const { fake, owner, link } = await setup()

    const url = await link(tx, 'N20', owner.id)

    expect(url).toBe('https://shop.example/#/store/onboarding?invitation=token-1')
    expect(fake.state.invitations.get(owner.id)?.tokenHash).toBe(hashInvitationToken('token-1'))
    expect(JSON.stringify([...fake.state.invitations.values()])).not.toContain('token-1')
  })

  it('[E2.3] puts the token where no server request carries it, after the #', async () => {
    const { owner, link } = await setup()
    const url = new URL((await link(tx, 'N20', owner.id)) ?? '')

    expect(url.search).toBe('')
    expect(url.pathname).toBe('/')
    expect(url.hash).toContain('invitation=token-1')
  })

  it('[E2.3] each call mints a new token, so only the newest mail\'s link works', async () => {
    const { fake, owner, link } = await setup()

    await link(tx, 'N20', owner.id)
    await link(tx, 'N20', owner.id)

    expect(fake.state.invitations.get(owner.id)?.tokenHash).toBe(hashInvitationToken('token-2'))
    expect(await fake.invitations.findByTokenHashForUpdate(tx, hashInvitationToken('token-1'))).toBeUndefined()
    expect(await fake.invitations.findByTokenHashForUpdate(tx, hashInvitationToken('token-2'))).toMatchObject({ id: owner.id })
  })

  it('[E2.3] returns nothing for an accepted invitation, an expired one, a revoked one and an unknown one, and stores no token', async () => {
    const { fake, clock, owner, link } = await setup()

    expect(await link(tx, 'N20', '0190f0c2-0000-7000-8000-0000000000ff')).toBeUndefined()
    fake.state.invitations.get(owner.id)!.acceptedBy = 'user-1'
    expect(await link(tx, 'N20', owner.id)).toBeUndefined()
    fake.state.invitations.get(owner.id)!.acceptedBy = null
    clock.advance(invitationLifetimeMs)
    expect(await link(tx, 'N20', owner.id)).toBeUndefined()
    clock.advance(-invitationLifetimeMs)
    fake.state.invitations.get(owner.id)!.revokedAt = new Date(start.getTime() - 1)
    expect(await link(tx, 'N20', owner.id)).toBeUndefined()

    expect(fake.state.invitations.get(owner.id)?.tokenHash).toBeNull()
  })

  it('[E2.3] N20 is for an Owner invitation, and a template that does not match the role gets no link', async () => {
    const { fake, owner, manager, link } = await setup()
    const withBoth = makeInvitationLink({ invitations: fake.invitations, clock: createManualClock(start), newToken: () => 'token-x', appUrl: 'https://shop.example', screens: invitationScreens })

    expect(await withBoth(tx, 'N18', owner.id)).toBeUndefined()
    expect(await withBoth(tx, 'N20', manager.id)).toBeUndefined()
    expect(await withBoth(tx, 'N18', manager.id)).toBe('https://shop.example/#/invitation?invitation=token-x')
    expect(await link(tx, 'N20', owner.id)).toContain('/store/onboarding')
  })

  it('[E2.3] a template with no screen fails loudly instead of returning a link that goes nowhere', async () => {
    const { manager, link } = await setup()

    await expect(link(tx, 'N18', manager.id)).rejects.toThrow('No screen is set for the N18 link')
  })

  it('[E2.3] a token is 256 random bits in base64url, and no two are alike', () => {
    const tokens = new Set<string>()
    for (let index = 0; index < 50; index++)
      tokens.add(newInvitationToken())

    expect(tokens.size).toBe(50)
    for (const token of tokens)
      expect(token).toMatch(/^[\w-]{43}$/)
  })

  it('[E2.3] the hash is a SHA-256 in hex that differs for a different token', () => {
    expect(hashInvitationToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(hashInvitationToken('abc')).not.toBe(hashInvitationToken('abd'))
  })
})
