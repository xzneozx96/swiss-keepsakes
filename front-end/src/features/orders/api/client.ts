import type { Order } from '@sk/domain/orders'
import type { Language } from '@/contexts/locale-context'

/** Keepsake orders (C13 to C15, M02 to M04). */
export interface OrdersClient {
  orders: () => Promise<Order[]>
  /**
   * Sends the lines ticked in the browser's cart (C06) as one order per group and takes them out
   * of the cart. Resolves to the new order ids, none when the cart can no longer be sent.
   */
  submitCart: (input: { language: Language }) => Promise<string[]>
}
