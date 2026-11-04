import type { Member, MemberInvitation } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'
import type { RowAction } from '@/components/row-actions'

import { Skeleton } from '@heroui/react'
import { formatDate } from '@sk/domain/shared'
import { useEffect, useState } from 'react'

import { DataTable } from '@/components/data-table'
import { AudienceIcon, PlusIcon, SendIcon, TrashIcon } from '@/components/icons'
import { ListAction } from '@/components/layout/list-toolbar'
import { RowActions } from '@/components/row-actions'
import { StatusText } from '@/components/status-text'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useMembers } from '../api/queries'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { useMemberActions } from '../hooks/use-member-actions'
import { SETTINGS_PATH } from '../lib/search-params'
import { InviteManagerSheet } from './invite-manager-sheet'
import { ProblemNotice } from './problem-notice'

/** A row of the members table: a member of the store, or a Store Manager invitation that is open or expired. */
type MemberRow = { kind: 'member', id: string, member: Member } | { kind: 'invitation', id: string, invitation: MemberInvitation }

type MemberAction = 'remove' | 'resend' | 'revoke'

type Actions = ReturnType<typeof useMemberActions>

const emailOf = (row: MemberRow) => row.kind === 'member' ? row.member.email : row.invitation.email

/**
 * M22's members tab (UX AC02), for the Owner: one table of who belongs to the store and who was invited, with the
 * invite sheet as its action. Every change reads the list again. The API refuses a Manager with 403, which is the
 * real guard, and the tab is not offered to a Manager at all.
 */
export function MembersTab({ storeId }: { storeId: string }) {
  const { t } = useLocale()
  const members = useMembers(storeId)
  const goToSignIn = useGoToSignIn(SETTINGS_PATH)
  const signedOut = members.error instanceof ApiProblem && members.error.status === 401

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  if (members.isError && !signedOut) {
    const forbidden = members.error instanceof ApiProblem && members.error.type === 'forbidden'

    return <ProblemNotice error={members.error} message={forbidden ? 'stores.members.forbidden' : undefined} onRetry={forbidden ? undefined : () => void members.refetch()} />
  }
  if (!members.data || signedOut) {
    return (
      <div className="flex flex-col gap-4">
        <p aria-live="polite" className="sr-only" role="status">{t('stores.members.title')}</p>
        <MembersHeader />
        <MembersTable isLoading rows={[]} />
      </div>
    )
  }

  return <LoadedMembers invitations={members.data.invitations} people={members.data.members} storeId={storeId} />
}

