import type { AdminStore } from '@sk/api-contract'
import type { RowAction } from '@/components/row-actions'
import type { MessageKey } from '@/i18n/en'

import { toast } from '@heroui/react'

import { CopyIcon, SendIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { genericProblemKey } from '../lib/refusals'

type ActionId = 'resend' | 'copy'

const resendRefusals: Record<string, MessageKey> = {
  'invitation-already-accepted': 'stores.resend.accepted',
  'invitation-revoked': 'stores.resend.revoked',
  'not-found': 'stores.resend.notFound',
  'invitation-not-found': 'stores.resend.notFound',
}

/**
 * The ⋯ menu of one store, in the table and on the phone card: send the Owner invitation again while the Owner has
 * not accepted it, and copy the Owner's address. A second press while the first is on its way sends nothing.
 */
export function StoreActions({ store }: { store: AdminStore }) {
  const { t } = useLocale()
  const { submit, isPending } = useSubmit('stores', 'resendOwnerInvitation')
  const input = { id: store.id, language: store.defaultLanguage }
  const key = useIdempotencyKey(input)
  const { invitation } = store
  const mayResend = invitation?.state === 'open' || invitation?.state === 'expired'
  const actions: RowAction<ActionId>[] = [
    { id: 'resend', label: t('stores.resend.action'), icon: SendIcon, isDisabled: !mayResend },
    { id: 'copy', label: t('stores.actions.copy'), icon: CopyIcon, isDisabled: !invitation },
  ]

  const resend = () => {
    if (!invitation || isPending)
      return
    submit({ ...input, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        toast.success(t('stores.resend.done', { email: invitation.email }))
      },
      onError: (error) => {
        key.settled(error)
        toast.danger(t(error instanceof ApiProblem ? (resendRefusals[error.type] ?? genericProblemKey(error)) : genericProblemKey(error)))
      },
    })
  }

  const copy = async () => {
    if (!invitation)
      return
    try {
      await navigator.clipboard.writeText(invitation.email)
      toast.success(t('stores.actions.copied', { email: invitation.email }))
    }
    catch {
      toast.danger(t('stores.actions.copyFailed'))
    }
  }

  return (
    <RowActions
      actions={actions}
      label={t('stores.actions.label', { name: store.name })}
      onAction={(action) => {
        if (action === 'resend')
          resend()
        else void copy()
      }}
    />
  )
}
