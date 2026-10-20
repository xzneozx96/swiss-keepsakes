// Who is asking, and what a store role may do (docs/architecture/backend.md section 9).
// This file imports nothing, because the API runs its compiled copy and the rest of the package is not compiled
// (package.json `exports`, tsconfig.build.json).

export type StoreRole = 'owner' | 'manager'

// Every signed-in actor carries the Better Auth user id and the guest profile id, because a member of staff
// is a guest too. Partners come with their own session (E5.3).
export type Actor
  = | { kind: 'anonymous' }
    | { kind: 'guest', userId: string, guestId: string }
    | { kind: 'staff', userId: string, guestId: string, stores: ReadonlyMap<string, StoreRole> }
    | { kind: 'super_admin', userId: string, guestId: string }

export interface Membership {
  storeId: string
  role: StoreRole
}

// What the identity tables hold about one user, across stores.
export interface Access {
  platformAdmin: boolean
  memberships: readonly Membership[]
}

export const anonymous: Actor = { kind: 'anonymous' }

// Ids are compared in their canonical form, lower case, so an upper-case id in a URL finds the same store.
export function canonicalId(id: string): string {
  return id.toLowerCase()
}

// A row in identity.platform_admins wins over memberships: the Super Admin works in /api/admin/* only (PRD L108).
export function actorFor(person: { userId: string, guestId: string }, { platformAdmin, memberships }: Access): Actor {
  if (platformAdmin)
    return { kind: 'super_admin', ...person }
  if (memberships.length === 0)
    return { kind: 'guest', ...person }
  return { kind: 'staff', ...person, stores: new Map(memberships.map(({ storeId, role }) => [canonicalId(storeId), role])) }
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
  return actor.kind === 'staff' ? actor.stores.get(canonicalId(storeId)) : undefined
}

export function can(actor: Actor, permission: Permission, scope: { storeId: string }): boolean {
  const role = storeRole(actor, scope.storeId)
  return role !== undefined && (rolesAllowed[permission] as readonly StoreRole[]).includes(role)
}