/** The data and the commands: the commands mount only once the list is there. */
function LoadedMembers({ storeId, people, invitations }: { storeId: string, people: Member[], invitations: MemberInvitation[] }) {
  const actions = useMemberActions(storeId)
  const [inviting, setInviting] = useState(false)
  const rows: MemberRow[] = [
    ...people.map(member => ({ kind: 'member' as const, id: member.id, member })),
    ...invitations.map(invitation => ({ kind: 'invitation' as const, id: invitation.id, invitation })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <MembersHeader onInvite={() => setInviting(true)} />
      <MembersTable actions={actions} rows={rows} />
      {actions.dialog}
      {inviting && <InviteManagerSheet storeId={storeId} onClose={() => setInviting(false)} />}
    </div>
  )
}

/**
 * The tab's header under the Settings title and tabs: what a Store Manager may do, and the one action. Laid out as
 * the shared list header (action at the end from 1024 px, full width under the line below), without a second h1.
 */
function MembersHeader({ onInvite }: { onInvite?: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex items-center justify-between gap-3 max-lg:flex-col max-lg:items-stretch">
      <p className="min-w-0 text-sm text-pretty text-muted">{t('stores.members.intro')}</p>
      <ListAction icon={PlusIcon} isDisabled={!onInvite} onPress={onInvite}>{t('stores.members.invite.title')}</ListAction>
    </div>
  )
}

function useRowText() {
  const { t, intlLocale } = useLocale()
  const date = (iso: string) => formatDate(new Date(iso), intlLocale)

  return {
    t,
    role: (row: MemberRow) => t(`stores.members.role.${row.kind === 'member' ? row.member.role : 'manager'}`),
    since: (row: MemberRow) => row.kind === 'member' ? date(row.member.acceptedAt) : undefined,
    // The invitation's line under its status: until when the link works, or since when it no longer does.
    detail: (row: MemberRow) => {
      if (row.kind === 'member')
        return undefined

      return t(row.invitation.state === 'expired' ? 'stores.members.status.expiredOn' : 'stores.members.status.until', { date: date(row.invitation.expiresAt) })
    },
  }
}

/** Active for a member; Invited for an open invitation, Expired for one whose link ran out. Red stays for danger. */
function Status({ row }: { row: MemberRow }) {
  const { t } = useLocale()

  if (row.kind === 'member')
    return <StatusText tone="success">{t('stores.members.status.active')}</StatusText>

  return row.invitation.state === 'expired'
    ? <StatusText tone="warning">{t('stores.members.status.expired')}</StatusText>
    : <StatusText tone="neutral">{t('stores.members.status.invited')}</StatusText>
}

/**
 * Only what the API offers: a Manager can be removed, an invitation sent again or revoked. An Owner has no
 * actions, so the Owner's row has no menu. Remove and Revoke are the danger items; every item waits while a
 * command runs.
 */
function RowMenu({ row, actions }: { row: MemberRow, actions: Actions }) {
  const { t } = useLocale()

  if (row.kind === 'member' && row.member.role === 'owner')
    return null
  const items: RowAction<MemberAction>[] = row.kind === 'member'
    ? [{ id: 'remove', label: t('stores.members.remove'), icon: TrashIcon, isDanger: true, isDisabled: actions.busy }]
    : [
        { id: 'resend', label: t('stores.members.resend'), icon: SendIcon, isDisabled: actions.busy },
        { id: 'revoke', label: t('stores.members.revoke'), icon: TrashIcon, isDanger: true, isDisabled: actions.busy },
      ]
  const run = (id: MemberAction) => {
    if (row.kind === 'member')
      actions.remove(row.member)
    else if (id === 'resend')
      actions.resend(row.invitation)
    else
      actions.revoke(row.invitation)
  }

  return <RowActions actions={items} label={t('stores.members.actions', { email: emailOf(row) })} onAction={run} />
}

/** Phones: the pickup points card shape. The email over the role, the status with its line, the member-since line, and the menu. */
function MemberCards({ rows, actions }: { rows: MemberRow[], actions?: Actions }) {
  const { t, role, since, detail } = useRowText()

  return (
    <ul aria-label={t('stores.members.title')} className="flex flex-col gap-3 lg:hidden">
      {rows.map(row => (
        <li
          key={row.id}
          className="flex items-center gap-1 rounded-3xl bg-surface p-4 pe-3 shadow-surface"
          data-invitation={row.kind === 'invitation' ? row.invitation.state : undefined}
          data-member={row.kind === 'member' ? row.member.role : undefined}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold break-all">{emailOf(row)}</span>
            <span className="text-label text-muted">{role(row)}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Status row={row} />
              {detail(row) && <span className="text-label text-muted">{detail(row)}</span>}
            </span>
            {since(row) && <span className="mt-1 text-label text-muted">{t('stores.members.since', { date: since(row)! })}</span>}
          </span>
          {actions && <RowMenu actions={actions} row={row} />}
        </li>
      ))}
    </ul>
  )
}

/** The loading cards have the shape of the cards: the email, role and status lines, and the menu. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden">
      {[0, 1].map(i => (
        <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-surface">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-1/4 rounded-lg" />
            <Skeleton className="mt-1 h-3 w-16 rounded-lg" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

/** From 1024 px the shared table, below it the cards. */
function MembersTable({ rows, actions, isLoading }: { rows: MemberRow[], actions?: Actions, isLoading?: boolean }) {
  const { t, role, since, detail } = useRowText()
  const columns: DataTableColumn<MemberRow>[] = [
    {
      id: 'member',
      header: t('stores.members.column.member'),
      isRowHeader: true,
      headerClassName: 'w-[40%]',
      render: row => <span className="font-semibold break-all">{emailOf(row)}</span>,
    },
    { id: 'role', header: t('stores.members.column.role'), cellClassName: 'whitespace-nowrap', render: role },
    {
      id: 'status',
      header: t('stores.members.column.status'),
      headerClassName: 'whitespace-nowrap',
      render: row => (
        <span className="flex flex-col items-start gap-0.5">
          <Status row={row} />
          {detail(row) && <span className="text-label text-muted">{detail(row)}</span>}
        </span>
      ),
    },
    { id: 'since', header: t('stores.members.column.since'), headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap tabular-nums', render: row => since(row) ?? <span className="text-muted">–</span> },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeletons />}
      cards={pageRows => <MemberCards actions={actions} rows={pageRows} />}
      columns={columns}
      empty={{ icon: AudienceIcon, message: t('stores.members.empty') }}
      getRowId={row => row.id}
      isLoading={isLoading}
      label={t('stores.members.title')}
      rowActions={{ render: row => actions && <RowMenu actions={actions} row={row} /> }}
      rows={rows}
    />
  )
}
