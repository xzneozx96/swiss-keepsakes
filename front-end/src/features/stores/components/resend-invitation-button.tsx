import type { AdminStore } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button, toast } from '@heroui/react'

import { SendIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { genericProblemKey } from '../lib/refusals'

const resendRefusals: Record<string, MessageKey> = {
  'invitation-already-accepted': 'stores.resend.accepted',
  'invitation-revoked': 'stores.resend.revoked',
  'not-found': 'stores.resend.notFound',
  'invitation-not-found': 'stores.resend.notFound',
}

/** Sends the Owner invitation again while the Owner has not accepted it. Renders nothing for any other store. */
export function ResendInvitationButton({ store, isIconOnly = false }: { store: AdminStore, isIconOnly?: boolean }) {
  const { t } = useLocale()
  const { submit, isPending } = useSubmit('stores', 'resendOwnerInvitation')
  const input = { id: store.id, language: store.defaultLanguage }
  const key = useIdempotencyKey(input)
  const { invitation } = store

  if (invitation?.state !== 'open' && invitation?.state !== 'expired')
    return null

  return (
    <Button
      aria-label={isIconOnly ? t('stores.resend.action') : undefined}
      className={`shrink-0 whitespace-nowrap ${isIconOnly ? '' : 'min-h-11'}`}
      isIconOnly={isIconOnly}
      isPending={isPending}
      size="sm"
      variant={isIconOnly ? 'tertiary' : 'secondary'}
      onPress={() => submit({ ...input, idempotencyKey: key.next() }, {
        onSuccess: () => {
          key.settled()
          toast.success(t('stores.resend.done', { email: invitation.email }))
        },
        onError: (error) => {
          key.settled(error)
          toast.danger(t(error instanceof ApiProblem ? (resendRefusals[error.type] ?? genericProblemKey(error)) : genericProblemKey(error)))
        },
      })}
    >
      <SendIcon aria-hidden size={16} />
      {!isIconOnly && t('stores.resend.action')}
    </Button>
  )
}
