import type { LabOrderRow } from '@/features/lab/order-card-options'
import type { Order } from '@/features/orders/types'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { zurichDate } from '@/features/catalog/lib/pickup'
import { useDemo, useDemoNow } from '@/features/demo'
import {
  OrderLedger,
  OrderSheets,
  OrderTickets,
} from '@/features/lab/order-card-directions'
import {
  OrderDayGroups,
  OrderDayPanel,
  OrderDayPlace,
  OrderDaySectioned,
  OrderGuestHeader,
  OrderSectionedCard,
  OrderTimeline,
} from '@/features/lab/order-card-options'
import { orderTab } from '@/features/merchant/orders/lib/order-tabs'
import {
  formatOrderDate,
  formatOrderDateTime,
} from '@/features/orders/lib/format'
import {
  formatLabel,
  paymentLabel,
  progressLabel,
} from '@/features/orders/lib/labels'
import { orderTotal } from '@/features/orders/lib/selectors'
import {
  calendarDay,
  dateTimeFormat,
  formatMoney,
  formatShortDate,
} from '@/lib/format'
import { pickText } from '@/lib/localized'

/** Lab: roomier M03 order cards with a gift photo. Not part of the product. */
export const Route = createFileRoute('/lab/order-cards')({
  component: OrderCardsLab,
})

const options = [
  {
    id: 'K',
    title: 'K · Order sheet',
    note: 'A quiet working card. Status first, guest and total together, every gift visible. Pickup and payment read as separate facts.',
    Option: OrderSheets,
  },
  {
    id: 'L',
    title: 'L · Pickup ticket',
    note: 'A date-led ticket on a consistent white surface. Complete gift lines, with payment status, amounts and due date each on their own row.',
    Option: OrderTickets,
  },
  {
    id: 'M',
    title: 'M · Open ledger',
    note: 'An unboxed daily list. Typography, spacing and fine rules separate orders, with the full width available for every gift and payment detail.',
    Option: OrderLedger,
  },
  {
    id: 'F',
    title: 'F · Day heading + sectioned card (D around A)',
    note: 'The date is a heading with an order count; each card is A with only the place in its header.',
    Option: OrderDaySectioned,
  },
  {
    id: 'G',
    title: 'G · One panel per day (Airbnb host Today)',
    note: 'Day heading, then one white panel with that day\'s orders as rows split by lines. Photo with a quantity badge, guest and total, gift, place and reference, labels.',
    Option: OrderDayPanel,
  },
  {
    id: 'H',
    title: 'H · Day, then place (pickup run sheet)',
    note: 'Under each day, a small place heading, so staff see what goes to the shop and what goes to the pickup point.',
    Option: OrderDayPlace,
  },
  {
    id: 'I',
    title: 'I · Guest header card (A turned round, Shopify)',
    note: 'Guest and reference as the card header; gifts and labels in the middle; pickup day, place and total in the footer.',
    Option: OrderGuestHeader,
  },
  {
    id: 'J',
    title: 'J · Day timeline (Airbnb Trips itinerary)',
    note: 'A date tile per day on a thin line down the left; that day\'s A cards beside it.',
    Option: OrderTimeline,
  },
  {
    id: 'A',
    title: 'A · Sectioned card (round 1)',
    note: 'For comparison.',
    Option: OrderSectionedCard,
  },
  {
    id: 'D',
    title: 'D · Grouped by pickup day (round 1)',
    note: 'For comparison.',
    Option: OrderDayGroups,
  },
]

const paymentStatuses: Record<string, { en: string, de: string }> = {
  'order.payment.depositPaid': { en: 'Deposit paid', de: 'Anzahlung bezahlt' },
  'order.payment.partPaidDue': { en: 'Partly paid', de: 'Teilweise bezahlt' },
  'order.payment.partPaid': { en: 'Partly paid', de: 'Teilweise bezahlt' },
  'order.payment.payLater': { en: 'Pay later', de: 'Später bezahlen' },
  'order.payment.owed': { en: 'Payment outstanding', de: 'Zahlung ausstehend' },
  'order.payment.paidInFull': { en: 'Paid in full', de: 'Vollständig bezahlt' },
  'order.payment.paid': { en: 'Paid', de: 'Bezahlt' },
  'order.payment.due': { en: 'Payment due', de: 'Zahlung fällig' },
  'order.payment.overdue': { en: 'Overdue', de: 'Überfällig' },
}

/** Lab-only sample: an order with two gifts, to show the stacked thumbnail. */
function withTwoGifts(order: Order): Order {
  return {
    ...order,
    id: `${order.id}-two`,
    ref: 'SK-1034',
    guestId: 'g-anna',
    pickupPlaceId: 'bahnhof',
    lines: [
      ...order.lines,
      {
        id: 'p-chocolate-12',
        productId: 'p-chocolate',
        variantId: '12',
        productName: { en: 'Chocolate set', de: 'Schokoladenset' },
        variantLabel: { en: '12 pieces', de: '12 Stück' },
        unitPrice: 2400,
        quantity: 2,
        commissionRate: 0.15,
      },
    ],
  }
}

