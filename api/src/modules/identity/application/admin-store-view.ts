import type { ConditionState, InvitationState, Store } from '@sk/domain/identity'
import type { Invitation, LaterConditions } from '../ports.ts'
import { invitationState } from '@sk/domain/identity'

// A store as A01 lists it.
export interface AdminStoreView extends Store {
  invitation: { email: string, state: InvitationState, expiresAt: string } | null
  paymentAccount: ConditionState
}

export function adminStoreView(store: Store, invitation: Invitation | undefined, later: LaterConditions, now: Date): AdminStoreView {
  return {
    ...store,
    invitation: invitation
      ? { email: invitation.email, state: invitationState(invitation, now), expiresAt: invitation.expiresAt.toISOString() }
      : null,
    paymentAccount: later['payment-account'],
  }
}
