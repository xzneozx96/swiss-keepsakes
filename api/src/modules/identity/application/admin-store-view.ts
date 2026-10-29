import type { InvitationState, OnboardingConditions, Store } from '@sk/domain/identity'
import type { Invitation } from '../ports.ts'
import { invitationState } from '@sk/domain/identity'

// A store as A01 lists it, with the four opening conditions the Owner's open-for-sale rule reads (`onboardingConditions`).
export interface AdminStoreView extends Omit<Store, 'createdAt'> {
  invitation: { email: string, state: InvitationState, expiresAt: string } | null
  conditions: OnboardingConditions
  createdAt: string
}

export function adminStoreView(store: Store, invitation: Invitation | undefined, conditions: OnboardingConditions, now: Date): AdminStoreView {
  return {
    ...store,
    invitation: invitation
      ? { email: invitation.email, state: invitationState(invitation, now), expiresAt: invitation.expiresAt.toISOString() }
      : null,
    conditions,
    createdAt: store.createdAt.toISOString(),
  }
}
