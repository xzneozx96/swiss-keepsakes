import { Skeleton } from '@heroui/react'

/** Rows shaped like a `PhotoOrder` row: the grip circle (`grip`, off for a list with no order), the 44 px picture and two text lines. */
export function LinkedRowsSkeleton({ count, grip = true }: { count: number, grip?: boolean }) {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex items-center gap-2 py-1.5">
          {grip && <Skeleton className="size-11 shrink-0 rounded-full lg:size-9" />}
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </span>
        </li>
      ))}
    </ul>
  )
}
