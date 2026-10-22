import type { Actor, Permission, StoreRole } from '../src/identity'
import { describe, expect, it } from 'vitest'
import { actorFor, anonymous, can, canonicalId, invitationLifetimeMs, invitationState, mayOpenForSale, normaliseEmail, onboardingConditionKeys, storeInformationState, storeMaySell, storeRole, unmetConditions } from '../src/identity'

const lucerne = '0190f0c2-0000-7000-8000-000000000001'
const zug = '0190f0c2-0000-7000-8000-000000000002'

// docs/architecture/backend.md section 9, row by row. Typed as a Record, so a new permission fails the type check here.
const expected: Record<Permission, readonly StoreRole[]> = {
  'edit-catalog': ['owner', 'manager'],
  'handle-orders': ['owner', 'manager'],
  'settle-bookings': ['owner', 'manager'],
  'record-external-payment': ['owner', 'manager'],
  'correct-external-payment': ['owner'],
  'create-refund': ['owner', 'manager'],
  'record-partner-payout': ['owner', 'manager'],
  'reissue-partner-link': ['owner'],
  'manage-members': ['owner'],
  'edit-store-information': ['owner'],
  'open-store-for-sale': ['owner'],
  'manage-content': ['owner', 'manager'],
}
const rows = Object.entries(expected) as [Permission, readonly StoreRole[]][]

const who = (userId: string) => ({ userId, guestId: `guest-of-${userId}` })
const noAccess = { platformAdmin: false, memberships: [] }
const owner = actorFor(who('user-owner'), { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] })
const manager = actorFor(who('user-manager'), { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] })

describe('[E2.10] actorFor builds one actor from the identity rows', () => {
  it('[E2.10] a user with no rows is a guest', () => {
    expect(actorFor(who('user-1'), noAccess)).toEqual({ kind: 'guest', userId: 'user-1', guestId: 'guest-of-user-1' })
  })

  it('[E2.10] memberships make staff with a role per store, and staff keep their guest profile', () => {
    const actor = actorFor(who('user-1'), { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }] })

    expect(actor).toEqual({ kind: 'staff', userId: 'user-1', guestId: 'guest-of-user-1', stores: new Map([[lucerne, 'owner'], [zug, 'manager']]) })
  })

  it('[E2.10] a platform_admins row makes a super_admin, even with memberships, and gives no store role', () => {
    const actor = actorFor(who('user-1'), { platformAdmin: true, memberships: [{ storeId: lucerne, role: 'owner' }] })

    expect(actor).toEqual({ kind: 'super_admin', userId: 'user-1', guestId: 'guest-of-user-1' })
    expect(storeRole(actor, lucerne)).toBeUndefined()
  })
})

describe('[E2.10][AC02] can() reads the section 9 table per store membership', () => {
  it.each(rows)('[E2.10][AC02] %s in their own store is allowed to %j', (permission, roles) => {
    expect(can(owner, permission, { storeId: lucerne })).toBe(roles.includes('owner'))
    expect(can(manager, permission, { storeId: lucerne })).toBe(roles.includes('manager'))
  })

  it.each(rows)('[E2.10][AC02] %s is refused to the owner and the manager of another store', (permission) => {
    expect(can(owner, permission, { storeId: zug })).toBe(false)
    expect(can(manager, permission, { storeId: zug })).toBe(false)
  })

  const outsiders: [string, Actor][] = [
    ['anonymous', anonymous],
    ['a guest', actorFor(who('user-guest'), noAccess)],
    ['the Super Admin', actorFor(who('user-admin'), { platformAdmin: true, memberships: [] })],
  ]
  it.each(outsiders)('[E2.10][AC02] %s holds no store permission', (_, actor) => {
    for (const [permission] of rows)
      expect(can(actor, permission, { storeId: lucerne })).toBe(false)
    expect(storeRole(actor, lucerne)).toBeUndefined()
  })

  it('[E2.10][AC02] a manager cannot correct or void an external payment (AC29), the owner can', () => {
    expect(can(manager, 'correct-external-payment', { storeId: lucerne })).toBe(false)
    expect(can(owner, 'correct-external-payment', { storeId: lucerne })).toBe(true)
  })

  it('[E2.10][AC02] a person who is owner in one store and manager in another gets each store\'s role', () => {
    const actor = actorFor(who('user-1'), { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }] })

    expect(can(actor, 'manage-members', { storeId: lucerne })).toBe(true)
    expect(can(actor, 'manage-members', { storeId: zug })).toBe(false)
    expect(can(actor, 'edit-catalog', { storeId: zug })).toBe(true)
  })
})

