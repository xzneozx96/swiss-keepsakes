import type { Language } from '@/contexts/locale-context'
import type { DemoState } from '@/features/demo/types'
import type { TransitionContext } from '@/features/orders/lib/transitions'
import type { Actor, Order, OrderLine } from '@/features/orders/types'

import * as tr from '@/features/orders/lib/transitions'

/**
 * Prototype fixture (not product logic): gives the signed-in guest one order in each C15 state
 * that steps 1.7, 1.11, 1.14 and 1.15 will later reach through real screens. Each order starts
 * as a request and is moved on with T0's transitions only, so labels, holds and logs are exactly
 * what those screens will produce. Emails the transitions send are dropped to keep the Mail panel
 * about the presenter's own actions.
 */
interface Sample {
  productId: string
  variantId: string
  engraving?: string
  pickupDate: string
  pickupPlaceId: string
  /** T0 steps after the request, in order. */
  steps: Step[]
}

type Step
  = | 'accept'
    | 'change-place'
    | 'start-payment'
    | 'payment-succeeds'
    | 'ready'
    | 'hand-over'
    | 'expire'

const samples: Sample[] = [
  // Awaiting seller confirmation
  {
    productId: 'p-vx-swan',
    variantId: 's',
    engraving: 'Anna',
    pickupDate: '2026-10-22',
    pickupPlaceId: 'altstadt',
    steps: [],
  },
  // Accepted, payment due (the demo path knife)
  {
    productId: 'p-vx-chapel-bridge',
    variantId: 'm',
    engraving: 'Anna',
    pickupDate: '2026-10-21',
    pickupPlaceId: 'altstadt',
    steps: ['accept'],
  },
  // Accepted after the shop moved the pickup place (R04 note; the demo path gift box)
  {
    productId: 'p-giftbox',
    variantId: 'std',
    pickupDate: '2026-10-20',
    pickupPlaceId: 'altstadt',
    steps: ['change-place', 'accept'],
  },
  // Paid in full, being prepared
  {
    productId: 'p-vx-chapel-bridge',
    variantId: 's',
    engraving: 'Ben',
    pickupDate: '2026-10-19',
    pickupPlaceId: 'altstadt',
    steps: ['accept', 'start-payment', 'payment-succeeds'],
  },
  // Pay later, ready for pickup
  {
    productId: 'p-chocolate',
    variantId: '12',
    pickupDate: '2026-10-14',
    pickupPlaceId: 'altstadt',
    steps: ['accept', 'ready'],
  },
  // Deposit paid, handed over, balance owed
  {
    productId: 'p-giftbox',
    variantId: 'std',
    pickupDate: '2026-10-13',
    pickupPlaceId: 'bahnhof',
    steps: [
      'accept',
      'start-payment',
      'payment-succeeds',
      'ready',
      'hand-over',
    ],
  },
  // Payment processing at the provider
  {
    productId: 'p-candle-box',
    variantId: 'std',
    pickupDate: '2026-10-19',
    pickupPlaceId: 'altstadt',
    steps: ['accept', 'start-payment'],
  },
  // Deadline passed while processing; the provider confirmed afterwards
  {
    productId: 'p-old-town-print',
    variantId: 'a4',
    pickupDate: '2026-10-19',
    pickupPlaceId: 'altstadt',
    steps: ['accept', 'start-payment', 'expire', 'payment-succeeds'],
  },
]

const MINUTE = 60_000

function requestedOrder(
  state: DemoState,
  sample: Sample,
  ref: string,
  guestId: string,
  language: Language,
  createdAt: string,
): Order | null {
  const product = state.data.products.find(p => p.id === sample.productId)
  const variant = product?.variants.find(v => v.id === sample.variantId)

  if (!product || !variant)
    return null

  const line: OrderLine = {
    id: `${product.id}-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    productName: product.name,
    variantLabel: variant.label,
    unitPrice: variant.price,
    quantity: 1,
    engraving: sample.engraving,
    commissionRate: product.commissionRate,
  }

  return {
    id: ref.toLowerCase(),
    ref,
    guestId,
    language,
    createdAt,
    lines: [line],
    pickupDate: sample.pickupDate,
    pickupPlaceId: sample.pickupPlaceId,
    paymentPolicy: product.paymentPolicy,
    cancellationPolicy: product.cancellationPolicy,
    status: 'requested',
    partnerId: null,
    payments: [],
    log: [{ type: 'requested', at: createdAt, actor: 'guest' }],
  }
}

function applyStep(
  state: DemoState,
  id: string,
  step: Step,
  at: Date,
  staffLanguage: Language,
): DemoState {
  const ctx = <A extends Actor>(actor: A): TransitionContext<A> => ({
    actor,
    now: at,
    staffLanguage,
  })

  switch (step) {
    case 'accept':
      return tr.accept(state, id, ctx('manager'))
    case 'change-place':
      return tr.changePickup(
        state,
        id,
        {
          field: 'place',
          to: 'bahnhof',
          note: 'Guest asked by email, the hotel is near the station',
        },
        ctx('manager'),
      )
    case 'start-payment':
      return tr.startOnlinePayment(state, id, ctx('guest'))
    case 'payment-succeeds':
      return tr.resolveOnlinePayment(state, id, 'succeeded', ctx('system'))
    case 'ready':
      return tr.markReady(state, id, ctx('manager'))
    case 'hand-over':
      return tr.handOver(state, id, ctx('manager'))
    case 'expire':
      return tr.expirePaymentDeadline(state, id, ctx('system'))
  }
}

/** Adds the samples for the signed-in guest; their steps happened over the last few hours. */
export function addSampleOrders(
  state: DemoState,
  now: Date,
  staffLanguage: Language,
): DemoState {
  const guestId = state.data.signedInGuestId

  if (!guestId)
    return state

  const mail = state.data.mail
  let next = state

  samples.forEach((sample, i) => {
    const number = next.data.nextOrderNumber
    const ref = `SK-${number}`
    // Each sample starts a little later than the one before, so C14 keeps this order.
    let at = new Date(now.getTime() - (180 - i * 10) * MINUTE)
    const order = requestedOrder(
      next,
      sample,
      ref,
      guestId,
      'en',
      at.toISOString(),
    )

    if (!order)
      return

    next = {
      ...next,
      data: {
        ...next.data,
        orders: [...next.data.orders, order],
        nextOrderNumber: number + 1,
      },
    }

    for (const step of sample.steps) {
      at = new Date(at.getTime() + MINUTE)
      next = applyStep(next, order.id, step, at, staffLanguage)
    }
  })

  return { ...next, data: { ...next.data, mail } }
}
