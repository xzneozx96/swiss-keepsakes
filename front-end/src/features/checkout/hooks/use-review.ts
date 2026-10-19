import type { LocalizedText } from '@sk/domain/catalog'
import type { ReviewViewProps } from '../components/review-view'
import type { SendBlock } from '../lib/create-orders'

import { zurichDate } from '@sk/domain/catalog'

import {
  dueDatesAtAcceptance,
  firstPaymentAmount,
  lineTotal,
  orderTotal,
} from '@sk/domain/orders'

import { formatMoney, formatShortDate, pickText } from '@sk/domain/shared'
import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces, useProducts } from '@/features/catalog/api/queries'
import { shop } from '@/features/catalog/seed'
import { useCommand } from '@/features/data-client'
import { useDemoNow, useDemoSelector } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useReferralVisits } from '@/features/partners/api/queries'
import {
  buildOrderDrafts,
  sendBlock,
} from '../lib/create-orders'

/**
 * C06 Review and send (AC25, AC28): the orders the request creates, each with its items,
 * requested pickup, total, the amount due once the seller confirms, the deadline rule and the
 * cancellation policy. Amounts come from T0's selectors on the very drafts that are stored on
 * send. `send` returns null when it is blocked (the error is shown and the cart stays as it
 * was), and otherwise the new order ids once the screens can read them. Null view when no cart
 * line is ticked.
 */
export function useReview(): {
  view: Omit<ReviewViewProps, 'onBack' | 'onSend' | 'onEditCart'> | null
  send: () => Promise<string[]> | null
} {
  const { t, language, intlLocale } = useLocale()
  const { mutateAsync: submitCart } = useCommand('orders', 'submitCart')
  const cart = useDemoSelector(s => s.data.cart)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const nextOrderNumber = useDemoSelector(s => s.data.nextOrderNumber)
  const products = useProducts()
  const storedOrders = useOrders()
  const referralVisits = useReferralVisits()
  const pickupPlaces = usePickupPlaces()
  const cartData = {
    cart,
    signedInGuestId,
    nextOrderNumber,
    products,
    orders: storedOrders,
    referralVisits,
  }
  const now = useDemoNow()
  const [error, setError] = useState<SendBlock | null>(null)

  const drafts = buildOrderDrafts(cartData, { now, language })
  const today = zurichDate(now)
  const short = (iso: string) => formatShortDate(iso, today, intlLocale)
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const pick = (text: LocalizedText) => pickText(text, language)

  const send = () => {
    const block = sendBlock(cartData, now)

    setError(block)
    if (block)
      return null

    return submitCart({ language })
  }

  if (drafts.length === 0)
    return { view: null, send }

  const itemName = (
    name: LocalizedText,
    variant: LocalizedText,
    hasOptions: boolean,
  ) =>
    [pick(name).text, hasOptions ? pick(variant).text : undefined]
      .filter(Boolean)
      .join(' · ')

  const errorView = (): ReviewViewProps['error'] => {
    if (!error || error.code === 'empty' || error.code === 'signed-out')
      return undefined

    if (error.code === 'invalid-date') {
      return {
        title: t('checkout.error.date.title'),
        lines: [],
        message: t(`checkout.error.date.message.${plural(error.count)}`, {
          count: error.count,
        }),
        actionLabel: t('checkout.error.action'),
      }
    }

    return {
      title: t('checkout.error.stock.title'),
      lines: error.lines.map((l) => {
        const item = itemName(l.productName, l.variantLabel, l.hasOptions)

        return l.available === 0
          ? t('checkout.error.stock.soldOut', { item })
          : t('checkout.error.stock.fewer', {
              item,
              available: l.available,
              requested: l.requested,
            })
      }),
      message: t('checkout.error.stock.message'),
      actionLabel: t('checkout.error.action'),
    }
  }

  const reference = drafts.reduce((sum, o) => sum + orderTotal(o), 0)
  const onlyIn = new Set<string>()

  const orders = drafts.map((order, index) => {
    const place = pickupPlaces.find(
      p => p.id === order.pickupPlaceId,
    )
    const total = orderTotal(order)
    const due = firstPaymentAmount(order)
    const policy = order.paymentPolicy
    const cancellation = pick(order.cancellationPolicy)

    if (cancellation.isFallback)
      onlyIn.add(cancellation.language)

    const rule
      = policy.kind === 'full'
        ? t('checkout.rule.full', { hours: policy.firstDueHours })
        : policy.kind === 'deposit'
          ? t('checkout.rule.deposit', {
              percent: policy.depositPercent,
              hours: policy.firstDueHours,
              balance: money(total - due),
              date: short(
                dueDatesAtAcceptance(order, now).balanceDueDate
                ?? order.pickupDate,
              ),
            })
          : t('checkout.rule.later', {
              amount: money(total),
              date: short(
                dueDatesAtAcceptance(order, now).balanceDueDate
                ?? order.pickupDate,
              ),
            })

    return {
      key: order.id,
      title: t('cart.order.title', { n: index + 1 }),
      policy:
        policy.kind === 'deposit'
          ? t('cart.policy.deposit', { percent: policy.depositPercent })
          : t(`cart.policy.${policy.kind}`),
      items: order.lines.map((line) => {
        const product = products.find(
          p => p.id === line.productId,
        )
        const name = pick(line.productName)

        if (name.isFallback)
          onlyIn.add(name.language)

        return {
          id: line.id,
          name: name.text,
          photo: product?.photo,
          store: shop.name,
          // One-variant gifts carry a "Standard" label; it says nothing, so it is left out.
          option:
            (product?.variants.length ?? 0) > 1
              ? pick(line.variantLabel).text
              : undefined,
          engraving: line.engraving
            ? t('cart.line.engraving', { text: line.engraving })
            : undefined,
          quantity: t('checkout.item.quantity', {
            quantity: line.quantity,
            price: money(line.unitPrice),
          }),
          total: money(lineTotal(line)),
        }
      }),
      requestDate: t('cart.line.requestDate', {
        date: short(order.pickupDate),
      }),
      place: place ? pick(place.name).text : '',
      totalLabel: t('checkout.order.total'),
      total: money(total),
      dueLabel: t('checkout.order.due'),
      due: money(due),
      rule,
      cancellationTitle: t('checkout.order.cancellation'),
      cancellation: cancellation.text,
    }
  })

  return {
    send,
    view: {
      title: t('checkout.title'),
      backLabel: t('checkout.back'),
      intro: t('checkout.intro'),
      languageNotice:
        onlyIn.size > 0
          ? t(
              onlyIn.has('en')
                ? 'checkout.onlyInEnglish'
                : 'checkout.onlyInGerman',
            )
          : undefined,
      orders,
      bar: {
        totalLabel: t('checkout.bar.total'),
        total: money(reference),
        chip: t('cart.bar.nothingNow'),
        detailsLabel: t('cart.bar.details'),
        sendLabel: t('checkout.bar.send'),
      },
      breakdown: {
        title: t('cart.sheet.title'),
        closeLabel: t('cart.sheet.close'),
      },
      error: errorView(),
    },
  }
}
