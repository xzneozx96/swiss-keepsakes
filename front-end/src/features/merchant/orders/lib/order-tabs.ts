import type { Order } from '@sk/domain/orders'

/**
 * M03 status tabs (UX spec §3.2), in order. The ids are the `status` search param of
 * /store/orders, so M02 task cards link straight to a tab: keep them stable.
 */
export const ORDER_TABS = [
  'awaiting-confirmation',
  'awaiting-payment',
  'preparing',
  'ready',
  'owing',
  'completed',
  'cancelled',
] as const

export type OrderTabId = (typeof ORDER_TABS)[number]

export const DEFAULT_ORDER_TAB: OrderTabId = 'awaiting-confirmation'

/** Every order falls in exactly one tab. Declined orders sit with the cancelled ones. */
export function orderTab(order: Order): OrderTabId {
  switch (order.status) {
    case 'requested':
      return 'awaiting-confirmation'
    case 'accepted':
      return 'awaiting-payment'
    case 'preparing':
      return 'preparing'
    case 'ready':
      return 'ready'
    case 'handed_over':
      return 'owing'
    case 'completed':
      return 'completed'
    case 'declined':
    case 'cancelled':
      return 'cancelled'
  }
}

export function isOrderTab(value: unknown): value is OrderTabId {
  return ORDER_TABS.includes(value as OrderTabId)
}
