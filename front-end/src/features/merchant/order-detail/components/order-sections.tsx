import type {
  LogRow,
  MerchantOrderView,
} from '../hooks/use-merchant-order-detail'
import type { IconComponent } from '@/components/icons'

import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { CopyText } from '@/components/copy-text'

import {
  AccountIcon,
  BackIcon,
  ClockIcon,
  CloseIcon,
  ContentIcon,
  EmailIcon,
  EngraveIcon,
  GiftIcon,
  PartnersIcon,
  PayLaterIcon,
  PickupIcon,
  RequestsIcon,
  ShopIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { Media } from '@/components/media'
import { StatCard } from '@/components/stat-card'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { avatarUrl } from '@/lib/avatars'
import { DetailCard } from './detail-card'

/** Page header: back link, the order as the one h1, who asked and when, both labels. */
export function OrderHeader({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <header className="flex flex-col gap-3">
      <MerchantBackBar
        label={t('merchantOrder.back')}
        title={t('merchantOrder.title', { ref: view.ref })}
        to="/store/orders"
      />
      <Link
        className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
        to="/store/orders"
      >
        <BackIcon aria-hidden size={16} />
        {t('merchantOrder.back')}
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title max-lg:sr-only">
            {t('merchantOrder.title', { ref: view.ref })}
          </h1>
          <p className="text-sm text-muted tabular-nums">
            {t('merchantOrder.requestedAt', {
              guest: view.guest.name,
              at: view.requestedAt,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          <StatusChip tone={view.progress.tone}>
            {view.progress.text}
          </StatusChip>
          <StatusChip tone={view.payment.tone}>{view.payment.text}</StatusChip>
        </div>
      </div>
    </header>
  )
}

/**
 * Key facts strip: the four things staff check first (pickup, total, balance, source),
 * one card, 2×2 on phones and one row from 640px.
 */
export function KeyFacts({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()
  const count = view.items.length
  const facts: {
    label: string
    value: string
    sub: string
    icon: IconComponent
  }[] = [
    {
      label: t(
        view.isRequested
          ? 'merchantOrder.pickup.requested'
          : 'merchantOrder.pickup.confirmed',
      ),
      value: view.pickup.date,
      sub: view.pickup.place,
      icon: PickupIcon,
    },
    {
      label: t('merchantOrder.amounts.total'),
      value: view.totals.total,
      sub: t(
        count === 1 ? 'merchantOrder.facts.gift' : 'merchantOrder.facts.gifts',
        { count },
      ),
      icon: GiftIcon,
    },
    {
      label: t('merchantOrder.amounts.balance'),
      value: view.totals.balance,
      sub: t('merchantOrder.facts.paid', { amount: view.totals.paid }),
      icon: PayLaterIcon,
    },
    {
      label: t('merchantOrder.source.title'),
      value: view.source.name,
      sub: t(
        view.source.isPartner
          ? 'merchantOrder.facts.partner'
          : 'merchantOrder.facts.direct',
      ),
      icon: PartnersIcon,
    },
  ]

  // One standalone StatCard per fact, as on the M02/P02 dashboards (owner review 1.11s).
  return (
    <dl
      aria-label={t('merchantOrder.facts.label')}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      {facts.map(({ label, value, sub, icon }) => (
        <StatCard
          key={label}
          isSubgrid
          icon={icon}
          label={label}
          value={(
            <span className="tabular-nums [overflow-wrap:anywhere]">
              {value}
            </span>
          )}
        >
          <dd className="text-xs text-pretty text-muted tabular-nums">{sub}</dd>
        </StatCard>
      ))}
    </dl>
  )
}

export function ItemsCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <DetailCard
      icon={GiftIcon}
      id="m04-items"
      title={t('merchantOrder.items.title')}
      trailing={(
        <span className="text-sm font-semibold tabular-nums">
          {view.totals.total}
        </span>
      )}
    >
      <ul className="flex flex-col divide-y divide-separator">
        {view.items.map(item => (
          <li
            key={item.id}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <Media
              alt=""
              className="size-14 shrink-0 rounded-xl"
              photo={item.photo}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="leading-snug font-medium">{item.name}</span>
              <span className="text-sm text-muted tabular-nums">
                {item.variant} · {item.quantity}
              </span>
              {item.engraving && (
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                  <EngraveIcon aria-hidden className="text-muted" size={16} />
                  {t('merchantOrder.items.engraving')}
                  <span className="rounded-md bg-surface-secondary px-1.5 font-mono">
                    {item.engraving}
                  </span>
                </span>
              )}
            </div>
            <span className="shrink-0 font-medium tabular-nums">
              {item.total}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
        <PickupIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
        <div className="flex min-w-0 flex-col gap-0.5 text-sm">
          <span className="text-muted">
            {t(
              view.isRequested
                ? 'merchantOrder.pickup.requested'
                : 'merchantOrder.pickup.confirmed',
            )}
          </span>
          <span className="font-medium tabular-nums">
            {view.pickup.date} · {view.pickup.place}
          </span>
          <span className="text-muted">
            {view.pickup.address} · {view.pickup.hours}
          </span>
        </div>
      </div>
    </DetailCard>
  )
}

export function GuestCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <DetailCard
      icon={AccountIcon}
      id="m04-guest"
      title={t('merchantOrder.guest.title')}
    >
      <div className="flex items-center gap-3">
        <img
          alt=""
          className="size-11 shrink-0 rounded-full bg-hero-sky object-cover"
          decoding="async"
          loading="lazy"
          src={avatarUrl(view.guest.name)}
        />
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">{view.guest.name}</span>
          <span className="text-sm text-muted tabular-nums">
            {view.requestedAt}
          </span>
        </div>
      </div>
      <CopyText
        label={t('merchantOrder.guest.email')}
        value={view.guest.email}
      />
      <a
        className={`${buttonVariants({ variant: 'secondary' })} w-full`}
        href={view.guest.emailHref}
      >
        <EmailIcon aria-hidden size={20} />
        {t('merchantOrder.guest.write')}
      </a>
    </DetailCard>
  )
}

export function PaymentsCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <DetailCard
      icon={PayLaterIcon}
      id="m04-payments"
      title={t('merchantOrder.payments.title')}
    >
      <dl className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3 text-sm">
        {view.amounts.map(row => (
          <div
            key={row.label}
            className={`flex justify-between gap-3 tabular-nums ${row.strong ? 'border-t border-separator pt-2 text-base font-semibold' : ''}`}
          >
            <dt className={row.strong ? '' : 'text-muted'}>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {view.payments.length === 0
        ? (
            <p className="text-sm text-muted">{t('merchantOrder.payments.none')}</p>
          )
        : (
            <ul className="flex flex-col divide-y divide-separator">
              {view.payments.map(p => (
                <li
                  key={p.id}
                  className="flex flex-col items-start gap-1.5 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{p.amount}</span>
                    <StatusChip tone={p.status.tone}>{p.status.text}</StatusChip>
                  </div>
                  <span className="text-sm text-muted tabular-nums">{p.meta}</span>
                </li>
              ))}
            </ul>
          )}
    </DetailCard>
  )
}

/** Source and commission in one card: the commission exists only because of the source. */
export function PartnerCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <DetailCard
      icon={PartnersIcon}
      id="m04-partner"
      title={t('merchantOrder.commission.title')}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">
          {t('merchantOrder.source.title')}
        </span>
        <span className="font-medium">{view.source.name}</span>
        <p className="text-sm text-muted">
          {t(
            view.source.isPartner
              ? 'merchantOrder.source.partnerNote'
              : 'merchantOrder.source.directNote',
          )}
        </p>
      </div>
      <div>
        <StatusChip tone={view.commission.label.tone}>
          {view.commission.label.text}
        </StatusChip>
      </div>
      {view.commission.lines.length > 0 && (
        <ul className="flex flex-col gap-2">
          {view.commission.lines.map(line => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">{line.name}</span>
                <span className="text-sm text-muted tabular-nums">
                  {line.detail}
                </span>
              </div>
              <span className="shrink-0 text-sm tabular-nums">
                {line.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
      {view.commission.total && (
        <div className="flex justify-between gap-3 border-t border-separator pt-3 font-semibold tabular-nums">
          <span>{t('merchantOrder.commission.total')}</span>
          <span>{view.commission.total}</span>
        </div>
      )}
      <p className="text-xs text-muted">{t('merchantOrder.commission.note')}</p>
    </DetailCard>
  )
}

export function PolicyCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()

  return (
    <DetailCard
      icon={ContentIcon}
      id="m04-policy"
      title={t('merchantOrder.policy.title')}
    >
      <p className="text-sm text-muted">{t('merchantOrder.policy.intro')}</p>
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="font-medium">{t('detail.payment.title')}</dt>
          <dd>{view.policy.payment}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-medium">{t('detail.cancellation.title')}</dt>
          {view.policy.fallbackNotice && (
            <dd className="text-muted">{view.policy.fallbackNotice}</dd>
          )}
          <dd>{view.policy.cancellation}</dd>
        </div>
      </dl>
    </DetailCard>
  )
}

const eventIcon: Record<LogRow['type'], IconComponent> = {
  'requested': RequestsIcon,
  'pickup-changed': PickupIcon,
  'accepted': StatusSuccessIcon,
  'declined': CloseIcon,
  'payment': PayLaterIcon,
  'payment-result': PayLaterIcon,
  'ready': GiftIcon,
  'handed-over': ShopIcon,
  'completed': StatusSuccessIcon,
  'cancelled': CloseIcon,
}

const ringClass: Record<LogRow['tone'], string> = {
  neutral: 'bg-surface-secondary text-muted',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
}

/** Order log as a timeline, newest first: what happened, the note, who and when. */
export function ActivityCard({ view }: { view: MerchantOrderView }) {
  const { t } = useLocale()
  const rows = [...view.log].reverse()

  return (
    <DetailCard
      icon={ClockIcon}
      id="m04-log"
      title={t('merchantOrder.log.title')}
    >
      <ol className="text-sm">
        {rows.map((row, i) => {
          const Icon
            = row.type === 'payment-result' && row.tone === 'danger'
              ? StatusDangerIcon
              : eventIcon[row.type]

          return (
            <li key={row.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < rows.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-10 bottom-1 left-[15px] w-0.5 rounded-full bg-separator"
                />
              )}
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full ${ringClass[row.tone]}`}
              >
                <Icon aria-hidden size={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
                <p className="font-medium">{row.text}</p>
                {row.note && (
                  <p className="max-w-[55ch] text-pretty">{row.note}</p>
                )}
                <p className="text-xs text-muted tabular-nums">
                  {row.who} · {row.at}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </DetailCard>
  )
}
