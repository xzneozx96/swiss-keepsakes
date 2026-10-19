import type { ReviewOrderView } from '@/features/checkout/components/review-view'
import type { ReviewOrderOptionProps } from '@/features/lab/review-order-options'

import { Alert } from '@heroui/react'
import { formatMoney, pickText } from '@sk/domain/shared'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { products, shop } from '@/features/catalog/seed'
import { useDemo } from '@/features/demo'
import {
  ReviewCompact,
  ReviewDueFirst,
  ReviewHairline,
  ReviewLabelled,
  ReviewPaymentForward,
  ReviewPhotoForward,
  ReviewReceipt,
  ReviewSectioned,
  ReviewTiles,
} from '@/features/lab/review-order-options'

/** Lab: C06 orders as one white card each. Not part of the product. */
export const Route = createFileRoute('/lab/review')({
  component: ReviewLab,
})

const options: {
  id: string
  title: string
  note: string
  Option: (props: ReviewOrderOptionProps) => React.ReactNode
}[] = [
  {
    id: 'A',
    title: 'A · Sectioned card',
    note: 'One white card per order, split by full-width lines into pickup facts, gifts, totals and cancellation. The gifts are rows, not cards.',
    Option: ReviewSectioned,
  },
  {
    id: 'A2',
    title: 'A2 · Labelled sections',
    note: 'A with a small label opening each section (Pickup, 2 gifts, Payment) and lines inset from the card edge. Easiest to scan.',
    Option: ReviewLabelled,
  },
  {
    id: 'A3',
    title: 'A3 · Compact rows',
    note: 'Payment type as a chip under the title. Shorter gift rows: 48px photo, price beside the name, option and engraving on one line.',
    Option: ReviewCompact,
  },
  {
    id: 'A4',
    title: 'A4 · Photo-forward',
    note: '88px photos with the quantity as a badge when it is above 1. Warmer and more visual; the tallest of the A family.',
    Option: ReviewPhotoForward,
  },
  {
    id: 'A5',
    title: 'A5 · Payment-forward totals',
    note: 'A\'s layout, but the amount due after the seller confirms is the largest figure in the card, with the order total as a quieter line.',
    Option: ReviewPaymentForward,
  },
  {
    id: 'A6',
    title: 'A6 · Hairline card',
    note: 'A flat card with a thin outline instead of a shadow and a tighter radius. The pickup date leads the header, under a small order label.',
    Option: ReviewHairline,
  },
  {
    id: 'B',
    title: 'B · Gift tiles',
    note: 'The white card holds the order; each gift sits on a soft grey tile inside it, close to today\'s gift slips.',
    Option: ReviewTiles,
  },
  {
    id: 'C',
    title: 'C · Receipt with terms band',
    note: 'Compact receipt lines with a small photo and the price beside the name. The payment rule and cancellation sit on a grey band at the foot of the card.',
    Option: ReviewReceipt,
  },
  {
    id: 'D',
    title: 'D · Due first',
    note: 'The amount due after the seller confirms leads the card, beside the title. Pickup facts on a grey panel, then gifts, total and terms.',
    Option: ReviewDueFirst,
  },
]

/**
 * Two sample orders in the shape `useReview` builds: a full-payment order with an engraved
 * knife and the long English-only print, and a 30% deposit order (the longest rule text).
 */
