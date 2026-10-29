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

/** The info note above the cart and the review cards. */
function NoteSkeleton() {
  return <Skeleton className="h-20 w-full rounded-2xl" data-skeleton="note" />
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

/** The sticky bottom bar of the cart and the review: total on the left, button on the right. */
function BottomBarSkeleton({ selectAll = false }: { selectAll?: boolean }) {
  return (
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-separator bg-background px-6 pt-3 pb-4" data-skeleton="bar">
      {selectAll && (
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-12 rounded-lg" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>
    </div>
  )
}

/** C04 Cart: bar, info note, then gift slips (checkbox, photo, name and shop, detail rows, price and quantity). */
export function CartSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="cart">
      <BarSkeleton title="w-16" />
      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        <NoteSkeleton />
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
      <BottomBarSkeleton selectAll />
    </div>
  )
}

/** C06 Review: bar, intro note, then order cards (title and three detail rows, gift lines, amount due and total). */
export function ReviewSkeleton({ orders = 2 }: { orders?: number }) {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="review">
      <BarSkeleton title="w-32" />
      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        <NoteSkeleton />
        <div className="flex flex-col gap-4 pt-1">
          {Array.from({ length: orders }, (_, i) => (
            <div key={i} className={`flex flex-col divide-y divide-separator ${CARD}`}>
              <div className="flex flex-col gap-3 p-5">
                <Skeleton className="h-6 w-2/3 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <IconLine width="w-1/2" />
                  <IconLine width="w-2/3" />
                  <IconLine width="w-3/5" />
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-4">
                <Skeleton className="size-16 shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-24 rounded-lg" />
                  <Skeleton className="h-7 w-28 rounded-lg" />
                </div>
                <div className="flex justify-between gap-3">
                  <Skeleton className="h-4 w-16 rounded-lg" />
                  <Skeleton className="h-4 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomBarSkeleton />
    </div>
  )
}

/** C07 Request sent: success mark, display title and sentence, the sent orders, the next-steps list, a full-width bottom button. */
export function RequestSentSkeleton() {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="sent">
      <div className="flex flex-1 flex-col gap-10 px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
        <div className="flex flex-col items-start gap-3">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
        </div>
        <section className="flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          <div className={`flex flex-col gap-3 p-5 ${CARD}`}>
            <Skeleton className="h-6 w-1/2 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
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
      <div className="sticky bottom-0 flex border-t border-separator bg-background px-6 pt-3 pb-4" data-skeleton="bar">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
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
            <Skeleton className="h-14 w-12 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
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
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-11 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="px-4 pt-5">
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
      </div>
    </div>
  )
}

/** C03 Gift detail: the 4:3.4 photo, then the rounded sheet that overlaps it, with title, price, highlight rows and accordion rows. */
export function GiftDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-1 flex-col" data-skeleton="gift">
      <Skeleton className="aspect-[4/3.4] w-full" />
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        <div className="flex flex-col gap-3 pb-5">
          <Skeleton className="h-8 w-4/5 rounded-lg" />
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
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
      </div>
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
        <div className="flex flex-col gap-4 pt-9">
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
