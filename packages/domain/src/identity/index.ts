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
  'edit-store-information': ['owner'],
  'open-store-for-sale': ['owner'],
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

// The address as Better Auth stores it and as an invitation keeps it: trimmed and in lower case. Two addresses
// that differ only in case or in surrounding spaces are the same person.
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type StoreStatus = 'invited' | 'onboarding' | 'live' | 'suspended'

export type StoreLanguage = 'en' | 'de'

// Only a live store sells (UX AC03). Every checkout, hold and payment route asks this.
export function storeMaySell(status: StoreStatus): boolean {
  return status === 'live'
}

// A02's four conditions for opening a store for sale (UX L370). `pending` means the story that decides the
// condition has not been built yet, which counts as unmet.
export const onboardingConditionKeys = ['store-information', 'payment-account', 'catalogue', 'policies'] as const

export type OnboardingConditionKey = (typeof onboardingConditionKeys)[number]

export type ConditionState = 'met' | 'unmet' | 'pending'

export type OnboardingConditions = Record<OnboardingConditionKey, ConditionState>

// The store information is complete when the store has a name and a language for its mail and pages.
export function storeInformationState(store: { name: string, defaultLanguage: string }): ConditionState {
  return store.name.trim() !== '' && (store.defaultLanguage === 'en' || store.defaultLanguage === 'de') ? 'met' : 'unmet'
}

export function unmetConditions(conditions: OnboardingConditions): OnboardingConditionKey[] {
  return onboardingConditionKeys.filter(key => conditions[key] !== 'met')
}

export function mayOpenForSale(conditions: OnboardingConditions): boolean {
  return unmetConditions(conditions).length === 0
}

// A Store Manager invitation or an Owner invitation lives 7 days (UX L520), and a resend starts the 7 days again.
export const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000

export interface Store {
  id: string
  slug: string
  name: string
  status: StoreStatus
  defaultLanguage: StoreLanguage
}

export type InvitationState = 'open' | 'accepted' | 'expired'

// Accepted wins over expired. A revoked invitation has its expiry moved into the past, so it reads as expired.
export function invitationState(invitation: { acceptedBy: string | null, expiresAt: Date }, now: Date): InvitationState {
  if (invitation.acceptedBy !== null)
    return 'accepted'
  return invitation.expiresAt.getTime() <= now.getTime() ? 'expired' : 'open'
}
