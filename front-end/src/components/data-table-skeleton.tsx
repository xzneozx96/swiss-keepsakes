import { Skeleton } from '@heroui/react'

/** What a column's cells hold, so its loading bars take the same shape. */
export type SkeletonShape = 'line' | 'two-line' | 'lead' | 'chip' | 'action'

export const SKELETON_ROWS = 5

const lineWidths = ['w-3/4', 'w-2/3', 'w-4/5', 'w-3/5', 'w-2/3']

/** One loading cell, shaped like the real content of its column. */
export function SkeletonCell({
  shape = 'line',
  index,
}: {
  shape?: SkeletonShape
  /** Row position, to vary the bar widths like real data does. */
  index: number
}) {
  const width = lineWidths[index % lineWidths.length]

  switch (shape) {
    case 'lead':
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={`h-4 rounded-lg ${width}`} />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
        </div>
      )
    case 'two-line':
      return (
        <div className="flex flex-col gap-2">
          <Skeleton className={`h-4 rounded-lg ${width}`} />
          <Skeleton className="h-3 w-1/2 rounded-lg" />
        </div>
      )
    case 'chip':
      return <Skeleton className="h-6 w-20 rounded-full" />
    case 'action':
      return <Skeleton className="ms-auto size-8 rounded-full" />
    default:
      return <Skeleton className={`h-4 rounded-lg ${width}`} />
  }
}

/** Phones: loading tickets in the shape of the list cards, header, chips, dashed facts. */
export function TicketSkeletons({ count = 3 }: { count?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-5 lg:hidden">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
        >
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="h-3 w-2/5 rounded-lg" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-col gap-3 border-t border-dashed border-separator px-4 py-3.5">
            {[0, 1].map(row => (
              <div key={row} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-1/4 rounded-lg" />
                <Skeleton className="h-3.5 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
