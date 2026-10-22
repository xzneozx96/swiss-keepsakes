import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'

/** What the accept route refuses with, and what the screen shows for each (UX A02, backend.md section 8). `missing` is no refusal: the screen opened with no link and no store. */
export type AcceptRefusal
  = | 'missing'
    | 'notFound'
    | 'expired'
    | 'revoked'
    | 'accepted'
    | 'member'
    | 'mismatch'
    | 'unverified'
    | 'superAdmin'
    | 'failed'

const byProblemType: Record<string, AcceptRefusal> = {
  'invitation-not-found': 'notFound',
  'invitation-expired': 'expired',
  'invitation-revoked': 'revoked',
  'invitation-already-accepted': 'accepted',
  'already-a-member': 'member',
  'invitation-email-mismatch': 'mismatch',
  'invitation-email-unverified': 'unverified',
  'invitation-super-admin': 'superAdmin',
  // The route checks the token's shape first, so a cut-off link is a 400 and reads as an unknown one.
  'validation-failed': 'notFound',
}

export function acceptRefusal(error: Error): AcceptRefusal {
  return error instanceof ApiProblem ? (byProblemType[error.type] ?? 'failed') : 'failed'
}

/** The link can never work again, so the held token is dropped. A mismatch keeps it: the invitation stays open for the right account. */
export function spentToken(refusal: AcceptRefusal): boolean {
  return refusal === 'notFound' || refusal === 'expired' || refusal === 'revoked' || refusal === 'accepted' || refusal === 'member'
}

export function refusalKeys(refusal: AcceptRefusal): { title: MessageKey, text: MessageKey } {
  switch (refusal) {
    case 'missing': return { title: 'stores.refusal.missing.title', text: 'stores.refusal.missing.text' }
    case 'notFound': return { title: 'stores.refusal.notFound.title', text: 'stores.refusal.notFound.text' }
    case 'expired': return { title: 'stores.refusal.expired.title', text: 'stores.refusal.expired.text' }
    case 'revoked': return { title: 'stores.refusal.revoked.title', text: 'stores.refusal.revoked.text' }
    case 'accepted': return { title: 'stores.refusal.accepted.title', text: 'stores.refusal.accepted.text' }
    case 'member': return { title: 'stores.refusal.member.title', text: 'stores.refusal.member.text' }
    case 'mismatch': return { title: 'stores.refusal.mismatch.title', text: 'stores.refusal.mismatch.text' }
    case 'unverified': return { title: 'stores.refusal.unverified.title', text: 'stores.refusal.unverified.text' }
    case 'superAdmin': return { title: 'stores.refusal.superAdmin.title', text: 'stores.refusal.superAdmin.text' }
    case 'failed': return { title: 'stores.refusal.failed.title', text: 'stores.refusal.failed.text' }
  }
}

/** Refusals after which signing out and signing in with another account can still accept the invitation. */
export function switchesAccount(refusal: AcceptRefusal): boolean {
  return refusal === 'mismatch' || refusal === 'superAdmin' || refusal === 'unverified'
}

/** The text for a problem that has no screen of its own: no connection, or a code this page does not know. */
export function genericProblemKey(error: unknown): MessageKey {
  return error instanceof ApiProblem ? 'stores.problem.generic' : 'stores.problem.network'
}
