import type { StaffId } from '@sk/domain/orders'
import type { Partner } from '@sk/domain/partners'
import type { StatusTone } from '@/components/status-chip'
import type {
  CommissionItem,
  LedgerEntry,
} from '@/features/partners/lib/ledger'
import type { MessageKey } from '@/i18n/en'

import { zurichDate } from '@sk/domain/catalog'
import {
  formatOrderDate,
  formatOrderDateTime,
} from '@sk/domain/orders'
import { formatMoney } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { shop } from '@/features/catalog/seed'
import { useDemoNow, useDemoSelector } from '@/features/demo'
import { methodLabelKeys } from '@/features/merchant/record-payment/hooks/use-record-payment'
import { useOrders } from '@/features/orders/api/queries'
import { useCommissionAdjustments, usePartnerPayouts, usePartners, useReferralVisits } from '@/features/partners/api/queries'
import { partnerLedger, transactionKey } from '@/features/partners/lib/ledger'
import { linkOpens } from '@/features/partners/lib/link-opens'
import { useTourRecords } from '@/features/tours/api/queries'

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function staffName(who: StaffId) {
  return who === 'owner' ? shop.ownerName : 'Lukas'
}

/** The private report link (P01, step 5.6); hash routing, so it works on any deployment. */
export function reportUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/partner/${token}`
}

export interface LedgerRow {
  id: string
  type: LedgerEntry['type']
  text: string
  /** What is still to pay or offset right after this entry. */
  balance: string
  /** One fact per line (when, reference, who recorded it): never run together. */
  details: string[]
  tone: StatusTone
  href?: string
}

export interface TransactionRow {
  id: string
  ref: string
  href: string
  meta: string
  amount: string
  state: { text: string, tone: StatusTone }
}

/** The ledger holds orders only; tour bookings are dormant (ADR-012). */
function hrefOf(item: CommissionItem) {
  return `#/store/orders/${item.transaction.id}`
}

/**
 * M16 Partner detail (spec §5.2, steps 5.3–5.5): key facts, what to do next, the commission
 * ledger (recorded, refund adjustments, payouts, offsets; O08, AC13), the partner's
 * transactions with their commission state (D13), and the partner's links.
 */
