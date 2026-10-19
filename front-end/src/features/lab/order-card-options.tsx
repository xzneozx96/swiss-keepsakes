import type { ShownLabel } from '@/features/orders/hooks/use-orders'

import { ChevronRightIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { StatusChip } from '@/components/status-chip'

/** Lab only: one gift order in M03, with what a thumbnail layout needs. */
export interface LabOrderRow {
  id: string
  href: string
  reference: string
  guestName: string
  initial: string
  /** One entry per order line. */
  gifts: { name: string, meta: string, quantity: number, photo?: string }[]
  /** "1 × Limited-edition print", "+1 more" for more lines. */
  giftsSummary: string
  total: string
  progress: ShownLabel
  payment: ShownLabel
  paymentDetails: {
    status: string
    facts: { label: string, value: string }[]
  }
  /** "Fri 16 Oct", "Today", "Tomorrow". */
  pickupDate: string
  /** Calendar tile parts. */
  pickupDay: { weekday: string, day: string, month: string }
  pickupPlace: string
}

export interface OrderCardOptionProps {
  rows: LabOrderRow[]
}

const card
  = 'flex flex-col rounded-3xl bg-surface shadow-surface outline-none hover:bg-surface-secondary focus-visible:focus-ring'

/** Long payment labels ("Deposit paid · CHF 26.70 · …") wrap inside the chip. */
const wrapChips
  = '[&>*]:h-auto [&>*]:min-h-7 [&>*]:max-w-full [&>*]:py-1 [&>*]:whitespace-normal'

const countLabel = (n: number) => (n === 1 ? '1 order' : `${n} orders`)

/** Consecutive rows with the same key, in order (rows come sorted by pickup date). */
function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<{ key: string, items: T[] }[]>((groups, item) => {
    const last = groups.at(-1)

    if (last?.key === key(item))
      last.items.push(item)
    else groups.push({ key: key(item), items: [item] })

    return groups
  }, [])
}

/** Product photo with a quantity badge; a second photo peeks behind for multi-gift orders. */
function Thumb({
  row,
  size = 'size-[72px]',
}: {
  row: LabOrderRow
  size?: string
}) {
  const [first, second] = row.gifts
  const count = row.gifts.reduce((sum, g) => sum + g.quantity, 0)

  return (
    <span aria-hidden className={`relative shrink-0 ${size}`}>
      {/* Media sets `relative`, so the layers are positioned by wrappers. */}
      {second && (
        <span className="absolute inset-0 translate-x-1.5 -translate-y-1.5 opacity-60">
          <Media alt="" className="size-full rounded-xl" photo={second.photo} />
        </span>
      )}
      <span className="absolute inset-0">
        <Media
          alt=""
          className="size-full rounded-xl ring-2 ring-surface"
          photo={first?.photo}
        />
      </span>
      {count > 1 && (
        <span className="absolute -end-1.5 -bottom-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background tabular-nums">
          {count}
        </span>
      )}
    </span>
  )
}

function Chips({ row }: { row: LabOrderRow }) {
  return (
    <div className={`flex min-w-0 flex-wrap gap-2 ${wrapChips}`}>
      <StatusChip tone={row.progress.tone}>{row.progress.text}</StatusChip>
      <StatusChip tone={row.payment.tone}>{row.payment.text}</StatusChip>
    </div>
  )
}

/** Each gift on its own line: 64px photo, name, option and quantity (A's middle). */
function GiftRows({ row }: { row: LabOrderRow }) {
  return row.gifts.map(gift => (
    <div key={gift.name} className="flex items-center gap-3">
      <Media
        alt=""
        className="size-16 shrink-0 rounded-xl"
        photo={gift.photo}
      />
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">{gift.name}</span>
        <span className="text-sm text-muted">
          {[gift.meta, `Qty ${gift.quantity}`].filter(Boolean).join(' · ')}
        </span>
      </div>
    </div>
  ))
}

/** A's footer: guest, reference, total. */
function GuestFooter({ row }: { row: LabOrderRow }) {
  return (
    <div className="flex items-baseline gap-2 border-t border-separator px-4 py-3">
      <span className="font-semibold">{row.guestName}</span>
      <span className="text-label text-muted">{row.reference}</span>
      <span className="ms-auto font-semibold tabular-nums">{row.total}</span>
    </div>
  )
}

