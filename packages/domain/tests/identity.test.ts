import type { Actor, Permission, StoreRole } from '../src/identity'
import { describe, expect, it } from 'vitest'
import { actorFor, anonymous, can, storeRole } from '../src/identity'

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
  'manage-content': ['owner', 'manager'],
}
const rows = Object.entries(expected) as [Permission, readonly StoreRole[]][]

const owner = actorFor('user-owner', false, [{ storeId: lucerne, role: 'owner' }])
const manager = actorFor('user-manager', false, [{ storeId: lucerne, role: 'manager' }])

describe('[E2.2] actorFor builds one actor from the identity rows', () => {
  it('[E2.2] a user with no rows is a guest', () => {
    expect(actorFor('user-1', false, [])).toEqual({ kind: 'guest', userId: 'user-1' })
  })

  it('[E2.2] memberships make staff with a role per store', () => {
    const actor = actorFor('user-1', false, [{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }])

    expect(actor).toEqual({ kind: 'staff', userId: 'user-1', stores: new Map([[lucerne, 'owner'], [zug, 'manager']]) })
  })

  it('[E2.2] a platform_admins row makes a super_admin, even with memberships, and gives no store role', () => {
    const actor = actorFor('user-1', true, [{ storeId: lucerne, role: 'owner' }])

    expect(actor).toEqual({ kind: 'super_admin', userId: 'user-1' })
    expect(storeRole(actor, lucerne)).toBeUndefined()
  })
})

describe('[E2.2][AC02] can() reads the section 9 table per store membership', () => {
  it.each(rows)('[E2.2][AC02] %s in their own store is allowed to %j', (permission, roles) => {
    expect(can(owner, permission, { storeId: lucerne })).toBe(roles.includes('owner'))
    expect(can(manager, permission, { storeId: lucerne })).toBe(roles.includes('manager'))
  })

  it.each(rows)('[E2.2][AC02] %s is refused to the owner and the manager of another store', (permission) => {
    expect(can(owner, permission, { storeId: zug })).toBe(false)
    expect(can(manager, permission, { storeId: zug })).toBe(false)
  })

  const outsiders: [string, Actor][] = [
    ['anonymous', anonymous],
    ['a guest', actorFor('user-guest', false, [])],
    ['the Super Admin', actorFor('user-admin', true, [])],
  ]
  it.each(outsiders)('[E2.2][AC02] %s holds no store permission', (_, actor) => {
    for (const [permission] of rows)
      expect(can(actor, permission, { storeId: lucerne })).toBe(false)
    expect(storeRole(actor, lucerne)).toBeUndefined()
  })

  it('[E2.2][AC02] a manager cannot correct or void an external payment (AC29), the owner can', () => {
    expect(can(manager, 'correct-external-payment', { storeId: lucerne })).toBe(false)
    expect(can(owner, 'correct-external-payment', { storeId: lucerne })).toBe(true)
  })

  it('[E2.2][AC02] a person who is owner in one store and manager in another gets each store\'s role', () => {
    const actor = actorFor('user-1', false, [{ storeId: lucerne, role: 'owner' }, { storeId: zug, role: 'manager' }])

    expect(can(actor, 'manage-members', { storeId: lucerne })).toBe(true)
    expect(can(actor, 'manage-members', { storeId: zug })).toBe(false)
    expect(can(actor, 'edit-catalog', { storeId: zug })).toBe(true)
  })
})