export function usePartnerDetail(partnerId: string) {
  const { t, intlLocale } = useLocale()
  const partners = usePartners()
  const orders = useOrders()
  const tours = useTourRecords()
  const commissionAdjustments = useCommissionAdjustments()
  const partnerPayouts = usePartnerPayouts()
  const referralVisits = useReferralVisits()
  const ledgerData = {
    orders,
    tours,
    commissionAdjustments,
    partnerPayouts,
    referralVisits,
  }
  const guests = useGuests()
  const role = useDemoSelector(s => s.role)
  const now = useDemoNow()
  const partner: Partner | undefined = partners.find(p => p.id === partnerId)

  if (!partner)
    return undefined

  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const dateTime = (iso: string) => formatOrderDateTime(iso, intlLocale)
  const ledger = partnerLedger(ledgerData, partner.id, now)
  const opens30 = linkOpens(ledgerData).filter((o) => {
    const at = Date.parse(o.at)

    return (
      o.partnerId === partner.id
      && at <= now.getTime()
      && at >= now.getTime() - WINDOW_MS
    )
  }).length
  const guestName = (id: string) =>
    guests.find(g => g.id === id)?.name ?? ''

  const balance = (e: LedgerEntry) =>
    e.toOffset > 0
      ? t('partnerDetail.ledger.balanceOffset', { amount: money(e.toOffset) })
      : t('partnerDetail.ledger.balancePay', { amount: money(e.toPay) })

  const ledgerRows: LedgerRow[] = ledger.entries
    // eslint-disable-next-line array-callback-return -- the switch covers every entry type, and TypeScript checks that each case returns
    .map((e, index): LedgerRow => {
      const id = `${e.type}-${index}`

      switch (e.type) {
        case 'recorded':
          return {
            id,
            type: e.type,
            text: t('partnerDetail.ledger.recorded', {
              amount: money(e.amount),
              ref: e.item.ref,
            }),
            balance: balance(e),
            details: [dateTime(e.at)],
            tone: 'success',
            href: hrefOf(e.item),
          }
        case 'adjustment': {
          const item = ledger.items.find(
            i =>
              transactionKey(i.transaction)
              === transactionKey(e.adjustment.transaction),
          )

          return {
            id,
            type: e.type,
            text: t('partnerDetail.ledger.adjustment', {
              amount: money(e.adjustment.commission),
              refunded: money(e.adjustment.refunded),
              ref: item?.ref ?? '',
            }),
            balance: balance(e),
            details: [
              t('partnerDetail.ledger.recordedBy', {
                name: staffName(e.adjustment.recordedBy),
                at: dateTime(e.at),
              }),
            ],
            tone: 'warning',
            href: item ? hrefOf(item) : undefined,
          }
        }
        case 'payout':
          return {
            id,
            type: e.type,
            text: t('partnerDetail.ledger.payout', {
              amount: money(e.payout.amount),
              method: t(
                methodLabelKeys[
                  e.payout.method === 'online' ? 'other' : e.payout.method
                ],
              ),
            }),
            balance: balance(e),
            details: [
              t('partnerDetail.ledger.paidOn', {
                date: formatOrderDate(e.payout.paidOn, intlLocale),
              }),
              ...(e.payout.reference
                ? [
                    t('partnerDetail.ledger.reference', {
                      reference: e.payout.reference,
                    }),
                  ]
                : []),
              t('partnerDetail.ledger.recordedBy', {
                name: staffName(e.payout.recordedBy),
                at: dateTime(e.payout.recordedAt),
              }),
            ],
            tone: 'info',
          }
        case 'offset':
          return {
            id,
            type: e.type,
            text: t('partnerDetail.ledger.offset', {
              amount: money(e.amount),
              ref: e.item.ref,
            }),
            balance: balance(e),
            details: [dateTime(e.at)],
            tone: 'neutral',
            href: hrefOf(e.item),
          }
      }
    })
    .reverse()

  const stateOf = (item: CommissionItem): TransactionRow['state'] => {
    const label = (key: MessageKey, tone: StatusTone) => ({
      text: t(key),
      tone,
    })

    if (item.state === 'estimated')
      return label('order.commission.estimated', 'neutral')
    if (item.state === 'not-applicable')
      return label('order.commission.notApplicable', 'neutral')
    if (item.state === 'adjusted' && item.amount - item.adjusted <= 0)
      return label('partnerDetail.state.adjusted', 'warning')
    const net = item.amount - item.adjusted
    const settled = ledger.settled.get(transactionKey(item.transaction)) ?? 0

    if (settled >= net)
      return label('partnerDetail.state.paid', 'success')
    if (settled > 0)
      return label('partnerDetail.state.partlyPaid', 'warning')

    return label('order.commission.recorded', 'info')
  }

  const transactions: TransactionRow[] = ledger.items
    .filter(i => Date.parse(i.createdAt) <= now.getTime())
    .reverse()
    .map(item => ({
      id: transactionKey(item.transaction),
      ref: item.ref,
      href: hrefOf(item),
      meta: [
        guestName(item.guestId),
        formatOrderDate(zurichDate(new Date(item.createdAt)), intlLocale),
      ]
        .filter(Boolean)
        .join(' · '),
      amount:
        item.state === 'not-applicable'
          ? '–'
          : money(Math.max(0, item.amount - item.adjusted)),
      state: stateOf(item),
    }))

  const next
    = ledger.toPay > 0
      ? ({ kind: 'pay', amount: money(ledger.toPay) } as const)
      : ledger.toOffset > 0
        ? ({ kind: 'offset', amount: money(ledger.toOffset) } as const)
        : ({ kind: 'settled' } as const)

  return {
    partner,
    kind: t(`merchantPartners.kind.${partner.kind}`),
    isOwner: role === 'owner',
    canPay: role === 'owner' || role === 'manager',
    facts: {
      toPay: money(ledger.toPay),
      toOffset: ledger.toOffset > 0 ? money(ledger.toOffset) : null,
      earned: money(ledger.earned),
      estimated: money(ledger.estimated),
      paid: money(ledger.paid),
      payouts: partnerPayouts.filter(
        p => p.partnerId === partner.id,
      ).length,
      opens30,
    },
    toPayRappen: ledger.toPay,
    next,
    ledger: ledgerRows,
    transactions,
    reportLink: partner.reportToken ? reportUrl(partner.reportToken) : null,
  }
}

export type PartnerDetailView = NonNullable<
  ReturnType<typeof usePartnerDetail>
>
