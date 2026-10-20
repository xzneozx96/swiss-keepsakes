import type { Order } from '@sk/domain/orders'
import type { Language } from '@/contexts/locale-context'
import type {
  OfflinePaymentInput,
  PickupChange,
} from '@/features/orders/lib/transitions'

/** One order, and the language staff emails are written in. */
interface OrderInput {
  id: string
  language: Language
}

/**
 * Keepsake orders (C13 to C15, M02 to M04). Each change is checked again on the latest data and
 * leaves the order as it is when it is no longer allowed.
 */
export interface OrdersClient {
  orders: () => Promise<Order[]>
  /**
   * Sends the lines ticked in the browser's cart (C06) as one order per group and takes them out
   * of the cart. Resolves to the new order ids, none when the cart can no longer be sent.
   */
  submitCart: (input: { language: Language }) => Promise<string[]>
  accept: (input: OrderInput) => Promise<void>
  decline: (input: OrderInput & { reason: string }) => Promise<void>
  changePickup: (input: OrderInput & { change: PickupChange }) => Promise<void>
  /** The guest pays online (C12); demo mode also takes the provider's answer. */
  payOnline: (
    input: OrderInput & { outcome: 'succeeded' | 'failed' | 'processing' },
  ) => Promise<void>
  recordOfflinePayment: (
    input: OrderInput & { payment: OfflinePaymentInput },
  ) => Promise<void>
  markReady: (input: OrderInput) => Promise<void>
  handOver: (input: OrderInput) => Promise<void>
  complete: (input: OrderInput) => Promise<void>
  handOverAndComplete: (input: OrderInput) => Promise<void>
  cancel: (input: OrderInput & { by: 'guest' | 'merchant' }) => Promise<void>
}
