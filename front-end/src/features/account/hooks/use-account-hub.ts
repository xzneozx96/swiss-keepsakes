import { zurichDate } from '@sk/domain/catalog'

import { amountDueNow } from '@sk/domain/orders'
import { formatMoney, formatShortDate, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces } from '@/features/catalog/api/queries'
import { useDemoNow } from '@/features/demo'
import { useMail } from '@/features/notifications/api/queries'
import { renderMail } from '@/features/notifications/components/render-mail'
import { useGuestOrders } from '@/features/orders/hooks/use-orders'
import { isClosedOrder } from '@/features/transactions/hooks/use-transaction-row'
import { useAccountPayments } from './use-account-payments'

/**
 * One line under each hub row (1.12s), so the hub answers "anything for me?" before a tap:
 * the next pickup, the next tour, money due now, the latest email.
 */
export function useAccountHub(guestId: string) {
  const { t, language, intlLocale } = useLocale()
  const demoMail = useMail()
  const pickupPlaces = usePickupPlaces()
  const now = useDemoNow()
  const today = zurichDate(now)
  const orders = useGuestOrders()
  const { due } = useAccountPayments()

  const next = orders
    .filter(o => !isClosedOrder(o))
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))[0]

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
