import type { CartLine } from './cart'
import type {
  PaymentPolicy,
  Product,
  Rappen,
  Variant,
} from '../catalog/types'

import {
  isPickupClosed,
  productEarliestPickup,
} from '../catalog/pickup'

/** A cart line with its product, current price and date check. */
export interface CartOrderLine {
  line: CartLine
  product: Product
  variant: Variant
  unitPrice: Rappen
  total: Rappen
  /**
   * Set when the requested date can no longer be requested for this product (too soon
   * for its preparation days, or a closed day). AC04: the line is marked, not dropped.
   */
  invalidDate?: { earliest: string, reason: 'too-early' | 'closed' }
}

/** One future order: lines that share a payment policy, pickup date and place (R12). */
export interface CartOrder {
  key: string
  paymentPolicy: PaymentPolicy
  pickupDate: string
  pickupPlaceId: string
  lines: CartOrderLine[]
  subtotal: Rappen
}

/** Same policy = same kind and the same numbers; an order snapshots exactly one policy. */
function policyKey(policy: PaymentPolicy): string {
  switch (policy.kind) {
    case 'full':
      return `full:${policy.firstDueHours}`
    case 'deposit':
      return `deposit:${policy.depositPercent}:${policy.firstDueHours}:${policy.balanceDueDaysAfterPickup}`
    case 'later':
      return `later:${policy.dueDaysAfterPickup}`
  }
}

function checkDate(
  product: Product,
  date: string,
  now: Date,
): CartOrderLine['invalidDate'] {
  const earliest = productEarliestPickup(product, now)

  if (date < earliest)
    return { earliest, reason: 'too-early' }
  if (isPickupClosed(date))
    return { earliest, reason: 'closed' }

  return undefined
}

/**
 * Each cart line with its product, current catalogue price and date check, in cart order
 * (C04's flat list). Lines whose product or variant no longer exists are left out.
 * `now` is the demo time.
 */
export function priceCartLines(
  lines: CartLine[],
  products: Product[],
  now: Date,
): CartOrderLine[] {
  return lines.flatMap((line) => {
    const product = products.find(p => p.id === line.productId)
    const variant = product?.variants.find(v => v.id === line.variantId)

    if (!product || !variant)
      return []

    return [
      {
        line,
        product,
        variant,
        unitPrice: variant.price,
        total: variant.price * line.quantity,
        invalidDate: checkDate(product, line.pickupDate, now),
      },
    ]
  })
}

/** The lines the guest ticked on C04; only these go to C06 and are sent. */
export function selectedCartLines(lines: CartLine[]) {
  return lines.filter(l => l.selected)
}

/**
 * Groups cart lines into the orders a request will create (R12, AC28): one order per
 * payment policy, pickup date and pickup place. Orders keep the order in which their
 * first line was added, so the first gift added is in Order 1. Prices are read from the
 * catalogue now; C06 snapshots them into the order (AC15). C06 passes the selected lines
 * only. `now` is the demo time.
 */
export function groupCartIntoOrders(
  lines: CartLine[],
  products: Product[],
  now: Date,
): CartOrder[] {
  const orders = new Map<string, CartOrder>()

  for (const priced of priceCartLines(lines, products, now)) {
    const { line, product } = priced
    const key = `${policyKey(product.paymentPolicy)}|${line.pickupDate}|${line.pickupPlaceId}`
    const order = orders.get(key) ?? {
      key,
      paymentPolicy: product.paymentPolicy,
      pickupDate: line.pickupDate,
      pickupPlaceId: line.pickupPlaceId,
      lines: [],
      subtotal: 0,
    }

    order.lines.push(priced)
    order.subtotal += priced.total
    orders.set(key, order)
  }

  return [...orders.values()]
}
