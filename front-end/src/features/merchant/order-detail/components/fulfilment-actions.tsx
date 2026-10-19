import type { MerchantOrderView } from '../hooks/use-merchant-order-detail'
import type { IconComponent } from '@/components/icons'
import type { Order, OrderStatus } from '@/features/orders/types'

import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import {
  GiftIcon,
  PayLaterIcon,
  ShopIcon,
  StatusSuccessIcon,
} from '@/components/icons'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { ProposalMark } from '@/features/demo/components/proposal-mark'
import { RecordPaymentSheet } from '@/features/merchant/record-payment/components/record-payment-sheet'
import {
  useBlockText,
  useOrderActions,
} from '@/features/orders/hooks/use-orders'
import {
  amountPaid,
  balance,
  orderTotal,
} from '@/features/orders/lib/selectors'
import { completeBlock } from '@/features/orders/lib/transitions'
import { formatMoney } from '@/lib/format'
import { ActionPanel } from './detail-card'

/** The five fulfilment steps after the decision, in order. */
const steps = [
  'accepted',
  'preparing',
  'ready',
  'handed_over',
  'completed',
] as const satisfies readonly OrderStatus[]

type Step = (typeof steps)[number]

const stepKeys = {
  accepted: 'fulfilment.step.accepted',
  preparing: 'fulfilment.step.preparing',
  ready: 'fulfilment.step.ready',
  handed_over: 'fulfilment.step.handedOver',
  completed: 'fulfilment.step.completed',
} as const

/**
 * M04 next step once the order is past the decision (spec §2.1, §4.7; outline steps
 * 13–14), in the same ActionPanel as the decision: a per-status title, the five-step
 * progress bar, what is still owed, then the actions. Ready → Handed over → Complete,
 * with Complete locked and its reason while money is owed, one combined button when
 * ready and fully paid, and Record payment (M08). Every transition is T0's; this block
 * only picks which ones to offer.
 */
