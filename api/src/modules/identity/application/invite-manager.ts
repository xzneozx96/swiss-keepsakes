import type { Actor, StoreLanguage } from '@sk/domain/identity'
import type { MailRequest } from '../../notifications/index.ts'
import type { AuditLog, Clock, InvitationRepository, MembershipRepository, PlatformAdminRepository, StoreRepository, UnitOfWork, UserDirectory } from '../ports.ts'
import type { MemberInvitationView } from './member-view.ts'
import { can, invitationLifetimeMs, normaliseEmail } from '@sk/domain/identity'
import { OpenManagerInvitationExists } from '../ports.ts'
import { memberInvitationView } from './member-view.ts'

export interface InviteManagerDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  invitations: InvitationRepository<T>
  memberships: MembershipRepository<T>
  users: UserDirectory<T>
  admins: PlatformAdminRepository<T>
  queueMail: (tx: T, request: MailRequest) => Promise<string>
  audit: AuditLog<T>
  clock: Clock
}

export type InviteManagerResult
  = | { ok: true, invitation: MemberInvitationView }
    | { ok: false, reason: 'forbidden' | 'store-not-found' | 'already-a-member' | 'manager-is-super-admin' | 'invitation-already-open' }

// The Owner invites a Store Manager by email (M22, N18, UX AC02). One transaction writes the invitation, the
// audit row and the N18 job, which holds the invitation id and never the token (section 8). The store's row is
// locked first, so two invitations for one address made at once meet one after the other and the second sees the
// first. An address that already holds an invitation that is neither accepted nor revoked, expired or not, is refused: the
// Owner sends that one again. The partial unique index is the same rule in the database: a race that got past the
// check ends in its 23505, which the repository raises as OpenManagerInvitationExists and this answers the same way.
export function makeInviteManager<T>({ uow, stores, invitations, memberships, users, admins, queueMail, audit, clock }: InviteManagerDeps<T>) {
  return async (actor: Actor, storeId: string, input: { email: string, language?: StoreLanguage | undefined }, requestId: string | null): Promise<InviteManagerResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'manage-members', { storeId }))
      return { ok: false, reason: 'forbidden' }
    try {
      return await uow.run(async (tx): Promise<InviteManagerResult> => {
        const now = clock.now()
        const email = normaliseEmail(input.email)
        const store = await stores.findForUpdate(tx, storeId)
        if (!store)
          return { ok: false, reason: 'store-not-found' }
        const existing = await users.findByEmail(tx, email)
        if (existing && await admins.has(tx, existing.id))
          return { ok: false, reason: 'manager-is-super-admin' }
        if (existing && await memberships.has(tx, storeId, existing.id))
          return { ok: false, reason: 'already-a-member' }
        if (await invitations.findOpenManagerByEmail(tx, storeId, email))
          return { ok: false, reason: 'invitation-already-open' }
        const inviter = await users.find(tx, actor.userId)
        const invitation = await invitations.insert(tx, { storeId, email, role: 'manager', expiresAt: new Date(now.getTime() + invitationLifetimeMs), invitedBy: actor.userId })
        await queueMail(tx, { template: 'N18', to: email, language: input.language ?? store.defaultLanguage, storeId, params: { inviter: inviter?.name.trim() || inviter?.email || store.name, store: store.name, invitationId: invitation.id } })
        await audit.record(tx, { storeId, actor: `staff:${actor.userId}`, entity: 'store_invitation', entityId: invitation.id, action: 'created', after: { role: 'manager' }, requestId })
        return { ok: true, invitation: memberInvitationView(invitation, now) }
      })
    }
    catch (error) {
      if (error instanceof OpenManagerInvitationExists)
        return { ok: false, reason: 'invitation-already-open' }
      throw error
    }
  }
}
