import type { LocalizedText } from '@sk/domain/catalog'
import type { Order, OrderLine } from '@sk/domain/orders'
import type { Language } from '@/contexts/locale-context'
import type { DemoData, DemoState } from '@/features/demo/types'

import {
  groupCartIntoOrders,
  selectedCartLines,
  variantAvailable,
} from '@sk/domain/orders'
import { sendMail } from '@/features/notifications/mail'
import { attributedPartnerId } from '@/features/partners/referral'

/** What a request reads: the browser's cart and sign-in, and the shop's gifts, orders and partner visits. */
export type CartData = Pick<
  DemoData,
  | 'cart'
  | 'signedInGuestId'
  | 'nextOrderNumber'
  | 'products'
  | 'orders'
  | 'referralVisits'
>

export interface CheckoutContext {
  /** Demo time (features/demo/clock.ts). */
  now: Date
  /** The guest's UI language: stored on the order, so guest emails use it (spec §6). */
  language: Language
  /** Staff emails use the staff UI language (T0 convention). */
  staffLanguage: Language
}

/** A cart line the shop can no longer supply in the requested quantity (stock changed). */
export interface SoldOutLine {
  productName: LocalizedText
  variantLabel: LocalizedText
  /** False for a one-option gift, whose "Standard" label says nothing. */
  hasOptions: boolean
  requested: number
  available: number
}

export type SendBlock
  = | { code: 'empty' }
    | { code: 'signed-out' }
    | { code: 'invalid-date', count: number }
    | { code: 'stock-changed', lines: SoldOutLine[] }

/**
 * Policies are snapshotted once per order (AC15), but the cart groups by payment policy,
 * date and place only, so two gifts with different cancellation texts can share an order.
 * Then the order keeps every distinct text, one paragraph each, so none is lost.
 */
function joinedPolicy(texts: LocalizedText[]): LocalizedText {
  const out: LocalizedText = {}

  for (const language of ['en', 'de'] as const) {
    const distinct = [
      ...new Set(texts.map(t => t[language]).filter(Boolean)),
    ]

    if (distinct.length)
      out[language] = distinct.join('\n\n')
  }

  return out
}

/**
 * The orders a request would create from the lines ticked on C04, exactly as they will be
 * stored: grouped by payment policy, date and place (R12), names, prices, commission rate and policies snapshotted (AC15), partner from
 * the last click within 30 days (AC11). C06 renders these drafts, so the screen and the data
 * share one source. Ids follow `nextOrderNumber` (SK-1043, SK-1044, …), so the result is the
 * same however often it runs.
 */
export function buildOrderDrafts(
  data: CartData,
  ctx: Pick<CheckoutContext, 'now' | 'language'>,
): Order[] {
  const at = ctx.now.toISOString()
  const partnerId = attributedPartnerId(data.referralVisits, ctx.now)

  return groupCartIntoOrders(
    selectedCartLines(data.cart),
    data.products,
    ctx.now,
  ).map((group, i) => {
    const ref = `SK-${data.nextOrderNumber + i}`
    const id = ref.toLowerCase()
    const lines: OrderLine[] = group.lines.map(
      ({ line, product, variant, unitPrice }, n) => ({
        id: `${id}-${n + 1}`,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantLabel: variant.label,
        unitPrice,
        quantity: line.quantity,
        engraving: line.engraving,
        commissionRate: product.commissionRate,
      }),
    )

    return {
      id,
      ref,
      guestId: data.signedInGuestId ?? '',
      language: ctx.language,
      createdAt: at,
      lines,
      pickupDate: group.pickupDate,
      pickupPlaceId: group.pickupPlaceId,
      paymentPolicy: group.paymentPolicy,
      cancellationPolicy: joinedPolicy(
        group.lines.map(l => l.product.cancellationPolicy),
      ),
      status: 'requested',
      partnerId,
      payments: [],
      log: [{ type: 'requested', at, actor: 'guest' }],
    }
  })
}

/**
 * Why the ticked lines cannot be sent right now, or null. Stock is checked, never held: a
 * request reserves nothing (AC05), so the check compares all ticked lines (one variant can
 * sit in two orders) with the units not yet held by accepted orders.
 */
export function sendBlock(data: CartData, now: Date): SendBlock | null {
  const chosen = selectedCartLines(data.cart)

  if (chosen.length === 0)
    return { code: 'empty' }
  if (!data.signedInGuestId)
    return { code: 'signed-out' }

  const groups = groupCartIntoOrders(chosen, data.products, now)
  const invalid = groups
    .flatMap(g => g.lines)
    .filter(l => l.invalidDate)
    .length

  if (invalid)
    return { code: 'invalid-date', count: invalid }

  const wanted = new Map<
    string,
    SoldOutLine & { productId: string, variantId: string }
  >()

  for (const { line, product, variant } of groups.flatMap(g => g.lines)) {
    const key = `${product.id}/${variant.id}`
    const entry = wanted.get(key)

    if (entry) {
      entry.requested += line.quantity
    }
    else {
      wanted.set(key, {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantLabel: variant.label,
        hasOptions: product.variants.length > 1,
        requested: line.quantity,
        available: variantAvailable(data, product.id, variant.id),
      })
    }
  }

  const short = [...wanted.values()]
    .filter(w => w.requested > w.available)
    .map(({ productId: _p, variantId: _v, ...rest }) => rest)

  return short.length ? { code: 'stock-changed', lines: short } : null
}

/**
 * Sends the request (C06): adds one `requested` order per group of ticked lines, emails N02
 * to the guest and N03 to staff for each, and takes the sent lines out of the cart; unticked
 * lines stay. Re-checks `sendBlock` on the state it gets,
 * so stock that changed since the screen rendered leaves everything unchanged.
 */
export function createOrdersFromCart(
  state: DemoState,
  ctx: CheckoutContext,
): DemoState {
  if (sendBlock(state.data, ctx.now))
    return state

  const orders = buildOrderDrafts(state.data, ctx)
  const at = ctx.now.toISOString()
  let next: DemoState = {
    ...state,
    data: {
      ...state.data,
      orders: [...state.data.orders, ...orders],
      nextOrderNumber: state.data.nextOrderNumber + orders.length,
      cart: state.data.cart.filter(l => !l.selected),
    },
  }

  for (const order of orders) {
    next = sendMail(next, {
      at,
      to: 'guest',
      guestId: order.guestId,
      language: order.language,
      template: 'N02',
      orderId: order.id,
      params: {
        orderRef: order.ref,
        pickupDate: order.pickupDate,
        pickupPlaceId: order.pickupPlaceId,
      },
    })
    next = sendMail(next, {
      at,
      to: 'staff',
      language: ctx.staffLanguage,
      template: 'N03',
      orderId: order.id,
      params: { orderRef: order.ref },
    })
  }

  return next
}
