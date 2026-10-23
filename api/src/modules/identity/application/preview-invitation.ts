import type { InvitationState } from '@sk/domain/identity'
import type { Clock, InvitationRepository, InvitationRole, UnitOfWork } from '../ports.ts'
import { invitationState } from '@sk/domain/identity'
import { hashInvitationToken } from './invitation-token.ts'

export interface PreviewInvitationDeps<T> {
  uow: UnitOfWork<T>
  invitations: InvitationRepository<T>
  clock: Clock
}

export interface InvitationPreview {
  storeName: string
  role: InvitationRole
  inviterName: string | null
  state: InvitationState
}

export type PreviewInvitationResult = { ok: true, preview: InvitationPreview } | { ok: false, reason: 'invitation-not-found' }

// What M01 and A02 show before sign-in (UX L329): the store, the role, who invited, and whether the link can
// still be used. The token is the only credential, so it answers anyone who holds it. The preview never holds the
// invited address, not even masked, because its holder may be anyone the link was passed to. It reads and locks
// nothing, so it changes no state and a repeat is harmless.
export function makePreviewInvitation<T>({ uow, invitations, clock }: PreviewInvitationDeps<T>) {
  return async (token: string): Promise<PreviewInvitationResult> => uow.run(async (tx): Promise<PreviewInvitationResult> => {
    const row = await invitations.findPreviewByTokenHash(tx, hashInvitationToken(token))
    if (!row)
      return { ok: false, reason: 'invitation-not-found' }
    return { ok: true, preview: { storeName: row.storeName, role: row.role, inviterName: row.role === 'owner' ? null : row.inviterName?.trim() || null, state: invitationState(row, clock.now()) } }
  })
}
