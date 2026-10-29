import { describe, expect, it } from 'vitest'

import { invitationView } from '@/features/stores/lib/invitation-view'

describe('[E2.15][AC02] invitationView', () => {
  it.each(['owner', 'manager'] as const)('has no refusal for a %s: signed out shows the sign-in, signed in the accept button, both in colour', (role) => {
    expect(invitationView({ role, signedIn: false })).toEqual({ kind: 'signedOut', photo: 'colour', role })
    expect(invitationView({ role, signedIn: true })).toEqual({ kind: 'ready', photo: 'colour', role })
  })

  it.each([
    ['mismatch', 'wrongAccount', 'colour'],
    ['unverified', 'wrongAccount', 'colour'],
    ['superAdmin', 'wrongAccount', 'colour'],
    ['failed', 'failed', 'colour'],
    ['expired', 'expired', 'grey'],
    ['revoked', 'withdrawn', 'grey'],
    ['accepted', 'used', 'grey'],
    ['member', 'used', 'grey'],
    ['notFound', 'notFound', 'grey'],
    ['missing', 'notFound', 'grey'],
  ] as const)('maps the refusal %s to %s with a %s photo', (refusal, kind, photo) => {
    expect(invitationView({ role: 'manager', signedIn: true, refusal })).toEqual({ kind, photo, role: 'manager' })
  })

  it('wins over the session: a refusal for a signed-out visitor still shows the refusal', () => {
    expect(invitationView({ role: 'owner', signedIn: false, refusal: 'expired' }).kind).toBe('expired')
  })
})
