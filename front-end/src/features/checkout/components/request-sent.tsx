import type { SentOrderView } from '../hooks/use-request-sent'
import type { IconComponent } from '@/components/icons'

import { Alert, buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import {
  ChevronRightIcon,
  GiftIcon,
  InfoIcon,
  OrdersIcon,
  PayLaterIcon,
  StatusInfoIcon,
  StatusSuccessIcon,
} from '@/components/icons'

import { RouterLink } from '@/components/router-link'
import { StatusChip } from '@/components/status-chip'

import { useLocale } from '@/contexts/locale-context'
import { useRequestSent } from '../hooks/use-request-sent'
import { useTripProfile } from '../hooks/use-trip-profile'
import { OrderCard } from './order-card'
import { TripProfile } from './trip-profile'

/**
 * C07 Request sent (AC25, R03, R09): the orders just created, in the same cards as C06
 * plus their status and a link to each order, what happens next as a timeline that starts
 * at the current step, and the optional trip profile. No response time is promised.
 */
export function RequestSent({ orderIds }: { orderIds: string[] }) {
  const { t } = useLocale()
  const { orders, languageNotice } = useRequestSent(orderIds)
  // One answer for the whole send: saved on every order it created (2.17).
  const trip = useTripProfile({
    kind: 'gift',
    orderIds: orders.map(order => order.id),
  })

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-6 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <h1 className="font-serif text-display">{t('requestSent.title')}</h1>
        <EmptyState
          action={{ label: t('requestSent.explore'), to: '/' }}
          icon={OrdersIcon}
          message={t('requestSent.empty')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-10 px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
        <header className="flex flex-col items-start gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
            <StatusSuccessIcon aria-hidden size={30} />
          </span>
          <h1 className="font-serif text-display">{t('requestSent.title')}</h1>
          <p className="text-muted">
            {t(
              orders.length === 1
                ? 'requestSent.intro.one'
                : 'requestSent.intro.other',
              { count: orders.length },
            )}
          </p>
        </header>

        <section
          aria-labelledby="sent-orders-title"
          className="flex flex-col gap-4"
        >
          <h2 className="text-heading" id="sent-orders-title">
            {t('requestSent.orders.title')}
          </h2>
          {languageNotice && (
            <Alert className="alert--soft alert--info w-full">
              <Alert.Indicator>
                <InfoIcon size={16} />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description>{languageNotice}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {orders.map(order => (
            <SentOrder key={order.id} order={order} />
          ))}
          <RouterLink
            className="self-start text-sm underline decoration-muted decoration-[1.5px] underline-offset-4 hover:decoration-foreground"
            to="/account"
          >
            {t('requestSent.transactions')}
          </RouterLink>
        </section>

        <NextSteps />

        <TripProfile
          answers={trip.answers}
          kind="gift"
          status={trip.status}
          onSave={trip.save}
          onSkip={trip.skip}
        />
      </div>

      <div className="sticky bottom-0 z-30 flex border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <Link
          className={buttonVariants({ fullWidth: true, size: 'lg' })}
          to="/"
        >
          {t('requestSent.explore')}
        </Link>
      </div>
    </div>
  )
}

/** C06's order card, with the order's reference and status under the title and a link to C15. */
function SentOrder({ order }: { order: SentOrderView }) {
  const { t } = useLocale()

  return (
    <OrderCard
      footer={(
        <Link
          className="flex min-h-12 items-center justify-between gap-3 rounded-b-3xl px-5 text-sm font-medium outline-none focus-visible:focus-ring hover:bg-surface-secondary"
          params={{ orderId: order.id }}
          to="/account/orders/$orderId"
        >
          {t('requestSent.order.open', { ref: order.ref })}
          <ChevronRightIcon aria-hidden className="shrink-0" size={18} />
        </Link>
      )}
      headingLevel={3}
      order={order.card}
      status={(
        <div className="flex flex-col items-start gap-2">
          <span className="text-sm text-muted tabular-nums">
            {t('requestSent.order.ref', { ref: order.ref })}
          </span>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={order.progress.tone}>
              {order.progress.text}
            </StatusChip>
            <StatusChip tone={order.payment.tone}>
              {order.payment.text}
            </StatusChip>
          </div>
        </div>
      )}
    />
  )
}

/**
 * What happens next, as a timeline in the same white card as the orders. The first step is
 * where every new order is now (awaiting the seller); the others are still ahead.
 */
function NextSteps() {
  const { t } = useLocale()
  const steps: { key: 'confirm' | 'pay' | 'pickup', icon: IconComponent }[] = [
    { key: 'confirm', icon: StatusInfoIcon },
    { key: 'pay', icon: PayLaterIcon },
    { key: 'pickup', icon: GiftIcon },
  ]

  return (
    <section aria-labelledby="sent-next-title" className="flex flex-col gap-4">
      <h2 className="text-heading" id="sent-next-title">
        {t('requestSent.next.title')}
      </h2>
      <ol className="flex flex-col rounded-3xl bg-surface p-5 shadow-surface">
        {steps.map(({ key, icon: Icon }, i) => {
          const isNow = i === 0
          const isLast = i === steps.length - 1

          return (
            <li
              key={key}
              aria-current={isNow ? 'step' : undefined}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    isNow
                      ? 'bg-info-soft text-info-soft-foreground'
                      : 'bg-surface-secondary text-muted'
                  }`}
                >
                  <Icon aria-hidden size={20} />
                </span>
                {!isLast && (
                  <span aria-hidden className="my-1 w-px flex-1 bg-separator" />
                )}
              </div>
              <div
                className={`flex min-w-0 flex-1 flex-col gap-1 pt-2 ${isLast ? '' : 'pb-6'}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="font-semibold leading-snug">
                    {t(`requestSent.next.${key}.title`)}
                  </h3>
                  {isNow && (
                    <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground">
                      {t('requestSent.next.now')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {t(`requestSent.next.${key}`)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
