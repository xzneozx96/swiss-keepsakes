import type { ReactNode } from 'react'

import { Skeleton } from '@heroui/react'

/** Loading shapes for the guest screens. Each copies the container classes of the real screen it stands in for, so nothing jumps when the data arrives. */

const CARD = 'rounded-3xl bg-surface shadow-surface'

/** The sticky top bar of the cart, review and order screens: back button, then the title. */
function BarSkeleton({ title = 'w-24' }: { title?: string }) {
  return (
    <div className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <Skeleton className={`h-6 rounded-lg ${title}`} />
    </div>
  )
}

/** The info note above the cart and the review cards: a tinted alert with an icon and its text lines. */
function NoteSkeleton({ lines = 1, title = false }: { lines?: number, title?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4" data-skeleton="note">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        {title && <Skeleton className="h-4 w-1/3 rounded-lg" />}
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-4 rounded-lg ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

/** An icon plus one line, as the detail rows of a cart line and an order card. */
function IconLine({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className={`h-4 rounded-lg ${width}`} />
    </div>
  )
}

const BAR_PAD = 'px-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]'

/** The sticky bottom bar every guest flow screen ends with; its content is the screen's own. */
function BarFrame({ className, children }: { className: string, children: ReactNode }) {
  return (
    <div className={`sticky bottom-0 border-t border-separator bg-background ${BAR_PAD} ${className}`} data-skeleton="bar">
      {children}
    </div>
  )
}

/** A total with its small label, as the underlined total button of the cart and the review. */
function TotalSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3 w-12 rounded-lg" />
      <Skeleton className="h-6 w-24 rounded-lg" />
    </div>
  )
}

/** C04's bar: select all with the count, then the total and the Continue button. */
function CartBarSkeleton() {
  return (
    <BarFrame className="flex flex-col gap-2 pt-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-24 rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <TotalSkeleton />
        </div>
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>
    </BarFrame>
  )
}

/** C06's bar: the total with its chip, then the full-width send button. */
function ReviewBarSkeleton() {
  return (
    <BarFrame className="flex flex-col gap-3 pt-3">
      <div className="flex items-center justify-between gap-3">
        <TotalSkeleton />
        <Skeleton className="h-5 w-32 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </BarFrame>
  )
}

