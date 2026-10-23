import type { AdminStore } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'
import type { StatusTone } from '@/components/status-chip'

import { formatDate } from '@sk/domain/shared'

import { DataTable } from '@/components/data-table'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { ResendInvitationButton } from './resend-invitation-button'

const statusTone: Record<AdminStore['status'], StatusTone> = {
  invited: 'info',
  onboarding: 'warning',
  live: 'success',
  suspended: 'danger',
}

const invitationTone: Record<NonNullable<AdminStore['invitation']>['state'], StatusTone> = {
  open: 'info',
  expired: 'warning',
  accepted: 'success',
  revoked: 'neutral',
}

const paymentTone: Record<AdminStore['paymentAccount'], StatusTone> = {
  met: 'success',
  unmet: 'neutral',
  pending: 'neutral',
}

function InvitationCell({ store }: { store: AdminStore }) {
  const { t, intlLocale } = useLocale()
  const { invitation } = store

  if (!invitation)
    return <span className="text-muted">{t('stores.list.noInvitation')}</span>
  const date = formatDate(new Date(invitation.expiresAt), intlLocale)
  const when = invitation.state === 'open'
    ? t('stores.invitation.expiresOn', { date })
    : invitation.state === 'expired' ? t('stores.invitation.expiredOn', { date }) : undefined

  return (
    <div className="flex flex-col items-start gap-1" data-invitation={invitation.state}>
      <StatusChip tone={invitationTone[invitation.state]}>{t(`stores.invitation.chip.${invitation.state}`)}</StatusChip>
      {when && <span className="text-label text-muted tabular-nums">{when}</span>}
    </div>
  )
}

/** Phones: one card per store, with the invitation said in a sentence and the resend under it. */
function StoreCards({ stores, label }: { stores: AdminStore[], label: string }) {
  const { t, intlLocale } = useLocale()

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {stores.map((store) => {
        const { invitation } = store

        return (
          <li key={store.id} data-store={store.slug}>
            <article className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]">{store.name}</h3>
                  <span className="text-xs break-all text-muted">{store.slug}</span>
                </div>
                <StatusChip tone={statusTone[store.status]}>{t(`stores.status.${store.status}`)}</StatusChip>
              </div>
              <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
                <p className="break-words text-pretty" data-invitation={invitation?.state ?? 'none'}>
                  {invitation
                    ? t(`stores.invitation.${invitation.state}`, { email: invitation.email, date: formatDate(new Date(invitation.expiresAt), intlLocale) })
                    : t('stores.list.noInvitation')}
                </p>
                <p className="flex items-baseline justify-between gap-4">
                  <span className="text-muted">{t('stores.list.paymentAccount')}</span>
                  <span className="font-medium">{t(`stores.condition.${store.paymentAccount}`)}</span>
                </p>
              </div>
              {(invitation?.state === 'open' || invitation?.state === 'expired') && (
                <div className="flex justify-end border-t border-separator px-4 py-2.5">
                  <ResendInvitationButton store={store} />
                </div>
              )}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

/** From 1024px a table, below it the cards. The Owner's email has its own column, and so does the resend. */
export function StoreRows({ stores, label, isLoading }: { stores: AdminStore[], label: string, isLoading: boolean }) {
  const { t } = useLocale()
  const columns: DataTableColumn<AdminStore>[] = [
    {
      id: 'store',
      header: t('stores.column.store'),
      isRowHeader: true,
      skeleton: 'two-line',
      render: store => (
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold [overflow-wrap:anywhere]">{store.name}</span>
          <span className="text-label break-all text-muted">{store.slug}</span>
        </div>
      ),
    },
    {
      id: 'owner',
      header: t('stores.column.owner'),
      render: store => store.invitation
        ? <span className="break-all">{store.invitation.email}</span>
        : <span className="text-muted">–</span>,
    },
    {
      id: 'status',
      header: t('stores.column.status'),
      skeleton: 'chip',
      cellClassName: 'whitespace-nowrap',
      render: store => <StatusChip tone={statusTone[store.status]}>{t(`stores.status.${store.status}`)}</StatusChip>,
    },
    {
      id: 'invitation',
      header: t('stores.column.invitation'),
      skeleton: 'two-line',
      cellClassName: 'py-2 whitespace-nowrap',
      render: store => <InvitationCell store={store} />,
    },
    {
      id: 'payment',
      header: t('stores.column.payment'),
      skeleton: 'chip',
      cellClassName: 'whitespace-nowrap',
      render: store => <StatusChip tone={paymentTone[store.paymentAccount]}>{t(`stores.condition.${store.paymentAccount}`)}</StatusChip>,
    },
  ]

  return (
    <DataTable
      cards={page => <StoreCards label={label} stores={page} />}
      columns={columns}
      getRowId={store => store.id}
      isLoading={isLoading}
      label={label}
      rowActions={{
        headerClassName: 'w-20',
        render: store => <ResendInvitationButton isIconOnly store={store} />,
      }}
      rows={stores}
    />
  )
}
