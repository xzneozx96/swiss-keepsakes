import type { Member, MemberInvitation } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Button, FieldError, Form, Input, Label, Radio, RadioGroup, Skeleton, TextField, toast } from '@heroui/react'
import { formatDate } from '@sk/domain/shared'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useMembers } from '../api/queries'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { memberProblemKey } from '../lib/member-problems'
import { ProblemNotice } from './problem-notice'

const EMAIL = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/**
 * M22's members tab (UX AC02), for the Owner: who belongs to the store, the open and expired Manager invitations,
 * and the form that invites one more. Every change reads the list again. The API refuses a Manager with 403, which
 * is the real guard, and the tab is not offered to a Manager at all.
 */
export function MembersTab({ storeId }: { storeId: string }) {
  const { t } = useLocale()
  const members = useMembers(storeId)

  if (members.isError) {
    const forbidden = members.error instanceof ApiProblem && members.error.type === 'forbidden'

    return <ProblemNotice error={members.error} message={forbidden ? 'stores.members.forbidden' : undefined} onRetry={forbidden ? undefined : () => void members.refetch()} />
  }
  if (!members.data) {
    return (
      <div className="flex flex-col gap-3">
        <p aria-live="polite" className="sr-only" role="status">{t('stores.members.title')}</p>
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    )
  }
  const { members: people, invitations } = members.data

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-pretty text-muted">{t('stores.members.intro')}</p>
      <section aria-labelledby="members-list" className="flex flex-col gap-3">
        <h2 className="text-heading" id="members-list">{t('stores.members.list')}</h2>
        {people.length === 0
          ? <EmptyState icon={InfoIcon} message={t('stores.members.empty')} />
          : (
              <ul className="flex flex-col gap-3">
                {people.map(member => <MemberRow key={member.id} member={member} storeId={storeId} />)}
              </ul>
            )}
      </section>
      <section aria-labelledby="members-invitations" className="flex flex-col gap-3">
        <h2 className="text-heading" id="members-invitations">{t('stores.members.invitations')}</h2>
        {invitations.length === 0
          ? <p className="text-sm text-muted">{t('stores.members.noInvitations')}</p>
          : (
              <ul className="flex flex-col gap-3">
                {invitations.map(invitation => <InvitationRow key={invitation.id} invitation={invitation} storeId={storeId} />)}
              </ul>
            )}
      </section>
      <InviteForm storeId={storeId} />
    </div>
  )
}

function MemberRow({ member, storeId }: { member: Member, storeId: string }) {
  const { t, intlLocale } = useLocale()
  const { confirm, dialog } = useConfirm()
  const { submit, isPending } = useSubmit('stores', 'removeMember')
  const key = useIdempotencyKey({ storeId, memberId: member.id })

  const remove = async () => {
    if (!(await confirm({
      title: t('stores.members.removeTitle', { email: member.email }),
      body: t('stores.members.removeBody'),
      confirmLabel: t('stores.members.removeConfirm'),
    }))) {
      return
    }
    submit({ storeId, memberId: member.id, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        toast.success(t('stores.members.removed', { email: member.email }))
      },
      onError: (error) => {
        key.settled(error)
        toast.danger(t(memberProblemKey(error)))
      },
    })
  }

  return (
    <li className="flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface" data-member={member.role}>
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-medium break-all">{member.email}</span>
        <StatusChip tone={member.role === 'owner' ? 'info' : 'neutral'}>{t(`stores.members.role.${member.role}`)}</StatusChip>
      </div>
      <p className="text-xs text-muted">{t('stores.members.since', { date: formatDate(new Date(member.acceptedAt), intlLocale) })}</p>
      {member.role === 'manager' && (
        <Button
          aria-label={t('stores.members.removeLabel', { email: member.email })}
          className="min-h-11 self-start"
          isPending={isPending}
          variant="secondary"
          onPress={() => void remove()}
        >
          {t('stores.members.remove')}
        </Button>
      )}
      {dialog}
    </li>
  )
}

