import type { Actor } from '@sk/domain/identity'
import type { AuditLog, MembershipRepository, UnitOfWork } from '../ports.ts'
import { can } from '@sk/domain/identity'

export interface RemoveMemberDeps<T> {
  uow: UnitOfWork<T>
  memberships: MembershipRepository<T>
  audit: AuditLog<T>
}

export type RemoveMemberResult
  = | { ok: true }
    | { ok: false, reason: 'forbidden' | 'member-not-found' | 'cannot-remove-owner' }

// The Owner removes a Store Manager. This route removes no Owner, so it can never remove the last one or the
// caller. The roles are read on every request (authenticate), so the removed person's next request is refused.
// A membership of another store is not found.
export function makeRemoveMember<T>({ uow, memberships, audit }: RemoveMemberDeps<T>) {
  return async (actor: Actor, storeId: string, memberId: string, requestId: string | null): Promise<RemoveMemberResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'manage-members', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx): Promise<RemoveMemberResult> => {
      const member = await memberships.findInStoreForUpdate(tx, storeId, memberId)
      if (!member)
        return { ok: false, reason: 'member-not-found' }
      if (member.role === 'owner')
        return { ok: false, reason: 'cannot-remove-owner' }
      await memberships.remove(tx, storeId, member.id)
      await audit.record(tx, { storeId, actor: `staff:${actor.userId}`, entity: 'store_membership', entityId: member.id, action: 'removed', before: { role: member.role }, requestId })
      return { ok: true }
    })
  }
}
