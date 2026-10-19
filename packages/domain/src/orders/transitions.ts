import type { OrderStatus } from './types'
import type { Transition, TransitionTable } from '../shared/transitions'

import { canMove, listTransitions } from '../shared/transitions'

/**
 * Keepsake order lifecycle (UX spec §2.1). Pickup changes, payments and the "handed over and
 * complete" button do not change the status on their own, so they have no row here.
 * - accept: requested to accepted (payment due) or preparing (pay later)
 * - first payment succeeded: accepted to preparing
 * - cancel before acceptance: requested to cancelled by the guest (backend 6.1); the shop declines instead
 * - cancel: accepted by the guest or the overdue job; accepted, preparing or ready by the shop
 */
export const ORDER_TRANSITIONS: TransitionTable<OrderStatus> = {
  requested: ['accepted', 'preparing', 'declined', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['handed_over', 'cancelled'],
  handed_over: ['completed'],
  completed: [],
  declined: [],
  cancelled: [],
}

export type OrderTransition = Transition<OrderStatus>

export const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS) as OrderStatus[]

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return canMove(ORDER_TRANSITIONS, from, to)
}

export function orderTransitions(): OrderTransition[] {
  return listTransitions(ORDER_TRANSITIONS)
}