describe('[E2.10] store ids are compared in their canonical form', () => {
  it('[E2.10] an upper-case store id finds the same store, in the actor and in can()', () => {
    const upper = lucerne.toUpperCase()
    const actor = actorFor(who('user-1'), { platformAdmin: false, memberships: [{ storeId: upper, role: 'owner' }] })

    expect(canonicalId(upper)).toBe(lucerne)
    expect(storeRole(actor, lucerne)).toBe('owner')
    expect(storeRole(actor, upper)).toBe('owner')
    expect(can(actor, 'manage-members', { storeId: upper })).toBe(true)
  })
})

describe('[E2.3] the Owner\'s permissions in section 9', () => {
  it('[E2.3] only the Owner edits the store information and opens the store for sale', () => {
    for (const permission of ['edit-store-information', 'open-store-for-sale'] as const) {
      expect(can(owner, permission, { storeId: lucerne })).toBe(true)
      expect(can(manager, permission, { storeId: lucerne })).toBe(false)
    }
  })
})

describe('[E2.3][S8] normaliseEmail compares addresses in one form', () => {
  it.each([
    ['Anna.Meier@Example.CH', 'anna.meier@example.ch'],
    ['  anna@example.ch\n', 'anna@example.ch'],
    ['anna@example.ch', 'anna@example.ch'],
  ])('[E2.3][S8] %j becomes %j', (input, expected) => {
    expect(normaliseEmail(input)).toBe(expected)
  })

  it('[E2.3][S8] does not merge different addresses', () => {
    expect(normaliseEmail('anna@example.ch')).not.toBe(normaliseEmail('anna+shop@example.ch'))
    expect(normaliseEmail('anna@example.ch')).not.toBe(normaliseEmail('anna@example.com'))
  })
})

describe('[E2.3][AC03] a store sells only when it is live', () => {
  it.each([['invited', false], ['onboarding', false], ['live', true], ['suspended', false]] as const)('[E2.3][AC03] %s: %s', (status, sells) => {
    expect(storeMaySell(status)).toBe(sells)
  })
})

describe('[E2.3][AC03] the four conditions of A02', () => {
  const met = { 'store-information': 'met', 'payment-account': 'met', 'catalogue': 'met', 'policies': 'met' } as const

  it('[E2.3][AC03] there are four, in the order of UX L370', () => {
    expect(onboardingConditionKeys).toEqual(['store-information', 'payment-account', 'catalogue', 'policies'])
  })

  it('[E2.3][AC03] the store opens only when all four are met', () => {
    expect(mayOpenForSale(met)).toBe(true)
    expect(unmetConditions(met)).toEqual([])
  })

  it.each(onboardingConditionKeys)('[E2.3][AC03] %s unmet or pending keeps the store closed', (key) => {
    for (const state of ['unmet', 'pending'] as const) {
      expect(mayOpenForSale({ ...met, [key]: state })).toBe(false)
      expect(unmetConditions({ ...met, [key]: state })).toEqual([key])
    }
  })

  it('[E2.3][AC03] the store information is met with a name and a language, and not with a blank name or an unknown language', () => {
    expect(storeInformationState({ name: 'Zürich Andenken', defaultLanguage: 'de' })).toBe('met')
    expect(storeInformationState({ name: '   ', defaultLanguage: 'en' })).toBe('unmet')
    expect(storeInformationState({ name: 'Zürich Andenken', defaultLanguage: 'fr' })).toBe('unmet')
  })
})

describe('[E2.3] an invitation is open, accepted or expired', () => {
  const now = new Date('2026-10-20T08:00:00Z')
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  it('[E2.3] it lives 7 days', () => {
    expect(invitationLifetimeMs).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('[E2.3] it is open before its expiry and expired from the moment of it', () => {
    expect(invitationState({ acceptedBy: null, revokedAt: null, expiresAt: inOneDay }, now)).toBe('open')
    expect(invitationState({ acceptedBy: null, revokedAt: null, expiresAt: now }, now)).toBe('expired')
    expect(invitationState({ acceptedBy: null, revokedAt: null, expiresAt: oneDayAgo }, now)).toBe('expired')
  })

  it('[E2.3] a revoked invitation is revoked whatever its expiry, and accepted wins over revoked', () => {
    expect(invitationState({ acceptedBy: null, revokedAt: oneDayAgo, expiresAt: inOneDay }, now)).toBe('revoked')
    expect(invitationState({ acceptedBy: null, revokedAt: oneDayAgo, expiresAt: oneDayAgo }, now)).toBe('revoked')
    expect(invitationState({ acceptedBy: 'user-1', revokedAt: oneDayAgo, expiresAt: inOneDay }, now)).toBe('accepted')
  })

  it('[E2.3] accepted wins over expired', () => {
    expect(invitationState({ acceptedBy: 'user-1', revokedAt: null, expiresAt: oneDayAgo }, now)).toBe('accepted')
    expect(invitationState({ acceptedBy: 'user-1', revokedAt: null, expiresAt: inOneDay }, now)).toBe('accepted')
  })
})
