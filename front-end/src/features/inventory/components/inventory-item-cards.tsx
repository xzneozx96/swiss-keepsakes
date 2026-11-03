import type { StockItem } from '@sk/api-contract'

import { Skeleton } from '@heroui/react'

import { Block } from '@/components/form-block'
import { EditIcon, OrdersIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { acceptedDate } from '../lib/reservations'

/** One label and its value, the label on the left. */
function Fact({ name, children }: { name: string, children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted">{name}</dt>
      <dd className="text-end text-sm tabular-nums">{children}</dd>
    </div>
  )
}

/** SKU code, In stock, Reserved by orders and Available ("0, sold out" in the danger colour); the menu holds Adjust stock. */
export function DetailsCard({ item, onAdjust }: { item: StockItem, onAdjust: () => void }) {
  const { t } = useLocale()

  return (
    <Block
      headingLevel={2}
      icon={OrdersIcon}
      title={t('inventory.item.details')}
      trailing={<RowActions actions={[{ id: 'adjust', label: t('inventory.item.adjust'), icon: EditIcon }]} label={t('inventory.item.actions')} onAction={onAdjust} />}
    >
      <dl className="flex flex-col gap-3">
        <Fact name={t('inventory.item.code')}>
          <span className="font-mono">{item.code}</span>
        </Fact>
        <Fact name={t('inventory.column.inStock')}>{item.onHand}</Fact>
        <Fact name={t('inventory.item.reservedByOrders')}>{item.reserved}</Fact>
        <Fact name={t('inventory.column.available')}>
          {item.available === 0
            ? <span className="font-semibold text-danger">{t('inventory.item.soldOutZero')}</span>
            : <span className="font-semibold">{item.available}</span>}
        </Fact>
      </dl>
    </Block>
  )
}

/** One row per open order that reserves units, then a Total row; with none, the text that says when units are reserved and released. */
export function ReservationsCard({ item }: { item: StockItem }) {
  const { t, intlLocale } = useLocale()

  return (
    <Block headingLevel={2} icon={OrdersIcon} title={t('inventory.item.reservedByOrders')}>
      {item.reservations.length === 0
        ? <p className="text-sm text-muted">{t('inventory.item.nothingReserved')}</p>
        : (
            <ul className="flex flex-col divide-y divide-separator">
              {item.reservations.map((reservation) => {
                const date = acceptedDate(reservation.acceptedAt, intlLocale)

                return (
                  <li key={reservation.orderId} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-mono text-sm font-medium">{reservation.orderRef ?? t('inventory.item.order')}</span>
                      <span className="truncate text-xs text-muted">
                        {reservation.guestName ? t('inventory.item.accepted', { guest: reservation.guestName, date }) : t('inventory.item.acceptedOnly', { date })}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">{t('inventory.reserved', { count: reservation.quantity })}</span>
                  </li>
                )
              })}
              <li className="flex justify-between pt-2.5 text-sm font-semibold">
                <span>{t('inventory.item.total')}</span>
                <span className="tabular-nums">{t('inventory.reserved', { count: item.reserved })}</span>
              </li>
            </ul>
          )}
    </Block>
  )
}

/** The loading page has the shape of the real one: the header, the Details card with four rows and the card of the reservations. */
export function ItemSkeleton() {
  const card = 'flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5'

  return (
    <div aria-busy="true" className="flex flex-col gap-5" data-testid="inventory-item-skeleton">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl max-lg:hidden" />
        <Skeleton className="h-7 w-64 max-w-full rounded-lg" />
      </div>
      <section aria-hidden className={card}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
        {[0, 1, 2, 3].map(row => (
          <div key={row} className="flex justify-between gap-4">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="h-4 w-12 rounded-lg" />
          </div>
        ))}
      </section>
      <section aria-hidden className={card}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-40 rounded-lg" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-3 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-16 rounded-lg" />
        </div>
      </section>
    </div>
  )
}
