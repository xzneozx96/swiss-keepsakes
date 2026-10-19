import type { Order, OrderLine, Payment } from '@/features/orders/types'

import { products } from '@/features/catalog/seed'
import { DEMO_START } from '@/features/demo/clock'
import { otherGuests } from '@/features/orders/seed'

/**
 * DEMO HISTORY (step 1.9s). About nine weeks of closed orders before the demo start, so the
 * Overview analytics have a past to compare with. These orders live only here: they are
 * never written to `data.orders`, so M02 tasks, M03 tabs, P02 partner numbers and stock
 * stay exactly as the seed sets them. Only completed, declined and cancelled orders, all
 * closed before the demo start; deterministic (fixed PRNG seed), built once.
 */

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const HISTORY_DAYS = 63

/** Mulberry32: a small seeded PRNG, so every reload draws the same history. */
export function prng(seed: number) {
  let a = seed

  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

// Every product in the catalogue is a keepsake; tours are separate data.
const gifts = products

function pick<T>(rand: () => number, weighted: [T, number][]): T {
  let r = rand() * weighted.reduce((sum, [, w]) => sum + w, 0)

  for (const [value, weight] of weighted) {
    r -= weight
    if (r <= 0)
      return value
  }

  return weighted.at(-1)![0]
}

function historyOrder(rand: () => number, n: number, createdMs: number): Order {
  const product = gifts[Math.floor(rand() * gifts.length)]
  const variant
    = product.variants[Math.floor(rand() * product.variants.length)]
  const quantity = rand() < 0.8 ? 1 : 2
  const line: OrderLine = {
    id: `${product.id}-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    productName: product.name,
    variantLabel: variant.label,
    unitPrice: variant.price,
    quantity,
    commissionRate: product.commissionRate,
  }
  const total = line.unitPrice * quantity
  const createdAt = new Date(createdMs).toISOString()
  const lastMs = DEMO_START - 2 * HOUR_MS
  const pickupMs = Math.min(
    createdMs + (2 + Math.floor(rand() * 5)) * DAY_MS,
    lastMs,
  )
  const ref = `SK-H${String(n).padStart(3, '0')}`
  const base = {
    id: ref.toLowerCase(),
    ref,
    guestId: otherGuests[n % otherGuests.length].id,
    language: rand() < 0.6 ? 'en' : 'de',
    createdAt,
    lines: [line],
    pickupDate: new Date(pickupMs).toISOString().slice(0, 10),
    pickupPlaceId: rand() < 0.64 ? 'altstadt' : 'bahnhof',
    paymentPolicy: product.paymentPolicy,
    cancellationPolicy: product.cancellationPolicy,
    partnerId: pick<string | null>(rand, [
      [null, 0.55],
      ['hotel-am-see', 0.28],
      ['guide-marco', 0.17],
    ]),
  } satisfies Partial<Order>
  const requested = {
    type: 'requested',
    at: createdAt,
    actor: 'guest',
  } as const
  const outcome = pick(rand, [
    ['completed', 0.8],
    ['declined', 0.11],
    ['cancelled', 0.09],
  ] as const)

  if (outcome === 'declined') {
    return {
      ...base,
      status: 'declined',
      payments: [],
      log: [
        requested,
        {
          type: 'declined',
          reason: 'Sold out',
          at: new Date(createdMs + 3 * HOUR_MS).toISOString(),
          actor: 'owner',
        },
      ],
    }
  }

  const acceptedMs = createdMs + (1 + Math.floor(rand() * 4)) * HOUR_MS
  const acceptedAt = new Date(acceptedMs).toISOString()

  if (outcome === 'cancelled') {
    return {
      ...base,
      status: 'cancelled',
      acceptedAt,
      payments: [],
      log: [
        requested,
        { type: 'accepted', at: acceptedAt, actor: 'manager' },
        {
          type: 'cancelled',
          reason: 'overdue',
          at: new Date(acceptedMs + 24 * HOUR_MS).toISOString(),
          actor: 'system',
        },
      ],
    }
  }

  const method = pick<Payment['method']>(rand, [
    ['online', 0.56],
    ['cash', 0.3],
    ['bank-transfer', 0.14],
  ])
  // Online is paid soon after acceptance; cash and bank transfers at pickup.
  const paidMs
    = method === 'online'
      ? Math.min(acceptedMs + 3 * HOUR_MS, pickupMs)
      : Math.max(pickupMs, acceptedMs + HOUR_MS)
  const completedMs = Math.max(pickupMs, paidMs)
  const paidAt = new Date(paidMs).toISOString()
  const completedAt = new Date(completedMs).toISOString()
  const paymentId = `pay-${base.id}`

  return {
    ...base,
    status: 'completed',
    acceptedAt,
    completedAt,
    completedBy: 'manager',
    commissionRecordedAt: base.partnerId ? completedAt : undefined,
    payments: [
      {
        id: paymentId,
        amount: total,
        method,
        status: 'succeeded',
        at: paidAt,
        recordedBy: method === 'online' ? undefined : 'manager',
      },
    ],
    log: [
      requested,
      { type: 'accepted', at: acceptedAt, actor: 'manager' },
      { type: 'payment', paymentId, at: paidAt, actor: 'guest' },
      { type: 'handed-over', at: completedAt, actor: 'manager' },
      { type: 'completed', at: completedAt, actor: 'manager' },
    ],
  }
}

function buildHistory(): Order[] {
  const rand = prng(1913)
  const orders: Order[] = []

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 1) {
    const dayStart = DEMO_START - daysAgo * DAY_MS
    // Sundays are quiet (the shop is closed); volume grows gently towards the demo date.
    const isSunday = new Date(dayStart).getUTCDay() === 0
    const base = 1.2 + (HISTORY_DAYS - daysAgo) / 30
    const count = isSunday ? 0 : Math.floor(base + rand() * 2.4)

    for (let i = 0; i < count; i += 1) {
      const createdMs
        = dayStart - 2 * HOUR_MS + Math.floor(rand() * 9) * HOUR_MS

      orders.push(historyOrder(rand, orders.length + 1, createdMs))
    }
  }

  return orders
}

/** The demo history, oldest first. Analytics only: never part of `data.orders`. */
export const DEMO_HISTORY: readonly Order[] = buildHistory()
