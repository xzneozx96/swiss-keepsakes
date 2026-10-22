import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, InvitationRepository, UnitOfWork } from '../ports.ts'
import type { MemberInvitationView } from './member-view.ts'
import { can } from '@sk/domain/identity'
import { memberInvitationView } from './member-view.ts'

export interface RevokeInvitationDeps<T> {
  uow: UnitOfWork<T>
  invitations: InvitationRepository<T>
  audit: AuditLog<T>
  clock: Clock
}

export type RevokeInvitationResult
  = | { ok: true, invitation: MemberInvitationView }
    | { ok: false, reason: 'forbidden' | 'invitation-not-found' | 'invitation-already-accepted' | 'invitation-revoked' }

// The Owner takes back a Store Manager invitation that nobody accepted. It sets `revoked_at` under the row lock, so
// an accept in flight finishes first or finds the invitation revoked, and the link stops working at once. A
// revoked invitation never gets a link again. An invitation of another store is not found.
export function makeRevokeInvitation<T>({ uow, invitations, audit, clock }: RevokeInvitationDeps<T>) {
  return async (actor: Actor, storeId: string, invitationId: string, requestId: string | null): Promise<RevokeInvitationResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'manage-members', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx): Promise<RevokeInvitationResult> => {
      const now = clock.now()
      const invitation = await invitations.findManagerInStoreForUpdate(tx, storeId, invitationId)
      if (!invitation)
        return { ok: false, reason: 'invitation-not-found' }
      if (invitation.acceptedBy !== null)
        return { ok: false, reason: 'invitation-already-accepted' }
      if (invitation.revokedAt !== null)
        return { ok: false, reason: 'invitation-revoked' }
      await invitations.revoke(tx, storeId, invitation.id, now)
      await audit.record(tx, { storeId, actor: `staff:${actor.userId}`, entity: 'store_invitation', entityId: invitation.id, action: 'revoked', requestId })
      return { ok: true, invitation: memberInvitationView({ ...invitation, revokedAt: now }, now) }
    })
  }
}
