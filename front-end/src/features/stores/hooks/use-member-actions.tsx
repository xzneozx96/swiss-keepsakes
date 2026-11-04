import type { Member, MemberInvitation } from '@sk/api-contract'

import { useRef } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { byProblemType, memberProblemKey } from '../lib/member-problems'
import { keepsKey } from './use-idempotency-key'
import { useMemberFailure } from './use-member-failure'

/**
 * The row commands of M22's members table, once for the whole table: the table and the phone cards both render
 * every row, so the commands, their keys and the one confirm dialog live here, not in a row. Remove a Manager and
 * revoke an invitation ask first; send again does not. One key per intent (this action on this row), kept while a
 * retry is safe, as `useIdempotencyKey` does for one form. `busy` is true while any of them runs. `dialog` must be
 * rendered.
 */
export function useMemberActions(storeId: string) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const fail = useMemberFailure(storeId)
  // The email the toast of a finished removal or revoke names, and the email of each invitation sent again.
  const subjectRef = useRef('')
  const emailsRef = useRef(new Map<string, string>())
  // A refusal of remove and revoke shows in the confirm dialog, so the cache does not toast it.
  const removeCommand = useSubmit('stores', 'removeMember', {
    meta: { success: () => t('stores.members.removed', { email: subjectRef.current }), silent: true },
  })
  const revokeCommand = useSubmit('stores', 'revokeManagerInvitation', {
    meta: { success: () => t('stores.members.revoked', { email: subjectRef.current }), silent: true },
  })
  const resendCommand = useSubmit('stores', 'resendManagerInvitation', {
    meta: { success: (_result, input) => t('stores.members.resent', { email: emailsRef.current.get(input.invitationId) ?? '' }), error: byProblemType },
  })
  const keysRef = useRef(new Map<string, string>())
  const keyFor = (intent: string) => {
    if (!keysRef.current.has(intent))
      keysRef.current.set(intent, crypto.randomUUID())

    return keysRef.current.get(intent)!
  }
  const settle = (intent: string, error?: Error) => {
    if (!error || !keepsKey(error))
      keysRef.current.delete(intent)
    if (error)
      fail(error)
  }
  // A promise that settles the key of its intent and passes the refusal on, for a confirm dialog's `run`.
  const settled = <T,>(intent: string, run: Promise<T>) => run.then(
    () => settle(intent),
    (error: Error) => {
      settle(intent, error)
      throw error
    },
  )

  const remove = (member: Member) => {
    subjectRef.current = member.email
    void confirm({
      title: t('stores.members.removeTitle', { email: member.email }),
      body: t('stores.members.removeBody'),
      confirmLabel: t('stores.members.removeConfirm'),
      problem: error => t(memberProblemKey(error)),
      run: () => {
        const intent = `remove:${member.id}`

        return settled(intent, removeCommand.submitAsync({ storeId, memberId: member.id, idempotencyKey: keyFor(intent) }))
      },
    })
  }

  const revoke = (invitation: MemberInvitation) => {
    subjectRef.current = invitation.email
    void confirm({
      title: t('stores.members.revokeTitle', { email: invitation.email }),
      body: t('stores.members.revokeBody'),
      confirmLabel: t('stores.members.revokeConfirm'),
      problem: error => t(memberProblemKey(error)),
      run: () => {
        const intent = `revoke:${invitation.id}`

        return settled(intent, revokeCommand.submitAsync({ storeId, invitationId: invitation.id, idempotencyKey: keyFor(intent) }))
      },
    })
  }

  const resend = (invitation: MemberInvitation) => {
    const intent = `resend:${invitation.id}`

    emailsRef.current.set(invitation.id, invitation.email)
    resendCommand.submit(
      { storeId, invitationId: invitation.id, idempotencyKey: keyFor(intent) },
      { onSuccess: () => settle(intent), onError: error => settle(intent, error) },
    )
  }

  const busy = removeCommand.isPending || revokeCommand.isPending || resendCommand.isPending

  return { remove, revoke, resend, busy, dialog }
}