function useSampleOrders(): ReviewOrderView[] {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text

  const item = (
    productId: string,
    variantId: string,
    quantity: number,
    engraving?: string,
  ) => {
    const product = products.find(p => p.id === productId)
    const variant = product?.variants.find(v => v.id === variantId)

    if (!product || !variant)
      return []

    return [
      {
        id: `${productId}-${variantId}`,
        name: pick(product.name),
        photo: product.photo,
        store: shop.name,
        option: product.variants.length > 1 ? pick(variant.label) : undefined,
        engraving: engraving
          ? t('cart.line.engraving', { text: engraving })
          : undefined,
        quantity: t('checkout.item.quantity', {
          quantity,
          price: money(variant.price),
        }),
        total: money(variant.price * quantity),
        cents: variant.price * quantity,
      },
    ]
  }
  const place = (id: string) =>
    pick(state.data.pickupPlaces.find(p => p.id === id)?.name ?? {})
  const cancellation = (...ids: string[]) =>
    [
      ...new Set(
        ids.map(id =>
          pick(products.find(p => p.id === id)?.cancellationPolicy ?? {}),
        ),
      ),
    ].join('\n')
  const shared = {
    totalLabel: t('checkout.order.total'),
    dueLabel: t('checkout.order.due'),
    cancellationTitle: t('checkout.order.cancellation'),
  }

  const fullItems = [
    ...item('p-vx-chapel-bridge', 'm', 1, 'Anna'),
    ...item('p-print', 'std', 1),
  ]
  const full = fullItems.reduce((sum, i) => sum + i.cents, 0)
  const depositItems = item('p-giftbox', 'std', 2)
  const deposit = depositItems.reduce((sum, i) => sum + i.cents, 0)
  const depositDue = Math.round(deposit * 0.3)

  return [
    {
      ...shared,
      key: 'o1',
      title: t('cart.order.title', { n: 1 }),
      policy: t('cart.policy.full'),
      items: fullItems,
      requestDate: t('cart.line.requestDate', { date: 'Thu 15 Oct' }),
      place: place('altstadt'),
      total: money(full),
      due: money(full),
      rule: t('checkout.rule.full', { hours: 24 }),
      cancellation: cancellation('p-vx-chapel-bridge', 'p-print'),
    },
    {
      ...shared,
      key: 'o2',
      title: t('cart.order.title', { n: 2 }),
      policy: t('cart.policy.deposit', { percent: 30 }),
      items: depositItems,
      requestDate: t('cart.line.requestDate', { date: 'Fri 16 Oct' }),
      place: place('bahnhof'),
      total: money(deposit),
      due: money(depositDue),
      rule: t('checkout.rule.deposit', {
        percent: 30,
        hours: 24,
        balance: money(deposit - depositDue),
        date: 'Tue 20 Oct',
      }),
      cancellation: cancellation('p-giftbox'),
    },
  ]
}

/** The C06 page around the orders: title, the intro note, and the stacked order cards. */
function ScreenPreview({
  Option,
  orders,
}: {
  Option: (props: ReviewOrderOptionProps) => React.ReactNode
  orders: ReviewOrderView[]
}) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-5 rounded-[28px] border border-separator bg-background px-4 pt-4 pb-6">
      <p className="font-serif text-title">{t('checkout.title')}</p>
      <Alert className="alert--soft alert--info w-full">
        <Alert.Indicator>
          <InfoIcon size={16} />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Description>{t('checkout.intro')}</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="flex flex-col gap-4">
        {orders.map(order => (
          <Option key={order.key} order={order} />
        ))}
      </div>
    </div>
  )
}

function ReviewLab() {
  const orders = useSampleOrders()
  const [selection, setSelection] = useState('a-family')
  const family = options.filter(option => option.id.startsWith('A'))
  const earlier = options.filter(option => !option.id.startsWith('A'))
  const shown
    = selection === 'a-family'
      ? family
      : options.filter(option => option.id === selection)

  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-[1640px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Review and send: one box per order
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Round 2: variations on A, the sectioned white card. Each order, with
            its pickup facts, gifts, totals and terms, sits inside its own card.
            Same two orders in each: an engraved knife with the long print name,
            and a 30% deposit order. Each preview stays at phone width.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3 border-y border-separator py-4">
          <div aria-label="Review layouts" className="flex flex-wrap gap-2">
            {[
              { id: 'a-family', label: 'Compare A family' },
              ...family.map(option => ({
                id: option.id,
                label: option.title.split(' · ')[1],
              })),
            ].map(({ id, label }) => (
              <button
                key={id}
                aria-pressed={selection === id}
                className={`min-h-11 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:focus-ring ${selection === id ? 'bg-foreground text-background' : 'bg-default text-foreground hover:bg-default-hover'}`}
                type="button"
                onClick={() => setSelection(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted sm:ms-auto">
            Earlier directions
            <select
              aria-label="Earlier directions"
              className="min-h-11 max-w-24 rounded-lg border border-border bg-surface px-3 text-foreground outline-none focus-visible:focus-ring"
              value={
                earlier.some(option => option.id === selection)
                  ? selection
                  : ''
              }
              onChange={event =>
                setSelection(event.target.value || 'a-family')}
            >
              <option value="">Select</option>
              {earlier.map(option => (
                <option key={option.id} value={option.id}>
                  {option.id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={
            selection === 'a-family'
              ? 'grid grid-cols-1 items-start justify-items-center gap-8 min-[860px]:grid-cols-2 min-[1240px]:grid-cols-3'
              : 'flex justify-center'
          }
        >
          {shown.map(({ id, title, note, Option }) => (
            <section
              key={id}
              aria-label={title}
              className="flex w-full max-w-[375px] flex-col gap-5"
            >
              <div className="flex min-h-28 flex-col gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm leading-relaxed text-muted">{note}</p>
              </div>
              <ScreenPreview Option={Option} orders={orders} />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