function DayHeading({ date, count }: { date: string, count: number }) {
  return (
    <h3 className="flex items-baseline gap-2">
      <span className="text-heading">{date}</span>
      <span className="text-sm text-muted">{countLabel(count)}</span>
    </h3>
  )
}

const chevron = (
  <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
)

/** A's card with any header: header, gift rows and labels, guest footer. */
function SectionedCard({
  row,
  header,
}: {
  row: LabOrderRow
  header: React.ReactNode
}) {
  return (
    <a className={card} href={row.href}>
      <div className="flex items-center gap-2 border-b border-separator px-4 py-3">
        {header}
        {chevron}
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <GiftRows row={row} />
        <Chips row={row} />
      </div>
      <GuestFooter row={row} />
    </a>
  )
}

/* ------------------------------------------------------------------ Round 1 picks */

/**
 * A · Sectioned card (Etsy Sell orders): pickup on top as the header, the gift with its
 * photo in the middle, guest, reference and total in the footer. Dividers between.
 */
export function OrderSectionedCard({ rows }: OrderCardOptionProps) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(row => (
        <li key={row.id}>
          <SectionedCard
            header={(
              <>
                <PickupIcon aria-hidden className="shrink-0" size={18} />
                <span className="flex-1 text-sm">
                  <span className="font-semibold">{row.pickupDate}</span>
                  <span className="text-muted"> · {row.pickupPlace}</span>
                </span>
              </>
            )}
            row={row}
          />
        </li>
      ))}
    </ul>
  )
}

/**
 * D · Grouped by pickup day (Airbnb host "Upcoming"): the date moves out of the card
 * into a day heading; each card keeps photo, guest, gift, place and the labels.
 */
