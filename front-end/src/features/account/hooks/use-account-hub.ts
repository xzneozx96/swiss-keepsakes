import { zurichDate } from '@sk/domain/catalog'

import { amountDueNow } from '@sk/domain/orders'
import { formatMoney, formatShortDate, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow, useDemoSelector } from '@/features/demo'
import { renderMail } from '@/features/notifications/components/render-mail'
import { useGuestOrders } from '@/features/orders/hooks/use-orders'
import { isClosedOrder } from '@/features/transactions/hooks/use-transaction-row'
import { useAccountPayments } from './use-account-payments'

const liveBooking = ['pending_payment', 'confirmed']

/**
 * One line under each hub row (1.12s), so the hub answers "anything for me?" before a tap:
 * the next pickup, the next tour, money due now, the latest email.
 */
export function useAccountHub(guestId: string) {
  const { t, language, intlLocale } = useLocale()
  const demoMail = useDemoSelector(s => s.data.mail)
  const pickupPlaces = useDemoSelector(s => s.data.pickupPlaces)
  const tours = useDemoSelector(s => s.data.tours)
  const now = useDemoNow()
  const today = zurichDate(now)
  const orders = useGuestOrders()
  const { due } = useAccountPayments()

  const next = orders
    .filter(o => !isClosedOrder(o))
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))[0]

  const bookings = (tours?.bookings ?? []).filter(b => b.guestId === guestId)
  const nextTour = bookings
    .filter(
      b => liveBooking.includes(b.status) && Date.parse(b.startsAt) > +now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]

  const dueTotal = due.reduce((sum, o) => sum + amountDueNow(o), 0)
  const lastMail = demoMail
    .filter(m => m.to === 'guest' && m.guestId === guestId)
    .pop()

  return {
    orderCount: orders.length,
    orders: next
      ? t('account.hub.orders.next', {
          date: formatShortDate(next.pickupDate, today, intlLocale),
          name: pickText(next.lines[0].productName, language).text,
        })
      : orders.length > 0
        ? t('account.hub.orders.noneOpen')
        : t('account.hub.orders.none'),
    bookingCount: bookings.length,
    bookings: nextTour
      ? t('account.hub.bookings.next', {
          date: formatShortDate(
            zurichDate(new Date(nextTour.startsAt)),
            today,
            intlLocale,
          ),
        })
      : bookings.length > 0
        ? t('account.hub.bookings.noneUpcoming')
        : t('account.hub.bookings.none'),
    dueCount: due.length,
    payments:
      due.length > 0
        ? t('account.hub.payments.due', {
            amount: formatMoney(dueTotal / 100, intlLocale),
          })
        : t('account.hub.payments.settled'),
    /** The latest email's subject, in that email's own language. */
    mail: lastMail
      ? {
          text: renderMail(lastMail, pickupPlaces).subject,
          lang: lastMail.language,
        }
      : { text: t('account.hub.mail.none') },
  }
}
