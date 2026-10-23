import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'
import { genericProblemKey } from './refusals'

const byProblemType: Record<string, MessageKey> = {
  'forbidden': 'stores.members.forbidden',
  'already-a-member': 'stores.members.alreadyMember',
  'invitation-already-open': 'stores.members.alreadyOpen',
  'manager-is-super-admin': 'stores.members.managerIsSuperAdmin',
  'cannot-remove-owner': 'stores.members.cannotRemoveOwner',
  'member-not-found': 'stores.members.memberNotFound',
  'invitation-not-found': 'stores.members.invitationGone',
  'invitation-already-accepted': 'stores.members.invitationAccepted',
  'invitation-revoked': 'stores.members.invitationRevoked',
}

/** The copy for what a members command was refused with. A code this page does not know, and a lost connection, get the generic copy. */
export function memberProblemKey(error: unknown): MessageKey {
  return (error instanceof ApiProblem && byProblemType[error.type]) || genericProblemKey(error)
}

/** M22's members tab is for the Owner of the current store. A Manager never sees it, and the API still answers 403. */
export function showsMembersTab(entry: { role: 'owner' | 'manager' } | undefined): boolean {
  return entry?.role === 'owner'
}

/** A 404 or 409 on a members command says the list on screen is out of date (the invitation or member is gone, taken or already changed), so it must be read again. */
export function listIsStale(error: unknown): boolean {
  return error instanceof ApiProblem && (error.status === 404 || error.status === 409)
}
