import type { Product, Variant } from '../types'
import type { Order } from '@/features/orders/types'

/** Orders hold their units from acceptance until handover or cancellation (O05, AC05). */
const holdingStatuses = new Set<Order['status']>([
  'accepted',
  'preparing',
  'ready',
])

/** Units of a variant that a guest can still request: on-hand stock minus held units. */
export function availableUnits(
  product: Product,
  variant: Variant,
  orders: Order[],
): number {
  if (variant.notForSale)
    return 0

  const held = orders
    .filter(o => holdingStatuses.has(o.status))
    .flatMap(o => o.lines)
    .filter(l => l.productId === product.id && l.variantId === variant.id)
    .reduce((sum, l) => sum + l.quantity, 0)

  return Math.max(0, variant.stock - held)
}

export function isSoldOut(product: Product, orders: Order[]): boolean {
  return product.variants.every(v => availableUnits(product, v, orders) <= 0)
}

/** Lowest price among variants on sale, for "from CHF …". */
export function fromPrice(product: Product): number {
  const onSale = product.variants.filter(v => !v.notForSale)

  return Math.min(
    ...(onSale.length ? onSale : product.variants).map(v => v.price),
  )
}
