// Who is asking, and what a store role may do (docs/architecture/backend.md section 9).
// This file imports nothing, because the API runs its compiled copy and the rest of the package is not compiled
// (package.json `exports`, tsconfig.build.json).

export type StoreRole = 'owner' | 'manager'

// User ids are neon_auth.user ids, the JWT `sub`. Partners come with their own session (E5.3).
export type Actor =
  | { kind: 'anonymous' }
  | { kind: 'guest', userId: string }
  | { kind: 'staff', userId: string, stores: ReadonlyMap<string, StoreRole> }
  | { kind: 'super_admin', userId: string }

export interface Membership {
  storeId: string
  role: StoreRole
}

export const anonymous: Actor = { kind: 'anonymous' }

// A row in identity.platform_admins wins over memberships: the Super Admin works in /api/admin/* only (PRD L108).
export function actorFor(userId: string, platformAdmin: boolean, memberships: readonly Membership[]): Actor {
  if (platformAdmin)
    return { kind: 'super_admin', userId }
  if (memberships.length === 0)
    return { kind: 'guest', userId }
  return { kind: 'staff', userId, stores: new Map(memberships.map(({ storeId, role }) => [storeId, role])) }
}

// The table in section 9. A permission belongs to a store, so only staff of that store can hold it.
const rolesAllowed = {
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
} as const satisfies Record<string, readonly StoreRole[]>

export type Permission = keyof typeof rolesAllowed

// The actor's role in this store, if any. Every /api/store/{storeId}/* route needs one.
export function storeRole(actor: Actor, storeId: string): StoreRole | undefined {
  return actor.kind === 'staff' ? actor.stores.get(storeId) : undefined
}

export function can(actor: Actor, permission: Permission, scope: { storeId: string }): boolean {
  const role = storeRole(actor, scope.storeId)
  return role !== undefined && (rolesAllowed[permission] as readonly StoreRole[]).includes(role)
}