function InvitationRow({ invitation, storeId }: { invitation: MemberInvitation, storeId: string }) {
  const { t, intlLocale, language } = useLocale()
  const resend = useSubmit('stores', 'resendManagerInvitation')
  const revoke = useSubmit('stores', 'revokeManagerInvitation')
  const resendKey = useIdempotencyKey({ storeId, invitationId: invitation.id, language, action: 'resend' })
  const revokeKey = useIdempotencyKey({ storeId, invitationId: invitation.id, action: 'revoke' })
  const date = formatDate(new Date(invitation.expiresAt), intlLocale)
  const expired = invitation.state === 'expired'

  return (
    <li className="flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface" data-invitation={invitation.state}>
      <span className="text-sm font-medium break-all">{invitation.email}</span>
      <p className="text-sm text-pretty text-muted">{t(expired ? 'stores.members.invitationExpired' : 'stores.members.invitationOpen', { date })}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-label={t('stores.members.resendLabel', { email: invitation.email })}
          className="min-h-11"
          isPending={resend.isPending}
          variant="secondary"
          onPress={() => resend.submit({ storeId, invitationId: invitation.id, language, idempotencyKey: resendKey.next() }, {
            onSuccess: () => {
              resendKey.settled()
              toast.success(t('stores.members.resent', { email: invitation.email }))
            },
            onError: (error) => {
              resendKey.settled(error)
              toast.danger(t(memberProblemKey(error)))
            },
          })}
        >
          {t('stores.members.resend')}
        </Button>
        <Button
          aria-label={t('stores.members.revokeLabel', { email: invitation.email })}
          className="min-h-11"
          isPending={revoke.isPending}
          variant="tertiary"
          onPress={() => revoke.submit({ storeId, invitationId: invitation.id, idempotencyKey: revokeKey.next() }, {
            onSuccess: () => {
              revokeKey.settled()
              toast.success(t('stores.members.revoked', { email: invitation.email }))
            },
            onError: (error) => {
              revokeKey.settled(error)
              toast.danger(t(memberProblemKey(error)))
            },
          })}
        >
          {t('stores.members.revoke')}
        </Button>
      </div>
    </li>
  )
}

function InviteForm({ storeId }: { storeId: string }) {
  const { t, language: screenLanguage } = useLocale()
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>(screenLanguage)
  const [invalid, setInvalid] = useState(false)
  const { submit: send, isPending, error, reset } = useSubmit('stores', 'inviteManager')
  const input = { storeId, email: email.trim(), language }
  const key = useIdempotencyKey(input)
  const problem = error instanceof ApiProblem ? error : undefined
  const ofField = problem !== undefined && ['already-a-member', 'invitation-already-open', 'manager-is-super-admin'].includes(problem.type)

  const submit = () => {
    const bad = !EMAIL.test(input.email)

    setInvalid(bad)
    if (bad)
      return
    send({ ...input, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        toast.success(t('stores.members.invite.done', { email: input.email }))
        setEmail('')
      },
      onError: failure => key.settled(failure),
    })
  }

  return (
    <section aria-labelledby="members-invite" className="flex flex-col gap-3">
      <h2 className="text-heading" id="members-invite">{t('stores.members.invite.title')}</h2>
      <Form
        className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          fullWidth
          autoComplete="off"
          isInvalid={invalid || ofField}
          name="managerEmail"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value)
            setInvalid(false)
            reset()
          }}
        >
          <Label>{t('stores.members.invite.email')}</Label>
          <Input inputMode="email" />
          <FieldError>{ofField ? t(memberProblemKey(error)) : t('stores.members.invite.emailInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="language" value={language} onChange={value => setLanguage(value as Language)}>
          <Label>{t('stores.members.invite.language')}</Label>
          {(['en', 'de'] as const).map(code => (
            <Radio key={code} value={code}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`stores.create.language.${code}`)}
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        {error && !ofField && <ProblemNotice error={error} message={memberProblemKey(error)} />}
        <Button fullWidth className="min-h-11" isPending={isPending} type="submit">
          {t('stores.members.invite.submit')}
        </Button>
      </Form>
    </section>
  )
}