/** One order card, as `OrderCard` lays it out. C07 (`sent`) adds reference and chips under the title, and the link row at the end. */
function OrderCardSkeleton({ sent = false }: { sent?: boolean }) {
  return (
    <section className={`flex flex-col divide-y divide-separator ${CARD}`} data-skeleton="order-card">
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-2/3 rounded-lg" />
        {sent && (
          <div className="flex flex-col items-start gap-2">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <IconLine width="w-1/2" />
          <IconLine width="w-2/3" />
          <IconLine width="w-3/5" />
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        <li className="flex items-start gap-3 py-4">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
        </li>
      </ul>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="flex justify-between gap-3">
          <Skeleton className="h-4 w-16 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-4/5 rounded-lg" data-skeleton="rule" />
      </div>
      <div className="px-5 py-2" data-skeleton="cancellation">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Skeleton className="h-4 w-40 rounded-lg" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
      </div>
      {sent && (
        <div className="flex min-h-12 items-center justify-between gap-3 px-5" data-skeleton="order-link">
          <Skeleton className="h-4 w-36 rounded-lg" />
          <Skeleton className="size-[18px] shrink-0 rounded-full" />
        </div>
      )}
    </section>
  )
}

/** C04 Cart: bar, info note, then gift slips (checkbox, photo, name and shop, detail rows, price and quantity). */
export function CartSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="cart">
      <BarSkeleton title="w-16" />
      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        <NoteSkeleton lines={1} title />
        <ul className="flex flex-col gap-3">
          {Array.from({ length: lines }, (_, i) => (
            <li key={i} className={`flex flex-col gap-4 p-4 ${CARD}`}>
              <div className="flex items-start gap-3">
                <Skeleton className="size-6 shrink-0 self-center rounded-lg" />
                <Skeleton className="size-[72px] shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <IconLine width="w-1/3" />
                <IconLine width="w-2/3" />
                <IconLine width="w-1/2" />
                <IconLine width="w-3/5" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-separator pt-3">
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <CartBarSkeleton />
    </div>
  )
}

/** C06 Review: bar, intro note, then the order cards, and a two-row bottom bar. */
export function ReviewSkeleton({ orders = 2 }: { orders?: number }) {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="review">
      <BarSkeleton title="w-32" />
      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        <NoteSkeleton />
        <div className="flex flex-col gap-4 pt-1">
          {Array.from({ length: orders }, (_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <ReviewBarSkeleton />
    </div>
  )
}

/** C07 Request sent: success mark, title and sentence, one full order card per order sent and the link to the account, the next-steps list, and a full-width bottom button. */
export function RequestSentSkeleton({ orders = 1 }: { orders?: number }) {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="sent">
      <div className="flex flex-1 flex-col gap-10 px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
        <div className="flex flex-col items-start gap-3">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
        <section className="flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          {Array.from({ length: orders }, (_, i) => (
            <OrderCardSkeleton key={i} sent />
          ))}
          <Skeleton className="h-4 w-40 rounded-lg" data-skeleton="transactions-link" />
        </section>
        <section className="flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          <ul className={`flex flex-col gap-4 p-5 ${CARD}`}>
            {[0, 1, 2].map(i => (
              <li key={i} className="flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <BarFrame className="flex pt-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </BarFrame>
    </div>
  )
}

/** C14 My orders: "Coming up" heading, pickup tickets (date tile, title and place, photo, chips, dashed footer), then the Past box. */
export function OrderListSkeleton({ tickets = 2, past = 2 }: { tickets?: number, past?: number }) {
  return (
    <div aria-busy className="flex flex-col gap-8" data-skeleton="orders">
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <ul className="flex flex-col gap-3">
          {Array.from({ length: tickets }, (_, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-surface">
              <div className="flex items-center gap-4 p-4">
                <Skeleton className="h-14 w-12 shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
                <Skeleton className="size-14 shrink-0 rounded-xl" />
              </div>
              <div className="flex flex-col gap-3 border-t border-dashed border-separator p-4">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-16 rounded-lg" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface px-4 shadow-surface">
          {Array.from({ length: past }, (_, i) => (
            <li key={i} className="flex gap-3 py-4">
              <Skeleton className="size-14 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-2/3 rounded-lg" />
                  <Skeleton className="h-5 w-14 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-1/3 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** C15 Order detail: bar, the ticket card (tile, gift, photo, chips, dashed rows), the tab strip and a first panel card. */
export function OrderDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col pb-12" data-skeleton="order">
      <BarSkeleton title="w-40" />
      <div className="flex flex-col gap-3 px-4 pt-2">
        <div className={`overflow-hidden ${CARD}`}>
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-16 w-14 shrink-0 rounded-xl" data-skeleton="date-tile" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-3 w-1/3 rounded-lg" />
            </div>
            <Skeleton className="size-14 shrink-0 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex flex-col gap-3 border-t border-dashed border-separator p-4">
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2 px-4" data-skeleton="tabs">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-11 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="px-4 pt-5">
        <section className="flex flex-col gap-3" data-skeleton="panel">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <div className={`flex flex-col divide-y divide-separator ${CARD}`}>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-16 rounded-lg" />
                  <Skeleton className="h-5 w-2/3 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/** C03 Gift detail: the 4:3.4 photo, the overlapping sheet (centred title, stats grid, seller row, highlights, about, two accordion rows), and the sticky price bar. */
export function GiftDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="gift">
      <Skeleton className="aspect-[4/3.4] w-full" />
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        <div className="flex flex-col items-center gap-2 pb-6">
          <Skeleton className="h-8 w-4/5 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
        <div className="grid grid-cols-[1fr_1.5fr_1fr] items-center border-y border-separator py-4" data-skeleton="stats">
          <div className="flex flex-col items-center gap-1 px-1">
            <Skeleton className="h-5 w-16 rounded-lg" />
            <Skeleton className="h-3 w-12 rounded-lg" />
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-separator px-1">
            <Skeleton className="h-10 w-14 rounded-lg" data-skeleton="rating" />
            <Skeleton className="h-3.5 w-20 rounded-lg" />
          </div>
          <div className="flex flex-col items-center gap-1 px-1">
            <Skeleton className="h-6 w-8 rounded-lg" />
            <Skeleton className="h-3 w-12 rounded-lg" />
          </div>
        </div>
        <section className="flex items-center gap-3 py-5" data-skeleton="seller">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2 rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        </section>
        <ul className="flex flex-col gap-5 border-t border-separator py-7">
          {[0, 1, 2].map(i => (
            <li key={i} className="flex gap-4">
              <Skeleton className="size-[26px] shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-5 w-1/2 rounded-lg" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 border-t border-separator py-7">
          <Skeleton className="h-7 w-1/2 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="border-t border-separator">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center justify-between gap-3 py-5">
              <Skeleton className="h-6 w-1/2 rounded-lg" />
              <Skeleton className="size-4 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <BarFrame className="flex items-center gap-3 pt-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-3 w-36 rounded-lg" />
          <Skeleton className="mt-0 h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-12 w-28 rounded-xl" />
      </BarFrame>
    </div>
  )
}

/** C20 Article: the tall cover with its title and excerpt at the foot, then the sheet with the author row, meta, lead and a section. */
export function ArticleSkeleton() {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="article">
      <div className="relative h-[min(68dvh,540px)]">
        <Skeleton className="size-full" />
        <div className="absolute inset-x-6 bottom-12 flex flex-col gap-2">
          <Skeleton className="h-10 w-4/5 rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
        </div>
        <Skeleton className="mt-3 h-4 w-40 rounded-lg" />
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4 rounded-lg" />
        </div>
        <div className="mt-6 flex flex-col">
          <nav className="-mx-6 border-b border-separator/70 bg-background" data-skeleton="contents">
            <div className="flex gap-2 overflow-hidden px-6 py-2.5">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="h-0.5 bg-separator/60" />
          </nav>
          <div className="flex flex-col gap-4 pt-9">
            <Skeleton className="h-8 w-1/2 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
          </div>
        </div>
      </div>
      <BarFrame className="pt-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </BarFrame>
    </div>
  )
}