export function OrderDayGroups({ rows }: OrderCardOptionProps) {
  return (
    <div className="flex flex-col gap-6">
      {groupBy(rows, r => r.pickupDate).map(day => (
        <section key={day.key} className="flex flex-col gap-3">
          <h3 className="text-heading">{day.key}</h3>
          <ul className="flex flex-col gap-3">
            {day.items.map(row => (
              <li key={row.id}>
                <a className={`${card} gap-3 p-4`} href={row.href}>
                  <div className="flex items-center gap-3">
                    <Thumb row={row} size="size-14" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{row.guestName}</span>
                      <span className="truncate text-sm text-muted">
                        {row.giftsSummary}
                      </span>
                    </div>
                    {chevron}
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <PickupIcon aria-hidden className="shrink-0" size={16} />
                    {row.pickupPlace}
                    {' '}
                    ·
                    {' '}
                    <span className="whitespace-nowrap">{row.reference}</span>
                  </span>
                  <Chips row={row} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------- Round 2 */

/**
 * F · Day heading + sectioned card (D around A): the date is the heading with an order
 * count; the card header keeps only the place, the rest is A.
 */
export function OrderDaySectioned({ rows }: OrderCardOptionProps) {
  return (
    <div className="flex flex-col gap-6">
      {groupBy(rows, r => r.pickupDate).map(day => (
        <section key={day.key} className="flex flex-col gap-3">
          <DayHeading count={day.items.length} date={day.key} />
          <ul className="flex flex-col gap-3">
            {day.items.map(row => (
              <li key={row.id}>
                <SectionedCard
                  header={(
                    <>
                      <PickupIcon aria-hidden className="shrink-0" size={18} />
                      <span className="flex-1 text-sm font-semibold">
                        {row.pickupPlace}
                      </span>
                    </>
                  )}
                  row={row}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * G · One panel per day (Airbnb host Today, iOS grouped list): a day heading, then one
 * white panel with the day's orders as rows split by lines. Least repetition.
 */
export function OrderDayPanel({ rows }: OrderCardOptionProps) {
  return (
    <div className="flex flex-col gap-6">
      {groupBy(rows, r => r.pickupDate).map(day => (
        <section key={day.key} className="flex flex-col gap-3">
          <DayHeading count={day.items.length} date={day.key} />
          <ul className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 shadow-surface">
            {day.items.map(row => (
              <li key={row.id}>
                <a
                  className="flex gap-3 py-4 outline-none focus-visible:focus-ring"
                  href={row.href}
                >
                  <Thumb row={row} size="size-16" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 truncate font-semibold">
                        {row.guestName}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {row.total}
                      </span>
                    </div>
                    <span className="text-sm text-muted">
                      {row.giftsSummary}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted">
                      <PickupIcon aria-hidden className="shrink-0" size={16} />
                      {row.pickupPlace}
                      {' '}
                      ·
                      {' '}
                      <span className="whitespace-nowrap">{row.reference}</span>
                    </span>
                    <div className="pt-1">
                      <Chips row={row} />
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * H · Day, then place (pickup run sheet): under each day a small place heading, so staff
 * see what goes to the shop and what goes to the pickup point. Cards as in D.
 */
export function OrderDayPlace({ rows }: OrderCardOptionProps) {
  return (
    <div className="flex flex-col gap-6">
      {groupBy(rows, r => r.pickupDate).map(day => (
        <section key={day.key} className="flex flex-col gap-3">
          <DayHeading count={day.items.length} date={day.key} />
          {groupBy(day.items, r => r.pickupPlace).map(place => (
            <div key={place.key} className="flex flex-col gap-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-muted">
                <PickupIcon aria-hidden className="shrink-0" size={16} />
                {place.key}
              </h4>
              <ul className="flex flex-col gap-3">
                {place.items.map(row => (
                  <li key={row.id}>
                    <a className={`${card} gap-3 p-4`} href={row.href}>
                      <div className="flex items-center gap-3">
                        <Thumb row={row} size="size-16" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="flex-1 truncate font-semibold">
                              {row.guestName}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {row.total}
                            </span>
                          </div>
                          <span className="text-sm text-muted">
                            {row.giftsSummary}
                          </span>
                          <span className="text-label text-muted">
                            {row.reference}
                          </span>
                        </div>
                      </div>
                      <Chips row={row} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * I · Guest header card (A turned round, Shopify order card): guest and reference as the
 * header, gifts and labels in the middle, pickup and total in the footer.
 */
export function OrderGuestHeader({ rows }: OrderCardOptionProps) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(row => (
        <li key={row.id}>
          <a className={card} href={row.href}>
            <div className="flex items-center gap-3 border-b border-separator px-4 py-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary font-semibold"
              >
                {row.initial}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{row.guestName}</span>
                <span className="text-label text-muted">{row.reference}</span>
              </span>
              {chevron}
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <GiftRows row={row} />
              <Chips row={row} />
            </div>
            <div className="flex items-center gap-2 border-t border-separator px-4 py-3">
              <PickupIcon aria-hidden className="shrink-0" size={18} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{row.pickupDate}</span>
                <span className="text-muted"> · {row.pickupPlace}</span>
              </span>
              <span className="font-semibold tabular-nums">{row.total}</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * J · Day timeline (Airbnb Trips itinerary): a date tile per day on a thin line down
 * the left, the day's A cards beside it (header shows the place only).
 */
export function OrderTimeline({ rows }: OrderCardOptionProps) {
  return (
    <ol className="flex flex-col">
      {groupBy(rows, r => r.pickupDate).map((day, i, days) => {
        const { weekday, day: date, month } = day.items[0].pickupDay

        return (
          <li key={day.key} className="flex gap-3">
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span className="flex w-12 flex-col items-center rounded-2xl bg-surface py-1.5 shadow-surface">
                <span className="text-[11px] text-muted uppercase">
                  {weekday}
                </span>
                <span className="text-lg leading-tight font-semibold tabular-nums">
                  {date}
                </span>
                <span className="text-[11px] text-muted">{month}</span>
              </span>
              {i < days.length - 1 && (
                <span aria-hidden className="w-px flex-1 bg-separator" />
              )}
            </div>
            <ul
              aria-label={`${day.key}, ${countLabel(day.items.length)}`}
              className="flex min-w-0 flex-1 flex-col gap-3 pb-6"
            >
              {day.items.map(row => (
                <li key={row.id}>
                  <SectionedCard
                    header={(
                      <span className="flex-1 text-sm font-semibold">
                        {row.pickupPlace}
                      </span>
                    )}
                    row={row}
                  />
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}
