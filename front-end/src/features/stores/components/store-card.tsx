import type { AdminStore } from '@sk/api-contract'
import type { StatusTone } from '@/components/status-chip'
import type { MessageKey } from '@/i18n/en'

import { Button, toast } from '@heroui/react'
import { formatDate } from '@sk/domain/shared'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { genericProblemKey } from '../lib/refusals'

const statusTone: Record<AdminStore['status'], StatusTone> = {
  invited: 'info',
  onboarding: 'warning',
  live: 'success',
  suspended: 'danger',
}

const resendRefusals: Record<string, MessageKey> = {
  'invitation-already-accepted': 'stores.resend.accepted',
  'invitation-revoked': 'stores.resend.revoked',
  'not-found': 'stores.resend.notFound',
  'invitation-not-found': 'stores.resend.notFound',
}

/** One store of A01: its status, the state of its Owner invitation, its payment account, and a resend while the Owner has not accepted. */
export function StoreCard({ store }: { store: AdminStore }) {
  const { t, intlLocale } = useLocale()
  const { submit, isPending } = useSubmit('stores', 'resendOwnerInvitation')
  const input = { id: store.id, language: store.defaultLanguage }
  const key = useIdempotencyKey(input)
  const { invitation } = store
  const canResend = invitation?.state === 'open' || invitation?.state === 'expired'

  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface" data-store={store.slug}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-heading">{store.name}</h3>
          <span className="truncate text-xs text-muted">{store.slug}</span>
        </div>
        <StatusChip tone={statusTone[store.status]}>{t(`stores.status.${store.status}`)}</StatusChip>
      </div>
      <p className="text-sm break-words text-pretty" data-invitation={invitation?.state ?? 'none'}>
        {invitation
          ? t(`stores.invitation.${invitation.state}`, { email: invitation.email, date: formatDate(new Date(invitation.expiresAt), intlLocale) })
          : t('stores.list.noInvitation')}
      </p>
      <p className="text-sm text-muted">
        {t('stores.list.paymentAccount')}
        {': '}
        {t(`stores.condition.${store.paymentAccount}`)}
      </p>
      {canResend && (
        <Button
          isPending={isPending}
          variant="secondary"
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
          {t('stores.resend.action')}
        </Button>
      )}
    </li>
  )
}
