import type { Order } from '@sk/domain/orders'
import type { OrderBlock, TransitionContext } from '../lib/transitions'
import type { StatusTone } from '@/components/status-chip'
import type { DemoState } from '@/features/demo/types'

import {
  amountDueNow,
  amountPaid,
  balance,
  commission,
  orderTotal,
  processingPayment,
} from '@sk/domain/orders'
import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'

import { useCommand } from '@/features/data-client'
import { useDemoActions, useDemoNow, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useOrders } from '@/features/orders/api/queries'
import { allOrders } from '@/features/partners/lib/ledger'
import {
  blockLabel,
  commissionLabel,
  formatLabel,
  paymentLabel,
  progressLabel,
} from '../lib/labels'
import * as tr from '../lib/transitions'

export interface ShownLabel {
  text: string
  tone: StatusTone
}

/**
 * Order actions through the data client. Each returns null when it was sent, or the reason it is
 * blocked (formatted with `useBlockText`). The guard runs on the screen's data first; the command
 * checks again on the latest data, so a race leaves the order unchanged.
 */
export function useOrderActions() {
  const { language } = useLocale()
  const { update } = useDemoActions()
  const orders = useOrders()
  const products = useProducts()
  const { mutate: accept } = useCommand('orders', 'accept')
  const { mutate: changePickup } = useCommand('orders', 'changePickup')
  const { mutate: decline } = useCommand('orders', 'decline')
  const { mutate: payOnline } = useCommand('orders', 'payOnline')
  const { mutate: recordOfflinePayment } = useCommand('orders', 'recordOfflinePayment')
  const { mutate: markReady } = useCommand('orders', 'markReady')
  const { mutate: handOver } = useCommand('orders', 'handOver')
  const { mutate: complete } = useCommand('orders', 'complete')
  const { mutate: handOverAndComplete } = useCommand('orders', 'handOverAndComplete')
  const { mutate: cancel } = useCommand('orders', 'cancel')

  function run(
    orderId: string,
    guard: (order: Order) => OrderBlock | null,
    send: () => void,
  ): OrderBlock | null {
    const order = orders.find(o => o.id === orderId)
    const block = order ? guard(order) : null

    if (!order || block)
      return block
    send()

    return null
  }

  /**
   * The demo's payment provider and clock, not product actions: they change the store directly
   * and the store bridge refreshes the screens.
   */
  function simulate(
    orderId: string,
    guard: (order: Order) => OrderBlock | null,
    apply: (state: DemoState, ctx: TransitionContext<'system'>) => DemoState,
  ): OrderBlock | null {
    return run(orderId, guard, () =>
      update(s =>
        apply(s, {
          actor: 'system',
          now: demoNow(s.clockStartedAt),
          staffLanguage: language,
        }),
      ))
  }

  return {
    accept: (id: string) =>
      run(
        id,
        o => tr.acceptBlock({ products, orders }, o),
        () => accept({ id, language }),
      ),
    changePickup: (id: string, change: tr.PickupChange) =>
      run(
        id,
        o => tr.changePickupBlock(o, change),
        () => changePickup({ id, language, change }),
      ),
    decline: (id: string, reason: string) =>
      run(
        id,
        o => tr.declineBlock(o, reason),
        () => decline({ id, language, reason }),
      ),
    /**
     * C12 simulated provider: Pay, Fail, or Processing (left open until resolved). `onPaid` runs
     * once the payment is stored, so the order screen opens on its result, and only while the
     * provider screen is still open.
     */
    payOnline: (
      id: string,
      outcome: 'succeeded' | 'failed' | 'processing',
      onPaid: () => void,
    ) =>
      run(
        id,
        o => tr.startOnlinePaymentBlock(o),
        () => payOnline({ id, language, outcome }, { onSuccess: onPaid }),
      ),
    /** Prototype action: the provider answers a processing payment (possibly after cancellation). */
    resolveOnlinePayment: (id: string, outcome: 'succeeded' | 'failed') =>
      simulate(
        id,
        o => (processingPayment(o) ? null : { code: 'nothing-due' }),
        (s, ctx) => tr.resolveOnlinePayment(s, id, outcome, ctx),
      ),
    recordOfflinePayment: (id: string, input: tr.OfflinePaymentInput) =>
      run(
        id,
        o => tr.recordOfflinePaymentBlock(o, input),
        () => recordOfflinePayment({ id, language, payment: input }),
      ),
    markReady: (id: string) =>
      run(id, o => tr.markReadyBlock(o), () => markReady({ id, language })),
    handOver: (id: string) =>
      run(id, o => tr.handOverBlock(o), () => handOver({ id, language })),
    complete: (id: string) =>
      run(id, o => tr.completeBlock(o), () => complete({ id, language })),
    handOverAndComplete: (id: string) =>
      run(
        id,
        o => tr.handOverAndCompleteBlock(o),
        () => handOverAndComplete({ id, language }),
      ),
    cancelByGuest: (id: string) =>
      run(
        id,
        o => tr.cancelBlock(o, 'guest'),
        () => cancel({ id, language, by: 'guest' }),
      ),
    cancelByMerchant: (id: string) =>
      run(
        id,
        o => tr.cancelBlock(o, 'merchant'),
        () => cancel({ id, language, by: 'merchant' }),
      ),
    /** Prototype bar: "Expire this order's payment deadline". */
    expirePaymentDeadline: (id: string) =>
      simulate(
        id,
        o => tr.cancelBlock(o, 'overdue'),
        (s, ctx) => tr.expirePaymentDeadline(s, id, ctx),
      ),
  }
}

/** Turns a block from `useOrderActions` into the sentence a screen shows. */
export function useBlockText() {
  const { t, language, intlLocale } = useLocale()

  return (block: OrderBlock): ShownLabel => {
    const label = blockLabel(block, language)

    return { text: formatLabel(label, t, intlLocale), tone: label.tone }
  }
}

/** Amounts and both labels of one order, in the current language and demo time. */
export function useOrderSummary(
  order: Order,
  audience: 'guest' | 'staff' = 'guest',
) {
  const { t, intlLocale } = useLocale()
  const now = useDemoNow()
  const shown = (label: ReturnType<typeof progressLabel>): ShownLabel => ({
    text: formatLabel(label, t, intlLocale),
    tone: label.tone,
  })
  const fees = commission(order)

  return {
    total: orderTotal(order),
    paid: amountPaid(order),
    balance: balance(order),
    dueNow: amountDueNow(order),
    isProcessing: !!processingPayment(order),
    progress: shown(progressLabel(order, audience)),
    payment: shown(paymentLabel(order, now)),
    commission: { ...fees, label: shown(commissionLabel(fees.state)) },
  }
}

/** M04: any order of the shop, the generated history included (outline D15). */
export function useOrder(orderId: string): Order | undefined {
  return useOrders(orders => allOrders({ orders }).find(o => o.id === orderId))
}

/** The signed-in guest's orders, newest first (C14). */
export function useGuestOrders(): Order[] {
  const guestId = useDemoSelector(s => s.data.signedInGuestId)
  const orders = useOrders()

  return orders
    .filter(o => o.guestId === guestId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
