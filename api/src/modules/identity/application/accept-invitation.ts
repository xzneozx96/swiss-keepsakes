import type { StoreStatus } from '@sk/domain/identity'
import type { AuditLog, Clock, InvitationRepository, InvitationRole, MembershipRepository, PlatformAdminRepository, StoreRepository, UnitOfWork, UserDirectory } from '../ports.ts'
import { invitationState, normaliseEmail } from '@sk/domain/identity'
import { hashInvitationToken } from './invitation-token.ts'

export interface AcceptInvitationDeps<T> {
  uow: UnitOfWork<T>
  invitations: InvitationRepository<T>
  stores: StoreRepository<T>
  memberships: MembershipRepository<T>
  users: UserDirectory<T>
  admins: PlatformAdminRepository<T>
  audit: AuditLog<T>
  clock: Clock
}

export type AcceptInvitationResult
  = | { ok: true, storeId: string, role: InvitationRole, storeStatus: StoreStatus }
    | { ok: false, reason: 'invitation-not-found' | 'invitation-email-mismatch' | 'invitation-email-unverified' | 'invitation-super-admin' | 'invitation-already-accepted' | 'invitation-revoked' | 'invitation-expired' | 'already-a-member' }

// Raised inside the transaction to undo the acceptance when the user already belongs to the store.
class AlreadyAMember extends Error {}

// A signed-in user takes an invitation with the token from the link (section 8, section 9). The row is locked
// from the lookup to the commit, so of two parallel accepts the second waits, then finds it accepted. The
// refusals come in an order that reveals nothing to someone else: an unknown token says nothing, a Super Admin never takes a store role (owner decision, 22.10.2026), and a different
// signed-in address is told it is a different address before it learns whether the invitation is open. The
// invited address is never returned. An Owner invitation also moves the store from `invited` to `onboarding`.
// A repeated accept by the user who took the invitation answers as the first did and changes nothing.
export function makeAcceptInvitation<T>({ uow, invitations, stores, memberships, users, admins, audit, clock }: AcceptInvitationDeps<T>) {
  return async (actor: { userId: string }, token: string, requestId: string | null): Promise<AcceptInvitationResult> => {
    try {
      return await uow.run(async (tx): Promise<AcceptInvitationResult> => {
        const now = clock.now()
        const invitation = await invitations.findByTokenHashForUpdate(tx, hashInvitationToken(token))
        if (!invitation)
          return { ok: false, reason: 'invitation-not-found' }
        if (await admins.has(tx, actor.userId))
          return { ok: false, reason: 'invitation-super-admin' }
        const user = await users.find(tx, actor.userId)
        if (!user || normaliseEmail(user.email) !== invitation.email)
          return { ok: false, reason: 'invitation-email-mismatch' }
        // Better Auth verified the address by the code or by Google. An address Google did not verify is no proof.
        if (!user.emailVerified)
          return { ok: false, reason: 'invitation-email-unverified' }
        const state = invitationState(invitation, now)
        if (state === 'accepted') {
          // The answer to the first accept may have been lost, so the same user asking again gets the same answer,
          // as long as they still belong to the store. Anyone else, and a member since removed, is refused.
          if (invitation.acceptedBy === actor.userId && await memberships.has(tx, invitation.storeId, actor.userId)) {
            const accepted = await stores.find(tx, invitation.storeId)
            if (accepted)
              return { ok: true, storeId: invitation.storeId, role: invitation.role, storeStatus: accepted.status }
          }
          return { ok: false, reason: 'invitation-already-accepted' }
        }
        if (state === 'revoked')
          return { ok: false, reason: 'invitation-revoked' }
        if (state === 'expired')
          return { ok: false, reason: 'invitation-expired' }
        if (!await invitations.markAccepted(tx, invitation.id, actor.userId, now))
          return { ok: false, reason: 'invitation-already-accepted' }
        if (!await memberships.insertIfAbsent(tx, { userId: actor.userId, storeId: invitation.storeId, role: invitation.role, acceptedAt: now }))
          throw new AlreadyAMember()
        const by = `user:${actor.userId}`
        await audit.record(tx, { storeId: invitation.storeId, actor: by, entity: 'store_invitation', entityId: invitation.id, action: 'accepted', after: { role: invitation.role }, requestId })
        let status = (await stores.find(tx, invitation.storeId))?.status
        if (invitation.role === 'owner' && await stores.moveStatus(tx, invitation.storeId, 'invited', 'onboarding', now)) {
          status = 'onboarding'
          await audit.record(tx, { storeId: invitation.storeId, actor: by, entity: 'store', entityId: invitation.storeId, action: 'status-changed', before: { status: 'invited' }, after: { status: 'onboarding' }, requestId })
        }
        if (!status)
          throw new Error('The invitation points at a store that does not exist')
        return { ok: true, storeId: invitation.storeId, role: invitation.role, storeStatus: status }
      })
    }
    catch (error) {
      if (error instanceof AlreadyAMember)
        return { ok: false, reason: 'already-a-member' }
      throw error
    }
  }
}