export function FulfilmentActions({
  order,
  view,
}: {
  order: Order
  view: MerchantOrderView
}) {
  const { t, intlLocale } = useLocale()
  const actions = useOrderActions()
  const blockText = useBlockText()
  const [recording, setRecording] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const moveFocusRef = useRef(false)
  const owed = balance(order)
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const owedText = money(owed)
  const { status } = order

  // The pressed button is gone after each step: hand focus to the next action.
  useEffect(() => {
    if (!moveFocusRef.current)
      return
    moveFocusRef.current = false
    const timer = window.setTimeout(() => {
      const next
        = buttonsRef.current?.querySelector<HTMLElement>(
          'button:not([disabled])',
        ) ?? headingRef.current

      next?.focus()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [status, owed])

  const run = (action: (id: string) => unknown) => {
    moveFocusRef.current = true
    action(order.id)
  }

  if (status === 'declined' || status === 'cancelled' || status === 'requested')
    return null

  const panel = (
    title: string,
    icon: IconComponent,
    children: React.ReactNode,
  ) => (
    <ActionPanel
      eyebrow={t('merchantOrder.panel.eyebrow')}
      headingRef={headingRef}
      icon={icon}
      title={title}
      tone={view.progress.tone}
    >
      <StepBar current={status} />
      {children}
    </ActionPanel>
  )

  if (status === 'completed') {
    const done = [...view.log]
      .reverse()
      .find(row => row.id.endsWith('-completed'))

    return panel(
      t('fulfilment.completed.title'),
      StatusSuccessIcon,
      <p className="text-sm text-muted tabular-nums">
        {t('fulfilment.completed.by', { meta: done?.meta ?? '' })}
      </p>,
    )
  }

  const moneyPanel = (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
      <PayLaterIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted">
          {t(owed > 0 ? 'fulfilment.money.owed' : 'fulfilment.money.settled')}
        </span>
        <span className="text-lg leading-tight font-semibold tabular-nums">
          {owed > 0 ? owedText : money(orderTotal(order))}
        </span>
        {owed > 0 && (
          <span className="text-xs text-muted tabular-nums">
            {t('fulfilment.money.paid', {
              paid: money(amountPaid(order)),
              total: money(orderTotal(order)),
            })}
          </span>
        )}
      </div>
    </div>
  )

  const recordButton = (primary: boolean) =>
    owed > 0 && (
      <Button
        fullWidth
        className={primary ? 'h-12 text-base' : undefined}
        size="lg"
        variant={primary ? 'primary' : 'secondary'}
        onPress={() => setRecording(true)}
      >
        {t('fulfilment.action.record')}
      </Button>
    )

  const lock = completeBlock(order)
  const lockText = lock ? blockText(lock) : null
  const completeButton = lockText
    ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-separator p-3">
          <Button
            fullWidth
            isDisabled
            aria-describedby="complete-help"
            size="lg"
            variant="tertiary"
          >
            {t('fulfilment.action.complete')}
          </Button>
          <div className="flex flex-wrap items-center gap-2" id="complete-help">
            <span className="text-sm text-muted">
              {t('fulfilment.complete.locked')}
            </span>
            <StatusChip tone={lockText.tone}>{lockText.text}</StatusChip>
          </div>
        </div>
      )
    : (
        <div className="flex flex-col gap-2">
          <Button
            fullWidth
            aria-describedby="complete-help"
            className="h-12 text-base"
            size="lg"
            onPress={() => run(actions.complete)}
          >
            {t('fulfilment.action.complete')}
          </Button>
          <p className="text-sm text-muted" id="complete-help">
            {t('fulfilment.complete.consequence')}
          </p>
        </div>
      )

  let title: string
  let icon: IconComponent
  let hint: string
  let buttons: React.ReactNode

  switch (status) {
    case 'accepted':
      title = t('fulfilment.heading.accepted')
      icon = PayLaterIcon
      hint = t('fulfilment.hint.accepted')
      buttons = recordButton(true)
      break
    case 'preparing':
      title = t('fulfilment.heading.preparing')
      icon = GiftIcon
      hint = t('fulfilment.hint.preparing', { place: view.pickup.place })
      buttons = (
        <>
          <Button
            fullWidth
            className="h-12 text-base"
            size="lg"
            onPress={() => run(actions.markReady)}
          >
            {t('fulfilment.action.ready')}
          </Button>
          {recordButton(false)}
        </>
      )
      break
    case 'ready':
      title = t('fulfilment.heading.ready', { place: view.pickup.place })
      icon = ShopIcon
      hint
        = owed > 0
          ? t('fulfilment.hint.readyOwed', { amount: owedText })
          : t('fulfilment.hint.readyPaid')
      buttons
        = owed > 0
          ? (
              <>
                <ProposalMark name={t('fulfilment.proposal.handedOver')}>
                  <Button
                    fullWidth
                    className="h-12 text-base"
                    size="lg"
                    onPress={() => run(actions.handOver)}
                  >
                    {t('fulfilment.action.handOver')}
                  </Button>
                </ProposalMark>
                {recordButton(false)}
                {completeButton}
              </>
            )
          : (
              <div className="flex flex-col gap-2">
                <Button
                  fullWidth
                  aria-describedby="complete-help"
                  className="h-12 text-base"
                  size="lg"
                  onPress={() => run(actions.handOverAndComplete)}
                >
                  {t('fulfilment.action.handOverAndComplete')}
                </Button>
                <p className="text-sm text-muted" id="complete-help">
                  {t('fulfilment.complete.consequence')}
                </p>
              </div>
            )
      break
    case 'handed_over':
      title = t(
        owed > 0
          ? 'fulfilment.heading.handedOverOwed'
          : 'fulfilment.heading.handedOverPaid',
      )
      icon = owed > 0 ? PayLaterIcon : StatusSuccessIcon
      hint
        = owed > 0
          ? t('fulfilment.hint.handedOverOwed', { amount: owedText })
          : t('fulfilment.hint.handedOverPaid')
      buttons = (
        <>
          {recordButton(true)}
          {completeButton}
        </>
      )
      break
  }

  return panel(
    title,
    icon,
    <>
      <p className="text-sm text-muted">{hint}</p>
      {moneyPanel}
      <div ref={buttonsRef} className="flex flex-col gap-2">
        {buttons}
      </div>
      {recording && (
        <RecordPaymentSheet
          order={order}
          onClose={() => {
            moveFocusRef.current = true
            setRecording(false)
          }}
        />
      )}
    </>,
  )
}

/**
 * Five-step progress, ink for done and current (open decision D1: progress is ink, not
 * red), with "Step 3 of 5 · Ready" under it. Step names are not printed under each bar:
 * German names truncate in the 1024px main column.
 */
function StepBar({ current }: { current: Step }) {
  const { t } = useLocale()
  const index = steps.indexOf(current)

  return (
    <div className="flex flex-col gap-2">
      <ol aria-label={t('fulfilment.step.label')} className="flex gap-1.5">
        {steps.map((step, i) => (
          <li
            key={step}
            aria-current={i === index ? 'step' : undefined}
            className="flex-1"
          >
            <span
              aria-hidden
              className={`block h-1.5 rounded-full ${i <= index ? 'bg-foreground' : 'bg-separator'}`}
            />
            <span className="sr-only">{t(stepKeys[step])}</span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="text-xs text-muted">
        {t('fulfilment.step.count', {
          n: index + 1,
          total: steps.length,
          step: t(stepKeys[current]),
        })}
      </p>
    </div>
  )
}