function useLabRows(): LabOrderRow[] {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const now = useDemoNow()
  const { orders, guests, products } = state.data
  const today = zurichDate(now)
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text
  const part = (iso: string, option: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, { ...option, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )

  const open = orders
    .filter(o => !['completed', 'cancelled'].includes(orderTab(o)))
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))
  const sample = open.find(o => o.status === 'requested')
  const shown = sample ? [...open, withTwoGifts(sample)] : open

  return shown
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))
    .map((order) => {
      const guestName = guests.find(g => g.id === order.guestId)?.name ?? ''
      const gifts = order.lines.map((line) => {
        const product = products.find(p => p.id === line.productId)
        // One-variant gifts carry a "Standard" label; it says nothing, so it is left out.
        const variant
          = product && product.variants.length > 1 ? pick(line.variantLabel) : ''
        const engraving = line.engraving
          ? t('cart.line.engraving', { text: line.engraving })
          : ''

        return {
          name: pick(line.productName),
          meta: [variant, engraving].filter(Boolean).join(' · '),
          quantity: line.quantity,
          photo: product?.photo,
        }
      })
      const [first, ...rest] = gifts
      const place = state.data.pickupPlaces.find(
        p => p.id === order.pickupPlaceId,
      )
      const shownLabel = (label: ReturnType<typeof progressLabel>) => ({
        text: formatLabel(label, t, intlLocale),
        tone: label.tone,
      })
      const payment = paymentLabel(order, now)
      const factLabels: Record<string, string>
        = language === 'de'
          ? {
              paid: 'Bezahlt',
              balance: 'Restbetrag',
              amount: 'Betrag',
              due: 'Fällig am',
            }
          : {
              paid: 'Paid',
              balance: 'Balance',
              amount: 'Amount',
              due: 'Due date',
            }
      const paymentDetails = {
        status:
          paymentStatuses[payment.key]?.[language]
          ?? formatLabel(payment, t, intlLocale),
        facts: Object.entries(payment.vars ?? {}).map(([name, value]) => ({
          label: factLabels[name] ?? name,
          value:
            typeof value !== 'object'
              ? String(value)
              : 'money' in value
                ? formatMoney(value.money / 100, intlLocale)
                : 'date' in value
                  ? formatOrderDate(value.date, intlLocale)
                  : formatOrderDateTime(value.dateTime, intlLocale),
        })),
      }

      return {
        id: order.id,
        href: `#/store/orders/${order.id}`,
        reference: order.ref,
        guestName,
        initial: guestName.charAt(0),
        gifts,
        giftsSummary: rest.length
          ? t('merchantOrders.giftsMore', {
              product: first.name,
              quantity: first.quantity,
              count: rest.length,
            })
          : t('merchantOrders.gifts', {
              product: first?.name ?? '',
              quantity: first?.quantity ?? 0,
            }),
        total: formatMoney(orderTotal(order) / 100, intlLocale),
        progress: shownLabel(progressLabel(order, 'staff')),
        payment: shownLabel(payment),
        paymentDetails,
        pickupDate: formatShortDate(order.pickupDate, today, intlLocale),
        pickupDay: {
          weekday: part(order.pickupDate, { weekday: 'short' }),
          day: part(order.pickupDate, { day: 'numeric' }),
          month: part(order.pickupDate, { month: 'short' }),
        },
        pickupPlace: place ? pick(place.name) : '',
      }
    })
}

function OrderCardsLab() {
  const rows = useLabRows()
  const [selection, setSelection] = useState('L')
  const visibleOptions
    = selection === 'new'
      ? options.slice(0, 3)
      : options.filter(option => option.id === selection)

  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-[1200px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A clearer view of each order.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Three fresh directions for the store order list. Compare the same
            five orders, including a two-gift sample. Each preview stays at
            phone width.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3 border-y border-separator py-4">
          <div aria-label="New order layouts" className="flex flex-wrap gap-2">
            {[
              { id: 'new', label: 'Compare new' },
              ...options.slice(0, 3).map(option => ({
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
                options.slice(3).some(option => option.id === selection)
                  ? selection
                  : ''
              }
              onChange={event => setSelection(event.target.value || 'new')}
            >
              <option value="">Select</option>
              {options.slice(3).map(option => (
                <option key={option.id} value={option.id}>
                  {option.id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={
            selection === 'new'
              ? 'grid grid-cols-1 items-start justify-items-center gap-8 min-[1100px]:grid-cols-3'
              : 'flex justify-center'
          }
        >
          {visibleOptions.map(({ id, title, note, Option }) => (
            <section
              key={id}
              aria-label={title}
              className="flex w-full max-w-[375px] flex-col gap-5"
            >
              <div className="flex min-h-28 flex-col gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm leading-relaxed text-muted">{note}</p>
              </div>
              <div className="rounded-2xl bg-default/60 px-4 py-5">
                <Option rows={rows.slice(0, 5)} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
